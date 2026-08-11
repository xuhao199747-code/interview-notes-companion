import test from "node:test";
import assert from "node:assert/strict";
import { normalizeQuestionCaptureConfig } from "../src/question-capture/config.js";

test("旧快捷键只在新字段缺失时迁移", () => {
  assert.deepEqual(normalizeQuestionCaptureConfig({ questionHotkey: "Alt+Q" }), {
    questionCaptureHotkey: "Alt+Q"
  });

  assert.deepEqual(normalizeQuestionCaptureConfig({
    questionCaptureHotkey: "Control+Space",
    questionHotkey: "Alt+Q"
  }), {
    questionCaptureHotkey: "Control+Space"
  });
});

test("不安全的快捷键回退为默认值", () => {
  assert.deepEqual(normalizeQuestionCaptureConfig({ questionCaptureHotkey: "QW" }), {
    questionCaptureHotkey: "Alt+Space"
  });
});
