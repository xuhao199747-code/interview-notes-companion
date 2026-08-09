import assert from "node:assert/strict";
import test from "node:test";
import { shouldRefreshPartialQuestion } from "../src/partial-question.js";

test("重复的临时转写不能重置静默提交计时器", () => {
  assert.equal(shouldRefreshPartialQuestion("你的项目是什么", "你的项目是什么"), false);
  assert.equal(shouldRefreshPartialQuestion("你的项目是什么", "你的项目怎么做"), true);
});
