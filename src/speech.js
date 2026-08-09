export function mergeSpeechResults(results, startIndex, previousFinal = "") {
  let finalText = previousFinal;
  let interimText = "";
  for (let index = startIndex; index < results.length; index += 1) {
    const transcript = results[index].transcript || "";
    if (results[index].isFinal && transcript && !finalText.endsWith(transcript)) finalText = `${finalText} ${transcript}`.trim();
    else interimText += transcript;
  }
  return { finalText: finalText.trim(), interimText: interimText.trim(), text: `${finalText} ${interimText}`.trim() };
}

export function cleanSpeechQuestion(text) {
  return text.replace(/\s+/g, " ").replace(/^[，。！？、\s]+|[，。！？、\s]+$/g, "").trim();
}

export function getQuestionConfirmationDelay(text) {
  const question = cleanSpeechQuestion(text);
  if (question.length < 4) return null;
  return /[？?]$/.test(text.trim()) ? 0 : 1000;
}
