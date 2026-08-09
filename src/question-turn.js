const questionStarters = ["如果", "你的", "你这个", "你们", "你做过", "介绍一下", "说说", "请问"];

function hasQuestionCue(text) {
  return /(吗|呢|么|多少|几个|哪些|什么|为什么|怎么|如何|优势|挑战|经历|项目|介绍|负责|结果)/u.test(text);
}

export function extractLatestQuestionTurn(text = "") {
  const normalized = text.trim().replace(/^[\s，,。！？?!]+|[\s，,。！？?!]+$/gu, "");
  if (!normalized) return "";
  const candidates = normalized.split(/[。！？?]+/u).map((item) => item.trim()).filter(Boolean);
  const lastSentence = candidates.at(-1) || normalized;
  // “自我介绍一下”本身是一个完整意图；其中的“介绍一下”不是下一题的起点。
  if (/^(请)?自我介绍(?:一下)?$/u.test(lastSentence)) return lastSentence;
  const starts = questionStarters
    .flatMap((starter) => [...lastSentence.matchAll(new RegExp(starter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gu"))].map((match) => match.index))
    .filter((index) => index > 0)
    .sort((left, right) => left - right);
  for (const index of starts.toReversed()) {
    const candidate = lastSentence.slice(index).trim();
    if (hasQuestionCue(candidate)) return candidate;
  }
  return lastSentence;
}
