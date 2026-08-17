import test from "node:test";
import assert from "node:assert/strict";
import { nextQuestionCaptureAction, nextQuestionCaptureTerminalAction, questionCaptureFinalResultWaitMs, questionCaptureRestartDelayMs, questionCaptureSilenceMs, shouldAutoSubmitQuestionCapture, shouldRearmQuestionCapture } from "../src/question-capture.js";

test("识别问题在空闲时开始、识别中时立即提交、收尾时排队", () => {
  assert.equal(nextQuestionCaptureAction({ active: false }), "start");
  assert.equal(nextQuestionCaptureAction({ active: true }), "submit");
  assert.equal(nextQuestionCaptureAction({ active: false, waitingFinal: true }), "queue");
});

test("识别问题在三秒静默后才自动提交，避免面试官短暂停顿被截断", () => {
  assert.equal(questionCaptureSilenceMs, 3000);
  assert.equal(shouldAutoSubmitQuestionCapture({ hasVoice: true, silenceMs: 2999 }), false);
  assert.equal(shouldAutoSubmitQuestionCapture({ hasVoice: true, silenceMs: 3000 }), true);
});

test("手动识别模式在提交一题后不会自动打开下一轮采集", () => {
  assert.equal(shouldRearmQuestionCapture({ continuous: true, submitted: true, manual: true }), false);
  assert.equal(shouldRearmQuestionCapture({ continuous: false, submitted: true, manual: true }), false);
});

test("上一题连接释放前，第二次手动触发会短暂排队而不是丢失", () => {
  assert.equal(questionCaptureRestartDelayMs, 1100);
});

test("停止采集后会等待完整最终转写，避免拿半句话生成", () => {
  assert.equal(questionCaptureFinalResultWaitMs, 2500);
});

test("已主动结束并等待最终文本时，连接关闭应提交已收集文本而不是取消下一题", () => {
  assert.equal(nextQuestionCaptureTerminalAction({ listening: false, awaitingFinal: true }), "submit");
});

test("已主动结束且不再等待最终文本的延迟关闭应被忽略", () => {
  assert.equal(nextQuestionCaptureTerminalAction({ listening: false, awaitingFinal: false }), "ignore");
});
