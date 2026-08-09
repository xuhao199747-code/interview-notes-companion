import assert from "node:assert/strict";
import test from "node:test";
import { formatVoiceprintError } from "../src/voiceprint-status.js";

test("声纹验证额度不足时显示可执行中文提示", () => {
  assert.equal(
    formatVoiceprintError("User no free amount! [appid: 1453726092] [biz: /VPR/VoiceprintVerify]"),
    "腾讯云声纹验证没有可用额度：请开通或购买声纹验证额度后，再重新验证。"
  );
});

test("声纹验证超时时提示用户重试", () => {
  assert.match(formatVoiceprintError("The operation was aborted due to timeout"), /15 秒/);
});
