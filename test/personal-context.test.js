import assert from "node:assert/strict";
import test from "node:test";
import { selectPersonalContext } from "../src/personal-context.js";

test("始终从自我介绍章节提取个人经历上下文", () => {
  const context = selectPersonalContext([
    { title: "项目挑战", content: "解决模型波动问题。" },
    { title: "自我介绍", content: "我有五年产品经验，做过 AI 产品和 SaaS。" },
  ]);
  assert.match(context, /五年产品经验/);
  assert.doesNotMatch(context, /模型波动/);
});

test("没有个人经历章节时不虚构背景", () => {
  assert.equal(selectPersonalContext([{ title: "RAG", content: "知识库检索。" }]), "");
});
