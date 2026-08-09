import assert from "node:assert/strict";
import test from "node:test";
import { extractLatestQuestionTurn } from "../src/question-turn.js";

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
});
