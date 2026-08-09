import assert from "node:assert/strict";
import test from "node:test";
import { extractSseDeltas } from "../src/llm-stream.js";

test("从 OpenAI 兼容 SSE 数据中持续提取回答片段", () => {
  const stream = [
    'data: {"choices":[{"delta":{"content":"结论："}}]}\n\n',
    'data: {"choices":[{"delta":{"content":"先说明核心指标。"}}]}\n\n',
    "data: [DONE]\n\n",
  ].join("");
  assert.deepEqual(extractSseDeltas(stream), ["结论：", "先说明核心指标。"]);
});

test("从本地转发的 SSE 数据中持续提取回答片段", () => {
  const stream = 'data: {"delta":"结论："}\n\ndata: {"delta":"先说明核心指标。"}\n\n';
  assert.deepEqual(extractSseDeltas(stream), ["结论：", "先说明核心指标。"]);
});

test("忽略不包含文本和不完整的 SSE 行", () => {
  const stream = 'data: {"choices":[{"delta":{"role":"assistant"}}]}\n\ndata: not-json\n\n';
  assert.deepEqual(extractSseDeltas(stream), []);
});
