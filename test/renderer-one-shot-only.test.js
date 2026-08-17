import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("渲染层的活动入口只绑定单次识别问题链路", async () => {
  const source = await readFile(new URL("../app.js", import.meta.url), "utf8");

  assert.match(source, /startQuestionCapture/);
  assert.match(source, /sendQuestionCaptureAudio/);
  assert.match(source, /onQuestionCaptureEvent\(handleRepeatAsrEvent\)/);
  assert.match(source, /onQuestionCaptureHotkey\(\(\) => startRepeatQuestion\(\{ source: "hotkey" \}\)\)/);
  assert.match(source, /import \{ classifyTranscript \} from "\.\/src\/turn-detector\.js";/);
  assert.match(source, /const providerHelp = \$\("asrProviderHelp"\);/);
  assert.match(source, /if \(providerHelp\) providerHelp\.textContent/);
  assert.doesNotMatch(source, /submitRepeatedQuestion\(\)[\s\S]{0,300}clearPartialQuestionTimer/);
  assert.doesNotMatch(source, /onAsrEvent\(/);
  assert.doesNotMatch(source, /onQuestionCommitHotkey\(/);
  assert.doesNotMatch(source, /onPreviousAnswerHotkey\(/);
  assert.match(source, /const question = normalizeAsrQuestion\(state\.repeatText\);/);
  assert.match(source, /nextVisibleTranscript\(\{[\s\S]*?mergedText: state\.repeatText,[\s\S]*?sentenceType: payload\.sentence\?\.sentence_type/);
  assert.match(source, /function syncQuestionCaptureHotwords\(\)[\s\S]*?configureQuestionCaptureHotwords/);
  assert.match(source, /state\.glossary = mergeGlossaryTerms\(glossary\);/);
  assert.doesNotMatch(source, /sentence_type === 1\) void stopRepeatQuestion\(true\)/);
  assert.match(source, /payload\?\.type === "error" \|\| payload\?\.type === "closed"/);
  assert.match(source, /document\.addEventListener\("visibilitychange"/);
  assert.match(source, /context\.state !== "suspended"/);
  assert.match(source, /ensureRepeatAudioHealthy/);
  assert.match(source, /decideQuestionCaptureHealth\(/);
  assert.match(source, /state\.repeatAwaitingFinal = true/);
  assert.match(source, /sentence_type === 1 && state\.repeatAwaitingFinal/);
  assert.match(source, /payload\?\.captureId && payload\.captureId !== state\.repeatCaptureId/);
});

test("转写条不直接启动识别，避免拖动或点击空白时误录音", async () => {
  const source = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\$\("transcriptCard"\)\.addEventListener\("click"/);
  assert.match(source, /const stopTranscriptInteraction = \(event\) => \{[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopImmediatePropagation\(\);/);
  assert.match(source, /card\.addEventListener\("click", stopTranscriptInteraction, true\);/);
  assert.match(source, /card\.addEventListener\("dblclick", stopTranscriptInteraction, true\);/);
  assert.match(source, /const allowedQuestionCaptureSources = new Set\(\["button", "hotkey", "recovery", "queued"\]\);/);
  assert.match(source, /async function startRepeatQuestion\(\{ preservedText = null, source = null \} = \{\}\) \{[\s\S]*?if \(!allowedQuestionCaptureSources\.has\(source\)\) return;/);
  assert.match(source, /\$\("voiceRepeatButton"\)\.addEventListener\("click", \(\) => startRepeatQuestion\(\{ source: "button" \}\)\);/);
  assert.match(source, /onQuestionCaptureHotkey\(\(\) => startRepeatQuestion\(\{ source: "hotkey" \}\)\)/);
});

test("波形与转写文字不接收鼠标事件，识别入口只保留按钮", async () => {
  const css = await readFile(new URL("../config.css", import.meta.url), "utf8");

  assert.match(css, /#answerOverlay\s+\.transcript-card\s+\.waveform,#answerOverlay\s+\.transcript-card\s+\.transcript-placeholder\s*\{[^}]*pointer-events:none/s);
});
