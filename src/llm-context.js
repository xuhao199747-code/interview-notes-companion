export function clipLlmText(value = "", limit = 2600) {
  const text = String(value).trim();
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

// 面试逐字稿往往把背景、做法、结果和追问拆在相邻题目中；只传两段短摘录会把
// 已命中的证据再次截断，导致模型误以为资料不完整。
export function buildLlmContext(matches = [], { maxItems = 4, maxItemChars = 2200 } = {}) {
  return matches
    .slice(0, maxItems)
    .map((item) => `【${item.project ? `${item.project} / ` : ""}${item.title}】\n${clipLlmText(item.content, maxItemChars)}`)
    .join("\n\n");
}

// 首字速度优先：保留检索排序，只缩小发送给模型的首轮资料体积。
export function buildFastFirstTokenContext(matches = []) {
  return buildLlmContext(matches, { maxItems: 3, maxItemChars: 1400 });
}
