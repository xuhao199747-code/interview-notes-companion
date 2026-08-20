const COMPARISON_PUNCTUATION = /[，,。.!！?？、:：;；'"“”‘’()（）\-_]/gu;
const QUESTION_CUE = /[?？]|什么|怎么|如何|为何|为什么|哪些|多少|几个|吗|呢/u;

function cleanDisplay(text = "") {
  let compacted = text.normalize("NFKC").replace(/[\s\u3000]+/gu, " ").trim();
  if (/[\u3400-\u9fff]/u.test(compacted)) {
    compacted = compacted.replace(/,/gu, "，").replace(/\?/gu, "？").replace(/!/gu, "！");
  }
  const withoutRepeatedMarks = compacted
    .replace(/[？?]{2,}/gu, "？")
    .replace(/[！!]{2,}/gu, "！");
  return collapseRepeatedWholeSentence(withoutRepeatedMarks);
}

function canonical(text = "") {
  return text
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\s\u3000]+/gu, "")
    .replace(COMPARISON_PUNCTUATION, "");
}

function contributesToCanonical(character) {
  return canonical(character).length > 0;
}

function suffixAfterCanonical(text, count) {
  if (count <= 0) return text.trimStart();
  let consumed = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (contributesToCanonical(text[index])) consumed += 1;
    if (consumed === count) return text.slice(index + 1).trimStart();
  }
  return "";
}

function longestSuffixPrefixOverlap(current, next) {
  const limit = Math.min(current.length, next.length);
  for (let length = limit; length > 0; length -= 1) {
    if (current.endsWith(next.slice(0, length))) return length;
  }
  return 0;
}

function commonPrefixLength(left, right) {
  const limit = Math.min(left.length, right.length);
  let length = 0;
  while (length < limit && left[length] === right[length]) length += 1;
  return length;
}

function isQuestionLike(text) {
  return QUESTION_CUE.test(text);
}

function preferRicherText(current, next) {
  if (/[?？]$/u.test(next) && !/[?？]$/u.test(current)) return next;
  return next.length > current.length ? next : current;
}

function collapseRepeatedWholeSentence(text) {
  const normalized = text.trim();
  for (let split = 1; split < normalized.length; split += 1) {
    const left = normalized.slice(0, split).trim();
    const right = normalized.slice(split).trim();
    const leftCanonical = canonical(left);
    if (leftCanonical.length >= 4 && leftCanonical === canonical(right)) {
      const ending = right.match(/[?？!！]$/u)?.[0] || "";
      return /[?？!！]$/u.test(left) || !ending ? left : `${left}${ending}`;
    }
  }
  return normalized;
}

// 豆包的事件既可能是全文回写，也可能仅是尾段；不能仅依赖 isCumulative。
// 统一按文本关系选择覆盖、去重或追加，保留尚未提交问题的完整上下文。
export function mergeAsrTranscript(previous = "", incoming = "") {
  const current = cleanDisplay(previous);
  const next = cleanDisplay(incoming);
  const currentCanonical = canonical(current);
  const nextCanonical = canonical(next);

  if (!nextCanonical) return current;
  if (!currentCanonical) return next;
  if (currentCanonical === nextCanonical) return preferRicherText(current, next);
  if (nextCanonical.startsWith(currentCanonical)) return next;
  if (currentCanonical.startsWith(nextCanonical)) return current;

  const overlap = longestSuffixPrefixOverlap(currentCanonical, nextCanonical);
  if (overlap > 0) {
    return cleanDisplay(`${current}${suffixAfterCanonical(next, overlap)}`);
  }

  // 某些服务端会把“策略 Agent 跟归因引擎”修订成尾段“策略有什么区别”。
  // 两段开头相同且新结果像问题时，保留旧术语，只拼接新问题尾部。
  const sharedPrefix = commonPrefixLength(currentCanonical, nextCanonical);
  if (
    sharedPrefix >= 2 &&
    sharedPrefix < currentCanonical.length &&
    sharedPrefix < nextCanonical.length &&
    isQuestionLike(next)
  ) {
    return cleanDisplay(`${current}${suffixAfterCanonical(next, sharedPrefix)}`);
  }

  return cleanDisplay(`${current}${next}`);
}
