import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("渲染层的活动入口只绑定单次识别问题链路", async () => {
  const source = await readFile(new URL("../app.js", import.meta.url), "utf8");

  assert.match(source, /startQuestionCapture/);
  assert.match(source, /sendQuestionCaptureAudio/);
  assert.match(source, /onQuestionCaptureEvent\(handleRepeatAsrEvent\)/);
  assert.match(source, /onQuestionCaptureHotkey\(startRepeatQuestion\)/);
  assert.match(source, /import \{ classifyTranscript \} from "\.\/src\/turn-detector\.js";/);
  assert.match(source, /const providerHelp = \$\("asrProviderHelp"\);/);
  assert.match(source, /if \(providerHelp\) providerHelp\.textContent/);
  assert.doesNotMatch(source, /submitRepeatedQuestion\(\)[\s\S]{0,300}clearPartialQuestionTimer/);
  assert.doesNotMatch(source, /onAsrEvent\(/);
  assert.doesNotMatch(source, /onQuestionCommitHotkey\(/);
  assert.doesNotMatch(source, /onPreviousAnswerHotkey\(/);
  assert.match(source, /const question = state\.repeatText\.trim\(\);/);
  assert.doesNotMatch(source, /sentence_type === 1\) void stopRepeatQuestion\(true\)/);
  assert.match(source, /payload\?\.type === "error" \|\| payload\?\.type === "closed"/);
  assert.match(source, /document\.addEventListener\("visibilitychange"/);
  assert.match(source, /context\.state !== "suspended"/);
  assert.match(source, /ensureRepeatAudioHealthy/);
  assert.match(source, /track\.readyState === "live"/);
  assert.match(source, /state\.repeatAwaitingFinal = true/);
  assert.match(source, /sentence_type === 1 && state\.repeatAwaitingFinal/);
  assert.match(source, /payload\?\.captureId && payload\.captureId !== state\.repeatCaptureId/);
});

test("转写条只绑定一次，避免一次点击同时开始又提交", async () => {
  const source = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const bindings = source.match(/\$\("transcriptCard"\)\.addEventListener\("click", \(\) => \{/g) || [];

  assert.equal(bindings.length, 1);
  assert.match(source, /if \(!state\.repeatListening && !state\.repeatAwaitingFinal\) void startRepeatQuestion\(\);/);
});
