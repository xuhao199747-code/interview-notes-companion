function isDeepSeekRequest(apiUrl, model) {
  try {
    return new URL(apiUrl).hostname.endsWith("deepseek.com") && model.toLowerCase().startsWith("deepseek-");
  } catch {
    return false;
  }
}

export function buildAnswerRequest({ apiUrl, model, system, user, stream = false }) {
  const request = {
    model,
    temperature: 0.2,
    // 默认首答需要讲透项目、方案和证据；流式输出仍可保证先开始说，再持续补全。
    max_tokens: 900,
    messages: [{ role: "system", content: system }, { role: "user", content: user }]
  };
  if (stream) request.stream = true;
  if (isDeepSeekRequest(apiUrl, model)) request.thinking = { type: "disabled" };
  return request;
}
