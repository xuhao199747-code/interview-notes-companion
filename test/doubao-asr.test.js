import test from "node:test";
import assert from "node:assert/strict";
import { createDoubaoRequest, decodeDoubaoResponse, encodeDoubaoAudioFrame } from "../src/doubao-asr.js";

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
  assert.deepEqual(decodeDoubaoResponse(response), [{ type: "result", sentence: { sentence: "请介绍项目", sentence_type: 1, speaker_id: -1 } }]);
});

test("服务端带多句 utterances 时只把最后一句作为当前问题", () => {
  const payload = Buffer.from(JSON.stringify({ result: { text: "介绍一下你的项目？你的 IG 是怎么做的？", utterances: [{ text: "介绍一下你的项目？" }, { text: "你的 IG 是怎么做的？" }] } }));
  const response = Buffer.concat([Buffer.from([0x11, 0x92, 0x10, 0]), Buffer.from([0, 0, 0, payload.length]), payload]);
  assert.deepEqual(decodeDoubaoResponse(response), [{ type: "result", sentence: { sentence: "你的 IG 是怎么做的？", sentence_type: 1, speaker_id: -1 } }]);
});
