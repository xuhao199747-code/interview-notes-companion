import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("主进程只暴露一次性识别 IPC", async () => {
  const [main, preload] = await Promise.all([
    fs.readFile(new URL("../electron/main.js", import.meta.url), "utf8"),
    fs.readFile(new URL("../electron/preload.cjs", import.meta.url), "utf8")
  ]);

  assert.match(main, /question-capture:start/);
  assert.match(main, /question-capture:stop/);
  assert.match(main, /question-capture:audio/);
  assert.match(main, /question-capture:renderer-ready/);
  assert.match(main, /pendingQuestionCaptureHotkey/);
  assert.match(main, /captureId/);
  assert.doesNotMatch(main, /asr:start|asr:repeat|voiceprint/i);
  assert.match(preload, /startQuestionCapture/);
  assert.match(preload, /onQuestionCaptureEvent/);
  assert.match(preload, /markQuestionCaptureRendererReady/);
  assert.doesNotMatch(preload, /startAsr|startRepeatAsr|onAsrEvent|onRepeatAsrEvent/);
});
