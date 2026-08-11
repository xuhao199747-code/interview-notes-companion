import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { classifyTranscript, shouldCommitAfterSilence } from "../src/turn-detector.js";

test("完整疑问句在短静默后可以提交", () => {
  assert.deepEqual(classifyTranscript("你的项目有几个 Agent"), { complete: true, followUp: false, delayMs: 1200 });
  assert.equal(shouldCommitAfterSilence({ text: "你的项目有几个 Agent", silenceMs: 1200 }), true);
});

test("未完成的句子必须等待最长静默兜底", () => {
  assert.equal(shouldCommitAfterSilence({ text: "你这个项目当时", silenceMs: 2200 }), false);
  assert.equal(shouldCommitAfterSilence({ text: "你这个项目当时", silenceMs: 3500 }), true);
});

test("短追问会被识别为可单独提交的问题", () => {
  assert.deepEqual(classifyTranscript("具体怎么做"), { complete: true, followUp: true, delayMs: 1200 });
});

test("承接词加项目指代的完整问题也识别为追问", () => {
  assert.equal(classifyTranscript("他这个项目用到的 AI 能力有什么？").followUp, true);
});

test("豆包临时结果必须在静默后提交，最终结果必须立即提交", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /schedulePartialQuestionCommit\(sentence\.sentence\)/);
  assert.match(app, /commitAsrQuestion\(state\.asrTurn\.submitText \|\| sentence\.sentence\)/);
});
