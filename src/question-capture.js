export const questionCaptureSilenceMs = 3000;
export const questionCaptureRestartDelayMs = 1100;
export const questionCaptureFinalResultWaitMs = 2500;

export function nextQuestionCaptureAction({ active = false, waitingFinal = false } = {}) {
  if (waitingFinal) return "queue";
  return active ? "submit" : "start";
}

export function nextQuestionCaptureTerminalAction({ listening = false, awaitingFinal = false } = {}) {
  if (awaitingFinal) return "submit";
  if (!listening) return "ignore";
  return "abort";
}

export function shouldAutoSubmitQuestionCapture({ hasVoice = false, silenceMs = 0 } = {}) {
  return hasVoice && silenceMs >= questionCaptureSilenceMs;
}

export function shouldRearmQuestionCapture({ continuous = false, submitted = false, manual = true } = {}) {
  return Boolean(continuous && submitted && !manual);
}
