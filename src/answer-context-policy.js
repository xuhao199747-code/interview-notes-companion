function isCandidateExperienceQuestion(query = "") {
  return /(自我介绍|你的(项目|经历|背景|经验)|你(做过|负责|参与|当时|过去)|介绍(一下)?你(自己|的经历|做过)|说说你(自己|的情况|做过))/u.test(query);
}

function isPersonalProfile(section = {}) {
  return /^(自我介绍|个人经历|职业经历|我的情况)$/u.test(String(section.title || "").trim())
    || /^(自我介绍|个人经历|职业经历)$/u.test(String(section.project || "").trim());
}

export function classifyAnswerScope(query = "", { isFollowUp = false, projectSource = "" } = {}) {
  if (projectSource === "explicit") return "project";
  if (isFollowUp && projectSource) return "followup";
  if (isCandidateExperienceQuestion(query)) return "experience";
  return "general";
}

export function selectAnswerMaterials({ scope = "general", sections = [] } = {}) {
  return sections.filter((section) => section.sourceType !== "skill" && (scope !== "general" || !isPersonalProfile(section)));
}

export function shouldUsePersonalContext(scope = "general") {
  return scope === "experience" || scope === "project" || scope === "followup";
}
