export function decideSpeakerGate({ provider = "tencent", verification = "unknown", overlap = false, questionLike = false } = {}) {
  if (overlap || verification === "overlap") return "hold";
  if (verification === "self") return "ignore";
  if ((verification === "other" || verification === "unknown") && questionLike) return "allow";
  return "hold";
}

export function shouldEnforceVoiceprintGate({ provider = "local", verified = false } = {}) {
  return Boolean(verified);
}
