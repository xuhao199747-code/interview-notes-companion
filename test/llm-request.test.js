import assert from "node:assert/strict";
import test from "node:test";
import { buildAnswerRequest } from "../src/llm-request.js";

test("DeepSeek 实时回答关闭深度思考但保留完整口述回答长度", () => {
  const request = buildAnswerRequest({ apiUrl: "https://api.deepseek.com/chat/completions", model: "deepseek-v4-flash", system: "系统", user: "问题" });
  assert.equal(request.thinking.type, "disabled");
  assert.equal(request.max_tokens, 650);
  assert.equal(Object.hasOwn(request, "stream"), false);
  assert.equal(request.temperature, 0.2);
});

test("实时回答请求启用流式返回", () => {
  const request = buildAnswerRequest({ apiUrl: "https://api.deepseek.com/chat/completions", model: "deepseek-v4-flash", system: "系统", user: "问题", stream: true });
  assert.equal(request.stream, true);
});

test("其他 OpenAI 兼容模型不发送 DeepSeek 专用参数", () => {
  const request = buildAnswerRequest({ apiUrl: "https://example.com/v1/chat/completions", model: "other-model", system: "系统", user: "问题" });
  assert.equal(Object.hasOwn(request, "thinking"), false);
});
