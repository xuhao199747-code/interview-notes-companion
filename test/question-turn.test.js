import assert from "node:assert/strict";
import test from "node:test";
import { extractLatestQuestionTurn, normalizeAsrQuestion } from "../src/question-turn.js";

test("连续转写包含多个问题时只保留最后一个问题", () => {
  assert.equal(extractLatestQuestionTurn("介绍一下你自己。你的项目有什么优势"), "你的项目有什么优势");
});

test("没有标点的累积转写也能切到最后一个项目问题", () => {
  assert.equal(extractLatestQuestionTurn("说一下你自我介绍你做过哪些项目你的项目有什么优势"), "你的项目有什么优势");
});

test("单个问题不会被错误截断", () => {
  assert.equal(extractLatestQuestionTurn("如果让你重新做一个项目，你会怎么做"), "如果让你重新做一个项目，你会怎么做");
});

test("自我介绍不能被内部的“介绍一下”误当成新问题起点", () => {
  assert.equal(extractLatestQuestionTurn("自我介绍一下"), "自我介绍一下");
  assert.equal(extractLatestQuestionTurn("请自我介绍一下"), "请自我介绍一下");
  assert.equal(extractLatestQuestionTurn("我说自我介绍一下"), "我说自我介绍一下");
});

test("条件题被 ASR 错断成两句时，保留前提和真正问题", () => {
  assert.equal(
    extractLatestQuestionTurn("如果让你从零到一做一个项目。你会怎么做？"),
    "如果让你从零到一做一个项目。你会怎么做"
  );
});

test("主题和泛化追问被错断时保留主题，避免只剩“区别是什么”", () => {
  assert.equal(
    extractLatestQuestionTurn("多模态模型和传统模型有什么差异。区别是什么？"),
    "多模态模型和传统模型有什么差异。区别是什么"
  );
});

test("语音转写会清理重复引导语与夹在中文中的孤立字母噪声", () => {
  assert.equal(
    normalizeAsrQuestion("请介绍请介绍一下q介绍一下GEO的这个。"),
    "请介绍一下GEO的这个。",
  );
  assert.equal(normalizeAsrQuestion("如果让我设计一个 a Agent，怎么做？"), "如果让我设计一个 Agent，怎么做？");
  assert.equal(normalizeAsrQuestion("你了解 Kimi K3 吗？"), "你了解 Kimi K3 吗？");
  assert.equal(normalizeAsrQuestion("请问请问 RAG 怎么设计？"), "请问 RAG 怎么设计？");
  assert.equal(normalizeAsrQuestion("这个这个产品的好处是什么？"), "这个这个产品的好处是什么？");
});
