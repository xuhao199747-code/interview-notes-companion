import { createHmac, randomUUID } from "node:crypto";

export function createTencentAsrUrl(config, now = Math.floor(Date.now() / 1000), nonce = Math.floor(Math.random() * 1_000_000_000), voiceId = randomUUID()) {
  const query = {
    enable_speaker_context: "1",
    engine_model_type: "16k_zh_en_speaker_2.0",
    expired: String(now + 3600),
    needvad: "1",
    nonce: String(nonce),
    secretid: config.tencentSecretId,
    timestamp: String(now),
    voice_format: "1",
    voice_id: voiceId
  };
  const sorted = Object.entries(query).sort(([left], [right]) => left.localeCompare(right));
  const encoded = new URLSearchParams(sorted).toString();
  const source = `asr.cloud.tencent.com/asr/v2/${config.tencentAppId}?${encoded}`;
  const signature = createHmac("sha1", config.tencentSecretKey).update(source).digest("base64");
  return `wss://${source}&signature=${encodeURIComponent(signature)}`;
}

export function normalizeTencentSentences(message) {
  if (Array.isArray(message.sentences?.sentence_list)) return message.sentences.sentence_list;
  if (message.sentences?.sentence) return [message.sentences];
  if (Array.isArray(message.speaker_sentences)) return message.speaker_sentences;
  return [];
}

export class TencentAsrSession {
  constructor(config, onEvent) {
    this.config = config;
    this.onEvent = onEvent;
    this.socket = null;
    this.ready = false;
  }

  start() {
    this.socket = new WebSocket(createTencentAsrUrl(this.config));
    this.socket.binaryType = "arraybuffer";
    this.socket.addEventListener("message", (event) => this.handleMessage(event.data));
    this.socket.addEventListener("error", () => this.onEvent({ type: "error", message: "腾讯云连接失败" }));
    this.socket.addEventListener("close", () => this.onEvent({ type: "closed" }));
  }

  handleMessage(raw) {
    let payload;
    try { payload = JSON.parse(raw); } catch { return; }
    if (payload.code && payload.code !== 0) return this.onEvent({ type: "error", code: payload.code, message: payload.message || "腾讯云识别失败" });
    if (!this.ready) {
      this.ready = true;
      this.onEvent({ type: "ready", voiceId: payload.voice_id });
    }
    for (const sentence of normalizeTencentSentences(payload)) this.onEvent({ type: "result", sentence });
  }

  sendAudio(chunk) {
    if (this.ready && this.socket?.readyState === WebSocket.OPEN) this.socket.send(chunk);
  }

  stop() {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify({ type: "end" }));
  }
}
