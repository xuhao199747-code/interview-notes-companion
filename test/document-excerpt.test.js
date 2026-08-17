import test from "node:test";
import assert from "node:assert/strict";
import { extractOriginalAnswer } from "../src/document-excerpt.js";

test("资料参考只展示原文回答，不展示可能问法和检索包装", () => {
  const excerpt = extractOriginalAnswer(`**可能问法：**\n\n> 什么是 AI Native？\n\n**回答方式：**\n\nAI Native 是从业务流程开始重新设计产品。`);

  assert.equal(excerpt, "AI Native 是从业务流程开始重新设计产品。");
});

test("没有回答标记的资料保持原文不变", () => {
  assert.equal(extractOriginalAnswer("这是原始资料正文。"), "这是原始资料正文。");
});
