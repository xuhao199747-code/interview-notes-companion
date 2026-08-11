import assert from "node:assert/strict";
import test from "node:test";
import { removeCommittedQuestionPrefix } from "../src/asr-turn-cleaner.js";

test("豆包累积返回上一题加新题时只保留新题", () => {
  assert.equal(
    removeCommittedQuestionPrefix("说一下你的自我介绍", "说一下你的自我介绍，你的 IG 是怎么做的？"),
    "你的 IG 是怎么做的？"
  );
});

test("新问题没有重复旧题时不能误删", () => {
  assert.equal(removeCommittedQuestionPrefix("说一下你的自我介绍", "你的 IG 是怎么做的？"), "你的 IG 是怎么做的？");
});

test("整场累计转写时，从最后一次已提交问题之后开始截取", () => {
  assert.equal(
    removeCommittedQuestionPrefix("你们这个项目", "多模态模型有什么区别？你们这个项目是怎么做的？如果让你开发一个 Agent 平台，你会从哪里开始做？"),
    "是怎么做的？如果让你开发一个 Agent 平台，你会从哪里开始做？"
  );
});
