import { isSafeGlobalHotkey } from "../global-hotkey.js";

export const defaultQuestionCaptureHotkey = "Alt+Space";

export function normalizeQuestionCaptureConfig(input = {}) {
  const value = input.questionCaptureHotkey || input.questionHotkey;
  return {
    questionCaptureHotkey: isSafeGlobalHotkey(value || "")
      ? value.trim()
      : defaultQuestionCaptureHotkey
  };
}
