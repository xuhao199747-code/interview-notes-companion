import test from "node:test";
import assert from "node:assert/strict";
import { nextQuestionCaptureAction, shouldAutoSubmitQuestionCapture } from "../src/question-capture.js";

test("识别问题在空闲时开始、识别中时立即提交", () => {
  assert.equal(nextQuestionCaptureAction({ active: false }), "start");
  assert.equal(nextQuestionCaptureAction({ active: true }), "submit");
});

test("识别问题在一秒二静默后自动提交", () => {
  assert.equal(shouldAutoSubmitQuestionCapture({ hasVoice: true, silenceMs: 1200 }), true);
  assert.equal(shouldAutoSubmitQuestionCapture({ hasVoice: true, silenceMs: 1199 }), false);
});
