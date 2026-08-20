import { randomUUID } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import WebSocket from "ws";
import { defaultDoubaoEndpoint } from "./doubao-config.js";

function buildHeader(messageType, flags = 0, serialization = 0, compression = 0) {
  return Buffer.from([0x11, (messageType << 4) | flags, (serialization << 4) | compression, 0]);
}

function buildPacket(header, payload) {
  const size = Buffer.alloc(4);
  size.writeUInt32BE(payload.length);
  return Buffer.concat([header, size, payload]);
}

function extractPayload(buffer) {
  const flags = buffer[1] & 0x0f;
  const compression = buffer[2] & 0x0f;
  let offset = 4;
  if (flags & 0x01) offset += 4;
  if (buffer.length < offset + 4) return null;
  const size = buffer.readUInt32BE(offset);
  offset += 4;
  if (buffer.length < offset + size) return null;
  const raw = buffer.subarray(offset, offset + size);
  return compression === 1 ? gunzipSync(raw) : raw;
}

export function createDoubaoRequest(config, connectId = randomUUID()) {
  const hotwords = Array.isArray(config.doubaoHotwords)
    ? [...new Set(config.doubaoHotwords.map((word) => String(word || "").trim()).filter(Boolean))].slice(0, 5000)
    : [];
  const request = {
    model_name: "bigmodel",
    enable_itn: true,
    enable_punc: true,
    enable_ddc: false,
    show_utterances: true,
    // 保留首段流式结果，同时在结束帧后让豆包返回更准确的二遍最终结果。
    enable_nonstream: true,
    result_type: "full"
  };
  if (hotwords.length) request.corpus = {
    context: JSON.stringify({ hotwords: hotwords.map((word) => ({ word })) })
  };
  const configPayload = Buffer.from(JSON.stringify({
    user: { uid: "interview-notes-companion" },
    audio: { format: "pcm", codec: "raw", rate: 16000, bits: 16, channel: 1 },
    request
  }));
  return {
    url: config.doubaoEndpoint || defaultDoubaoEndpoint,
    headers: {
      "X-Api-App-Key": config.doubaoAppId,
      "X-Api-Access-Key": config.doubaoAccessToken,
      "X-Api-Resource-Id": config.doubaoResourceId,
      "X-Api-Connect-Id": connectId
    },
    firstFrame: buildPacket(buildHeader(0x1, 0, 1, 1), gzipSync(configPayload))
  };
}

export function encodeDoubaoAudioFrame(audio, isLast = false) {
  return buildPacket(buildHeader(0x2, isLast ? 0x2 : 0, 0, 1), gzipSync(Buffer.from(audio)));
}

export function decodeDoubaoResponse(raw) {
  const buffer = Buffer.from(raw);
  if (buffer.length < 4 || (buffer[1] >> 4) !== 0x9) return [];
  const payload = extractPayload(buffer);
  if (!payload) return [];
  const data = JSON.parse(payload.toString("utf8"));
  const utterances = data.result?.utterances;
  const latestUtterance = Array.isArray(utterances) ? utterances.at(-1) : null;
  // result.text 是本次识别的完整文本；只取最后一个 utterance 会丢掉问题前半句。
  const sentence = (data.result?.text || latestUtterance?.text)?.trim();
  if (!sentence) return [];
  return [{ type: "result", isCumulative: Boolean(data.result?.text), sentence: { sentence, sentence_type: (buffer[1] & 0x02) ? 1 : 0, speaker_id: -1 } }];
}

function readError(raw) {
  const buffer = Buffer.from(raw);
  const code = buffer.length >= 8 ? buffer.readUInt32BE(4) : undefined;
  const textLength = buffer.length >= 12 ? buffer.readUInt32BE(8) : 0;
  const message = textLength ? buffer.subarray(12, 12 + textLength).toString("utf8") : "豆包语音识别服务返回错误";
  return { code, message };
}

export class DoubaoAsrSession {
  constructor(config, onEvent, WebSocketImpl = WebSocket) {
    this.config = config;
    this.onEvent = onEvent;
    this.WebSocketImpl = WebSocketImpl;
    this.socket = null;
    this.ready = false;
    this.stopped = false;
    // 点击“识别问题”后，麦克风会先开始采集；WebSocket 建连通常还需要几十到几百毫秒。
    // 不能在这段时间静默丢掉问题开头，否则只会识别到后半句。
    this.pendingAudio = [];
    this.pendingAudioBytes = 0;
    this.maxPendingAudioBytes = 16000 * 2 * 8;
    // 长问题结束后，云端仍会补发完整的最终转写；必须覆盖页面的最终结果等待窗口。
    this.closeDelayMs = 3000;
  }

  start() {
    const request = createDoubaoRequest(this.config);
    this.socket = new this.WebSocketImpl(request.url, { headers: request.headers });
    this.socket.on("open", () => {
      this.socket.send(request.firstFrame);
      this.ready = true;
      this.flushPendingAudio();
      this.onEvent({ type: "ready" });
    });
    this.socket.on("message", (raw) => this.handleMessage(raw));
    this.socket.on("error", () => this.onEvent({ type: "error", message: "豆包语音连接失败" }));
    this.socket.on("close", () => { if (!this.stopped) this.onEvent({ type: "closed" }); });
  }

  handleMessage(raw) {
    const buffer = Buffer.from(raw);
    if ((buffer[1] >> 4) === 0x0f) return this.onEvent({ type: "error", ...readError(buffer) });
    try { decodeDoubaoResponse(buffer).forEach((event) => this.onEvent(event)); }
    catch { this.onEvent({ type: "error", message: "无法解析豆包识别结果" }); }
  }

  sendAudio(chunk) {
    const audio = Buffer.from(chunk);
    if (!audio.length || this.stopped) return;
    if (this.ready && this.socket?.readyState === this.WebSocketImpl.OPEN) {
      this.socket.send(encodeDoubaoAudioFrame(audio));
      return;
    }
    this.pendingAudio.push(audio);
    this.pendingAudioBytes += audio.length;
    while (this.pendingAudioBytes > this.maxPendingAudioBytes && this.pendingAudio.length) {
      this.pendingAudioBytes -= this.pendingAudio.shift().length;
    }
  }

  flushPendingAudio() {
    if (!this.ready || this.socket?.readyState !== this.WebSocketImpl.OPEN) return;
    this.pendingAudio.forEach((audio) => this.socket.send(encodeDoubaoAudioFrame(audio)));
    this.pendingAudio = [];
    this.pendingAudioBytes = 0;
  }

  stop() {
    this.stopped = true;
    this.pendingAudio = [];
    this.pendingAudioBytes = 0;
    if (this.ready && this.socket?.readyState === this.WebSocketImpl.OPEN) this.socket.send(encodeDoubaoAudioFrame(Buffer.alloc(0), true));
    setTimeout(() => this.socket?.close(), this.closeDelayMs);
  }
}
