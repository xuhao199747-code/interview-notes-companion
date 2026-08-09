import test from "node:test";
import assert from "node:assert/strict";
import { cleanSpeechQuestion, getQuestionConfirmationDelay, mergeSpeechResults } from "../src/speech.js";

test("连续语音结果会保留最终文本并单独展示临时文本", () => {
  const result = mergeSpeechResults([
    { isFinal: true, transcript: "第一个问题" },
    { isFinal: false, transcript: "第二个问题" },
  ], 0);
  assert.equal(result.finalText, "第一个问题");
  assert.equal(result.interimText, "第二个问题");
});

test("新问题完成后可以从上一题中切开", () => {
  const first = mergeSpeechResults([{ isFinal: true, transcript: "你做过什么项目" }], 0);
  const second = mergeSpeechResults([{ isFinal: true, transcript: "你怎么处理困难" }], 0);
  assert.equal(cleanSpeechQuestion(first.finalText), "你做过什么项目");
  assert.equal(cleanSpeechQuestion(second.finalText), "你怎么处理困难");
});

test("浏览器重复回传上一条最终结果时不会复制上一题", () => {
  const result = mergeSpeechResults([
    { isFinal: true, transcript: "你做过什么项目" },
    { isFinal: true, transcript: "你怎么处理困难" },
  ], 0, "你做过什么项目");
  assert.equal(result.finalText, "你做过什么项目 你怎么处理困难");
});

test("带问号的问题立即确认，其他完整问题等待一秒静默", () => {
  assert.equal(getQuestionConfirmationDelay("你是怎么解决这个问题的？"), 0);
  assert.equal(getQuestionConfirmationDelay("请介绍一下你做过的项目"), 1000);
});

test("过短片段不触发问题确认", () => {
  assert.equal(getQuestionConfirmationDelay("好的"), null);
});
