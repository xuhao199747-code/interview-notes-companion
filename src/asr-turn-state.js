function compact(text = "") {
  return text.replace(/\s+/gu, "").trim();
}

function chooseLongestCompatibleTranscript(previous = "", incoming = "") {
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
  return next.length >= current.length ? next : current;
}

export function createAsrTurnState() {
  return { rawText: "", stableText: "", submitText: "", lastFinalText: "" };
}

export function applyAsrEvent(state = createAsrTurnState(), event = {}) {
  if (event.type === "status") return { ...state, submitText: "", changed: false };
  const text = compact(event.text);
  if (!text) return { ...state, submitText: "", changed: false };
  const rawText = chooseLongestCompatibleTranscript(state.rawText, text);
  if (event.type !== "final") return { ...state, rawText, submitText: "", changed: rawText !== state.rawText };
  if (text === state.lastFinalText) return { ...state, submitText: "", changed: false };
  // 云端偶尔会把最后一帧缩成句尾（例如“请做一下自我介绍”变成“一下”）。
  // 最终帧同样必须保留此前已经识别到的完整内容，不能把残句提交给检索。
  return { rawText, stableText: rawText, submitText: rawText, lastFinalText: text, changed: rawText !== state.rawText };
}
