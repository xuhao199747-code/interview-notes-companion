import assert from "node:assert/strict";
import test from "node:test";
import { getVoiceprintGuide } from "../src/voiceprint-guide.js";

test("未配置密钥时引导去配置腾讯云密钥", () => {
  assert.deepEqual(getVoiceprintGuide({ voicePrintConfigured: false, voicePrintId: "", voicePrintVerified: false }).primaryAction, {
    id: "configure", label: "去配置腾讯云密钥",
  });
});

test("已配置密钥但未录入时引导录入样本", () => {
  assert.deepEqual(getVoiceprintGuide({ voicePrintConfigured: true, voicePrintId: "", voicePrintVerified: false }).primaryAction, {
    id: "enroll", label: "录入 6 秒本人声音",
  });
});

test("已录入但未验证时引导验证样本", () => {
  assert.deepEqual(getVoiceprintGuide({ voicePrintConfigured: true, voicePrintId: "voice-id", voicePrintVerified: false }).primaryAction, {
    id: "verify", label: "验证声纹（重新录 4 秒）",
  });
});

test("验证成功后展示已启用状态", () => {
  const guide = getVoiceprintGuide({ voicePrintConfigured: true, voicePrintId: "voice-id", voicePrintVerified: true });
  assert.equal(guide.step, "enabled");
  assert.equal(guide.primaryAction, null);
  assert.equal(guide.cards[2].label, "已启用");
});
