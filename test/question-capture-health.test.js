import test from "node:test";
import assert from "node:assert/strict";
import { decideQuestionCaptureHealth } from "../src/question-capture-health.js";

test("切换窗口后音频轨道失效时，识别会话应重建而不是只恢复上下文", () => {
  assert.equal(decideQuestionCaptureHealth({ listening: true, trackLive: false, contextState: "running", hasRecentFrames: false }), "rebuild");
});

test("音频上下文暂停但轨道仍可用时，识别会话只恢复上下文", () => {
  assert.equal(decideQuestionCaptureHealth({ listening: true, trackLive: true, contextState: "suspended", hasRecentFrames: true }), "resume");
});

test("音频图停止产帧时，识别会话应重建采集图", () => {
  assert.equal(decideQuestionCaptureHealth({ listening: true, trackLive: true, contextState: "running", hasRecentFrames: false }), "rebuild");
});

test("未开始识别或采集正常时，不执行恢复动作", () => {
  assert.equal(decideQuestionCaptureHealth({ listening: false, trackLive: false, contextState: "suspended", hasRecentFrames: false }), "none");
  assert.equal(decideQuestionCaptureHealth({ listening: true, trackLive: true, contextState: "running", hasRecentFrames: true }), "none");
});
