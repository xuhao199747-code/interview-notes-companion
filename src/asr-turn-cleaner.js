function compact(text) {
  return text.replace(/[\s，,。！？?!]/gu, "");
}

export function removeCommittedQuestionPrefix(previousQuestion = "", incomingText = "") {
  const previous = compact(previousQuestion.trim());
  const incoming = incomingText.trim();
  if (!previous || !incoming || !compact(incoming).startsWith(previous)) return incoming;

  let expected = 0;
  let index = 0;
  for (; index < incoming.length && expected < previous.length; index += 1) {
    const character = incoming[index];
    if (/\s|，|,|。|！|？|!|\?/u.test(character)) continue;
    if (character !== previous[expected]) return incoming;
    expected += 1;
  }
  return incoming.slice(index).replace(/^[\s，,。！？?!]+/u, "").trim() || incoming;
}
