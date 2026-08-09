export function isConfirmedQuestion(question) {
  const normalized = question.trim().replace(/[？?。！!]/g, "");
  return normalized.length >= 4 || /^(为什么|然后呢|结果呢|展开讲讲|详细讲一下|具体怎么做|这个怎么做)$/u.test(normalized);
}

export function createAnswerState() {
  return { current: null, previous: null, nextRequestId: 0 };
}

export function buildFollowUpContext(previous) {
  if (!previous) return "";
  const previousAnswer = previous.llmHtml ? `\n上一题回答：${previous.llmHtml}` : "";
  return `上一题：${previous.question}\n上一题资料：${previous.documentHtml}${previousAnswer}`;
}

export function beginQuestion(state, question, documentHtml, context = "") {
  if (state.current) state.previous = { ...state.current };
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
