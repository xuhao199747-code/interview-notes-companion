import test from "node:test";
import assert from "node:assert/strict";
import { createTencentAsrUrl, normalizeTencentSentences } from "../src/tencent-asr.js";

const config = { tencentAppId: "123", tencentSecretId: "id", tencentSecretKey: "key" };

test("Tencent V2 URL is signed with sorted query parameters", () => {
  const url = createTencentAsrUrl(config, 1700000000, 42, "voice-1");
  assert.match(url, /^wss:\/\/asr\.cloud\.tencent\.com\/asr\/v2\/123\?/);
  assert.match(url, /engine_model_type=16k_zh_en_speaker_2.0/);
  assert.match(url, /signature=/);
  assert.ok(url.indexOf("engine_model_type") < url.indexOf("expired"));
});

test("Tencent stable speaker result is normalized", () => {
  assert.deepEqual(
    normalizeTencentSentences({ sentences: { speaker_id: 1, sentence_type: 1, sentence: "请介绍项目" } }),
    [{ speaker_id: 1, sentence_type: 1, sentence: "请介绍项目" }]
  );
});
