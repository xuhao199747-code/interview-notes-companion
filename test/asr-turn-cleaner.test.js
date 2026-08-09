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
