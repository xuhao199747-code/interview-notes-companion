function compact(text = "") {
  return text.replace(/\s+/gu, "").trim();
}

// 豆包可能返回累计文本，也可能只返回新增分段；统一成尚未提交问题的完整文本。
export function mergeAsrTranscript(previous = "", incoming = "") {
  const current = compact(previous);
  const next = compact(incoming);
  if (!next) return current;
  if (!current || current === next) return next || current;
  if (next.startsWith(current)) return next;
  if (current.startsWith(next)) return current;

  const maxOverlap = Math.min(current.length, next.length);
  for (let length = maxOverlap; length > 0; length -= 1) {
    if (current.endsWith(next.slice(0, length))) return `${current}${next.slice(length)}`;
  }
  return `${current}${next}`;
}
