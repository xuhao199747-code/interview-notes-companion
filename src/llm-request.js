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
    max_tokens: 220,
    messages: [{ role: "system", content: system }, { role: "user", content: user }]
  };
  if (stream) request.stream = true;
  if (isDeepSeekRequest(apiUrl, model)) request.thinking = { type: "disabled" };
  return request;
}
