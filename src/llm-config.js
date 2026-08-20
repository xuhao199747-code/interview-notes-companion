export function validateLlmConfig({ apiUrl = "", model = "", apiKey = "" }) {
  if (!apiUrl.trim() || !model.trim() || !apiKey.trim()) return { valid: false, message: "请填写 API 地址、模型名称和 API Key" };
  let parsed;
  try { parsed = new URL(apiUrl); } catch { return { valid: false, message: "API 地址格式不正确" }; }
  if (parsed.hostname === "platform.deepseek.com") return { valid: false, message: "这是 DeepSeek 控制台页面；请填写 https://api.deepseek.com/chat/completions" };
  if (!parsed.pathname.endsWith("/chat/completions")) return { valid: false, message: "请填写兼容 OpenAI 的完整 Chat Completions 地址，末尾应为 /chat/completions" };
  return { valid: true, message: "配置格式正确" };
}

export function getModelsEndpoint(apiUrl) {
  const parsed = new URL(apiUrl);
  parsed.pathname = parsed.pathname.replace(/\/chat\/completions$/, "/models");
  return parsed.toString();
}

export async function testLlmConfig(config, fetchImpl = fetch) {
  const validation = validateLlmConfig(config);
  if (!validation.valid) return { usable: false, error: validation.message, status: 400 };
  const upstream = await fetchImpl(config.apiUrl, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({ model: config.model, max_tokens: 1, messages: [{ role: "user", content: "ping" }] })
  });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) return { usable: false, error: data.error?.message || `连接失败（HTTP ${upstream.status}）`, status: upstream.status };
  return { usable: true, message: "连接成功，API Key 和模型可用", status: upstream.status };
}
