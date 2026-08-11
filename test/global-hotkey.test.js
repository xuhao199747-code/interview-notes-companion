import assert from "node:assert/strict";
import test from "node:test";
import { formatGlobalHotkey, isSafeGlobalHotkey } from "../src/global-hotkey.js";

test("Option 加字母时按物理键位保存为 Alt 加字母，不受输入法字符影响", () => {
  assert.equal(formatGlobalHotkey({ altKey: true, ctrlKey: false, metaKey: false, shiftKey: false, code: "KeyQ", key: "œ" }), "Alt+Q");
});

test("全局识别快捷键必须包含修饰键，避免劫持正常打字", () => {
  assert.equal(isSafeGlobalHotkey("Q"), false);
  assert.equal(isSafeGlobalHotkey("Alt+Q"), true);
  assert.equal(isSafeGlobalHotkey("Control+Shift+Q"), true);
});
