export function shouldSearchSentence(sentence, ownSpeakerId) {
  return Number.isInteger(ownSpeakerId)
    && sentence.sentence_type === 1
    && sentence.speaker_id >= 0
    && sentence.speaker_id !== ownSpeakerId
    && Boolean(sentence.sentence?.trim());
}

export function shouldRouteAsrSentence(sentence, provider, ownSpeakerId) {
  if (provider === "doubao") return sentence.sentence_type === 1 && Boolean(sentence.sentence?.trim());
  return shouldSearchSentence(sentence, ownSpeakerId);
}

export function shouldDisplayAsrSentence(sentence, provider) {
  return provider === "doubao" && Boolean(sentence.sentence?.trim());
}
