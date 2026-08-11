function isCandidateExperienceQuestion(query = "") {
  const normalized = query.replace(/\s+/gu, "").trim();
  return /(自我介绍|你的(项目|经历|背景|经验)|你(做过|负责|参与|当时|过去)|介绍(一下)?你(自己|的经历|做过)|说说你(自己|的情况|做过))/u.test(normalized)
    || /^(?:请|麻烦)?(?:给我|给咱们|给大家)?介绍(?:一下)?[。？?!！]*$/u.test(normalized);
}

function isPersonalProfile(section = {}) {
  return /(自我介绍|个人经历|职业经历|我的情况)/u.test(String(section.title || "").trim())
    || /^(自我介绍|个人经历|职业经历)$/u.test(String(section.project || "").trim());
}

function isGeneralMethodology(section = {}) {
  return /(?:面试知识库-AI产品通用能力|AI产品经理术语表)/u.test(String(section.source || "")) && !section.archive;
}

export function classifyAnswerScope(query = "", { isFollowUp = false, projectSource = "" } = {}) {
  // “自我介绍”即使被语音转写附带了“刚才/前面”等上下文，也必须回到个人资料，不能继承上一项目。
  if (isCandidateExperienceQuestion(query)) return "experience";
  if (projectSource === "explicit") return "project";
  if (isFollowUp && projectSource) return "followup";
  return "general";
}

export function selectAnswerMaterials({ scope = "general", sections = [] } = {}) {
  const eligible = sections.filter((section) => {
    if (section.sourceType === "skill") return false;
    if (scope === "general" || scope === "project" || scope === "followup") return !isPersonalProfile(section);
    return true;
  });
  // 未点名项目的通用题优先只引用通用方法论章节；项目完整逐字稿只在明确项目题、经历题或追问时进入。
  if (scope === "general") {
    const methodology = eligible.filter(isGeneralMethodology);
    if (methodology.length) return methodology;
  }
  return eligible;
}

export function shouldUsePersonalContext(scope = "general") {
  return scope === "experience" || scope === "project" || scope === "followup";
}
