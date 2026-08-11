function compact(text) {
  return text.replace(/[\s，,。！？?!]/gu, "");
}

export function removeCommittedQuestionPrefix(previousQuestion = "", incomingText = "") {
  const previous = compact(previousQuestion.trim());
  const incoming = incomingText.trim();
  if (!previous || !incoming) return incoming;

  const compactIncoming = [];
  const originalIndexes = [];
  for (let index = 0; index < incoming.length; index += 1) {
    const character = incoming[index];
    if (/\s|，|,|。|！|？|!|\?/u.test(character)) continue;
    compactIncoming.push(character);
    originalIndexes.push(index);
  }
  const occurrence = compactIncoming.join("").lastIndexOf(previous);
  if (occurrence < 0) return incoming;

  const endIndex = originalIndexes[occurrence + previous.length - 1] + 1;
  return incoming.slice(endIndex).replace(/^[\s，,。！？?!]+/u, "").trim() || incoming;
}
