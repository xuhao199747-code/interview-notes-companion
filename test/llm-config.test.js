import test from "node:test";
import assert from "node:assert/strict";
import { getModelsEndpoint, testLlmConfig, validateLlmConfig } from "../src/llm-config.js";

test("DeepSeek 控制台页面不是可调用的 Chat Completions 地址", () => {
  const result = validateLlmConfig({ apiUrl: "https://platform.deepseek.com/api_keys", model: "DeepSeek", apiKey: "key" });
  assert.equal(result.valid, false);
  assert.match(result.message, /api\.deepseek\.com\/chat\/completions/);
});

test("OpenAI 兼容 Chat Completions 地址可以生成模型检测地址", () => {
  const config = { apiUrl: "https://api.deepseek.com/chat/completions", model: "deepseek-v4-flash", apiKey: "key" };
  assert.equal(validateLlmConfig(config).valid, true);
  assert.equal(getModelsEndpoint(config.apiUrl), "https://api.deepseek.com/models");
});

test("用最小 Chat 请求验证模型，而不是依赖可能不完整的模型列表", async () => {
  const config = { apiUrl: "https://api.deepseek.com/chat/completions", model: "deepseek-v4-flash", apiKey: "key" };
  let request;
  const result = await testLlmConfig(config, async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "pong" } }] }) };
  });

  assert.equal(result.usable, true);
  assert.equal(request.url, config.apiUrl);
  assert.equal(request.options.method, "POST");
  assert.deepEqual(JSON.parse(request.options.body), { model: config.model, max_tokens: 1, messages: [{ role: "user", content: "ping" }] });
});
