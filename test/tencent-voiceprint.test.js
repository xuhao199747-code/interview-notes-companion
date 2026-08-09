import assert from "node:assert/strict";
import test from "node:test";
import { createVoiceprintClient, validateVoiceprintConfig, voiceprintDecision } from "../src/tencent-voiceprint.js";
import { toRendererConfig } from "../src/desktop-config.js";

test("声纹服务仅需要腾讯云 SecretId 和 SecretKey", () => {
  assert.deepEqual(validateVoiceprintConfig({ tencentSecretId: "id", tencentSecretKey: "key" }), { valid: true, message: "声纹服务配置完整" });
  assert.equal(validateVoiceprintConfig({ tencentSecretId: "id" }).valid, false);
});

test("渲染页面可以得知声纹档案已配置但不能读取腾讯云密钥", () => {
  const config = toRendererConfig({ voicePrintId: "mine", tencentSecretId: "id", tencentSecretKey: "secret" });
  assert.equal(config.voicePrintId, "mine");
  assert.equal(config.tencentSecretKey, "已保存");
  assert.equal(config.tencentSecretId, "已保存");
});

test("录入由腾讯云生成档案 ID，验证才携带该 ID 和标准 PCM 参数", async () => {
  const requests = [];
  const client = createVoiceprintClient({ tencentSecretId: "id", tencentSecretKey: "key" }, async (_url, options) => {
    requests.push({ action: options.headers["x-tc-action"], body: JSON.parse(options.body) });
    return { ok: true, json: async () => ({ Response: { Data: { VoicePrintId: "generated-id", Decision: 1 }, RequestId: "request-id" } }) };
  });
  await client.enroll({ pcm16: Buffer.alloc(64000) });
  await client.verify({ voicePrintId: "generated-id", pcm16: Buffer.alloc(64000) });
  assert.deepEqual(requests[0].body, { VoiceFormat: 0, SampleRate: 16000, Data: Buffer.alloc(64000).toString("base64"), SpeakerNick: "面试资料伴侣本人" });
  assert.equal(requests[1].body.VoicePrintId, "generated-id");
});

test("腾讯云声纹请求在 15 秒后自动超时", async () => {
  let requestSignal;
  const client = createVoiceprintClient({ tencentSecretId: "id", tencentSecretKey: "key" }, async (_url, options) => {
    requestSignal = options.signal;
    return { ok: true, json: async () => ({ Response: { Data: { Decision: 1 }, RequestId: "request-id" } }) };
  });

  await client.verify({ voicePrintId: "generated-id", pcm16: Buffer.alloc(64000) });
  assert.ok(requestSignal);
});

test("腾讯云验证结果只把明确通过判为本人", () => {
  assert.equal(voiceprintDecision({ Data: { Decision: 1 } }), "self");
  assert.equal(voiceprintDecision({ Data: { Decision: 0 } }), "other");
  assert.equal(voiceprintDecision({ Data: {} }), "unknown");
});
