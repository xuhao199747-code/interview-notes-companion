export function decideSpeakerGate({ verification = "unknown", overlap = false, questionLike = false } = {}) {
  if (overlap || verification === "overlap") return "hold";
  if (verification === "self") return "ignore";
  if (verification === "other" && questionLike) return "allow";
  return "hold";
}
