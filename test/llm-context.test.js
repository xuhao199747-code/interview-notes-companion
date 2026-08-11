import test from "node:test";
import assert from "node:assert/strict";
import { buildLlmContext, clipLlmText } from "../src/llm-context.js";

test("LLM 首版保留四条高相关资料，避免完整逐字稿被前两段截断", () => {
  const context = buildLlmContext([
    { project: "GEO", title: "RAG", content: "甲".repeat(4000) },
    { project: "GEO", title: "评测", content: "乙".repeat(4000) },
    { project: "GEO", title: "重排", content: "丙".repeat(4000) },
    { project: "GEO", title: "不应发送", content: "丁".repeat(4000) },
  ]);
  assert.match(context, /【GEO \/ RAG】/);
  assert.match(context, /【GEO \/ 重排】/);
  assert.match(context, /【GEO \/ 不应发送】/);
  assert.ok(context.length > 7000);
});

test("超长追问上下文会保留开头并明确截断", () => {
  const clipped = clipLlmText("上".repeat(4000), 120);
  assert.equal(clipped.length, 121);
  assert.ok(clipped.endsWith("…"));
});
