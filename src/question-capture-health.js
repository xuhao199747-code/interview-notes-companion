export function decideQuestionCaptureHealth({ listening = false, trackLive = false, contextState = "closed", hasRecentFrames = false } = {}) {
  if (!listening) return "none";
  if (!trackLive || !hasRecentFrames) return "rebuild";
  if (contextState === "suspended") return "resume";
  return "none";
}
