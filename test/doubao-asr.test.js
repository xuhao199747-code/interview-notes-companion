import test from "node:test";
import assert from "node:assert/strict";
import { createDoubaoRequest, decodeDoubaoResponse, DoubaoAsrSession, encodeDoubaoAudioFrame } from "../src/doubao-asr.js";

const config = {
  doubaoAppId: "app-id",
  doubaoAccessToken: "access-token",
  doubaoResourceId: "volc.seedasr.sauc.duration"
};

test("豆包请求把 Access Token 放在请求头而不放进 URL", () => {
  const request = createDoubaoRequest(config, "connection-id");
  assert.equal(request.url, "wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async");
  assert.equal(request.headers["X-Api-App-Key"], "app-id");
  assert.equal(request.headers["X-Api-Access-Key"], "access-token");
  assert.equal(request.headers["X-Api-Resource-Id"], "volc.seedasr.sauc.duration");
  assert.equal(request.url.includes("access-token"), false);
  assert.equal(request.firstFrame[0], 0x11);
  assert.equal(request.firstFrame[1], 0x10);
});

test("豆包音频包使用 binary audio-only 结尾标记", () => {
  const audio = encodeDoubaoAudioFrame(new Uint8Array([1, 2, 3]), true);
  assert.equal(audio[0], 0x11);
  assert.equal(audio[1], 0x22);
});

test("豆包最终文本标准化为无说话人编号的最终结果", () => {
  const payload = Buffer.from(JSON.stringify({ result: { text: "请介绍项目" } }));
  const response = Buffer.concat([Buffer.from([0x11, 0x92, 0x10, 0]), Buffer.from([0, 0, 0, payload.length]), payload]);
  assert.deepEqual(decodeDoubaoResponse(response), [{ type: "result", isCumulative: true, sentence: { sentence: "请介绍项目", sentence_type: 1, speaker_id: -1 } }]);
});

test("服务端带多句 utterances 时优先保留完整 result.text，避免丢失问题前半句", () => {
  const payload = Buffer.from(JSON.stringify({ result: { text: "介绍一下你的项目？你的 IG 是怎么做的？", utterances: [{ text: "介绍一下你的项目？" }, { text: "你的 IG 是怎么做的？" }] } }));
  const response = Buffer.concat([Buffer.from([0x11, 0x92, 0x10, 0]), Buffer.from([0, 0, 0, payload.length]), payload]);
  assert.deepEqual(decodeDoubaoResponse(response), [{ type: "result", isCumulative: true, sentence: { sentence: "介绍一下你的项目？你的 IG 是怎么做的？", sentence_type: 1, speaker_id: -1 } }]);
});

test("WebSocket 尚未就绪时缓存问题开头，连接后按顺序补发", () => {
  class FakeWebSocket {
    static OPEN = 1;
    constructor() { this.handlers = {}; this.sent = []; this.readyState = 0; }
    on(type, handler) { this.handlers[type] = handler; }
    send(packet) { this.sent.push(Buffer.from(packet)); }
    close() {}
    open() { this.readyState = FakeWebSocket.OPEN; this.handlers.open(); }
  }
  const session = new DoubaoAsrSession(config, () => {}, FakeWebSocket);
  session.start();
  session.sendAudio(Buffer.from([1, 2]));
  session.sendAudio(Buffer.from([3, 4]));
  assert.equal(session.socket.sent.length, 0);
  session.socket.open();
  assert.equal(session.socket.sent.length, 3);
  assert.deepEqual(session.socket.sent.slice(1), [encodeDoubaoAudioFrame(Buffer.from([1, 2])), encodeDoubaoAudioFrame(Buffer.from([3, 4]))]);
});

test("提交结束帧后保留连接一小段时间，等待最后的转写结果", async () => {
  class FakeWebSocket {
    static OPEN = 1;
    constructor() { this.handlers = {}; this.sent = []; this.readyState = 0; this.closeCalls = 0; }
    on(type, handler) { this.handlers[type] = handler; }
    send(packet) { this.sent.push(Buffer.from(packet)); }
    close() { this.closeCalls += 1; }
    open() { this.readyState = FakeWebSocket.OPEN; this.handlers.open(); }
  }
  const session = new DoubaoAsrSession(config, () => {}, FakeWebSocket);
  session.closeDelayMs = 15;
  session.start();
  session.socket.open();
  session.stop();
  assert.equal(session.socket.sent.at(-1)[1], 0x22);
  assert.equal(session.socket.closeCalls, 0);
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(session.socket.closeCalls, 1);
});

test("默认连接保留时间覆盖长句的最终转写等待窗口", () => {
  const session = new DoubaoAsrSession(config, () => {});
  assert.equal(session.closeDelayMs, 3000);
});
