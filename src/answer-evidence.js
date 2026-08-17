function isReliableEvidence(candidate = {}) {
  if (candidate.matchType === "keyword" || candidate.matchType === "hybrid") return true;
  return candidate.matchType === "semantic" && Number(candidate.semanticScore) >= 0.82;
}

export function selectAnswerEvidence({ route = {}, limit = 3 } = {}) {
  const supportsLocalAnswer = route.mode === "direct" || route.mode === "compose";
  const evidence = supportsLocalAnswer
    ? (route.matches || []).filter(isReliableEvidence).slice(0, limit)
    : [];

  if (!evidence.length) {
    return {
      mode: "llm-only",
      evidence: [],
      reason: "没有可直接支撑答案的本地资料，已使用 LLM 通用生成",
    };
  }

  return {
    mode: "grounded",
    evidence,
    reason: "已命中可直接支撑答案的本地资料",
  };
}
