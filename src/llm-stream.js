export function extractSseDeltas(payload = "") {
  return payload
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data: "))
    .map((line) => line.slice(6).trim())
    .filter((data) => data && data !== "[DONE]")
    .flatMap((data) => {
      try {
        const payload = JSON.parse(data);
        const content = payload?.delta ?? payload?.choices?.[0]?.delta?.content;
        return typeof content === "string" && content ? [content] : [];
      } catch {
        return [];
      }
    });
}
