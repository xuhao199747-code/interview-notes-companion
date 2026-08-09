import test from "node:test";
import assert from "node:assert/strict";
import { shouldRestartAsrAfterSave } from "../src/asr-switch.js";

test("保存已切换的语音服务时，运行中的桌面监听需要重启", () => {
  assert.equal(shouldRestartAsrAfterSave(true, "tencent", "doubao"), true);
  assert.equal(shouldRestartAsrAfterSave(true, "doubao", "doubao"), false);
  assert.equal(shouldRestartAsrAfterSave(false, "tencent", "doubao"), false);
});
