export function isConfirmedQuestion(question) {
  const normalized = question.trim().replace(/[？?。！!]/g, "");
  return normalized.length >= 4 || /^(为什么|然后呢|结果呢|展开讲讲|详细讲一下|具体怎么做|这个怎么做)$/u.test(normalized);
}

export function createAnswerState() {
  return { current: null, previous: null, history: [], nextRequestId: 0 };
}

export function buildFollowUpContext(turns) {
  const recentTurns = (Array.isArray(turns) ? turns : [turns])
    .filter(Boolean)
    .slice(-3);
  if (!recentTurns.length) return "";
  return recentTurns
    .map((turn, index) => {
      const source = String(turn.sourceContext || "").trim();
      return `第 ${index + 1} 个前序问题：${turn.question}${source ? `\n命中的原文：\n${source}` : ""}`;
    })
    .join("\n\n");
}

export function beginQuestion(state, question, documentHtml, context = "") {
  if (state.current) {
    state.previous = { ...state.current };
    state.history = [...(state.history || []), { ...state.current }].slice(-3);
  }
  const current = {
    question,
    documentHtml,
    llmHtml: "",
    llmStatus: "loading",
    requestId: ++state.nextRequestId,
  };
  if (context) current.context = context;
  state.current = current;
  return current;
}

export function acceptLlmAnswer(state, requestId, llmHtml, status = "ready") {
  if (!state.current || state.current.requestId !== requestId) return false;
  state.current.llmHtml = llmHtml;
  state.current.llmStatus = status;
  return true;
}

export function setQuestionDocument(state, requestId, documentHtml) {
  if (!state.current || state.current.requestId !== requestId) return false;
  state.current.documentHtml = documentHtml;
  return true;
}

export function setQuestionContext(state, requestId, sourceContext) {
  if (!state.current || state.current.requestId !== requestId) return false;
  state.current.sourceContext = String(sourceContext || "");
  return true;
}
