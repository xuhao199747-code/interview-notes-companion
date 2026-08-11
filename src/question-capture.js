export function nextQuestionCaptureAction({ active = false } = {}) {
  return active ? "submit" : "start";
}

export function shouldAutoSubmitQuestionCapture({ hasVoice = false, silenceMs = 0 } = {}) {
  return hasVoice && silenceMs >= 1200;
}
