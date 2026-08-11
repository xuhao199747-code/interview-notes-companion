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

function isExplicitArchiveAnswer(query = "", section = {}) {
  if (!section.archive || !/面试知识库-AI产品通用能力/u.test(String(section.source || ""))) return false;
  const title = String(section.title || "");
  const phrase = query
    .replace(/[^\u4e00-\u9fff]/gu, "")
    .replace(/(?:你们|你|我|请问|请|这个|那个|一下|怎么|如何|制定|设计|是什么|什么是|为什么|的吗|吗|呢|的|是)/gu, "");
  if (phrase.length >= 4 && title.replace(/[^\u4e00-\u9fff]/gu, "").includes(phrase)) return true;
  const technicalTerms = query.match(/[a-z][a-z0-9_-]{1,}/giu) || [];
  return technicalTerms.some((term) => new RegExp(`\\b${term}\\b`, "iu").test(title))
    && /(?:什么|怎么|如何|设计|架构|流程|评测|规则|区别|？|\?)/u.test(title);
}

function isExternalProductQuestion(query = "") {
  const normalized = query.replace(/\s+/gu, "").trim();
  // 这类题是在分析一个外部产品的交互/规则，不应因为“流程、功能、为什么”等泛词而套入 AI 项目资料。
  const externalProduct = /(?:微信|朋友圈|抖音|小红书|淘宝|支付宝|美团|滴滴|微博|B站|知乎|Notion|Figma|iPhone|安卓|网页|App|界面|按钮|点赞|评论|转发|入口|交互)/iu;
  const aiDomain = /(?:AI|人工智能|大模型|模型|RAG|Agent|智能体|Prompt|检索|知识库|LLM|多模态|AIGC|生成式|机器学习)/iu;
  return externalProduct.test(normalized) && !aiDomain.test(normalized);
}

export function classifyAnswerScope(query = "", { isFollowUp = false, projectSource = "" } = {}) {
  // “自我介绍”即使被语音转写附带了“刚才/前面”等上下文，也必须回到个人资料，不能继承上一项目。
  if (isCandidateExperienceQuestion(query)) return "experience";
  if (projectSource === "explicit") return "project";
  if (isExternalProductQuestion(query)) return "product";
  if (isFollowUp && projectSource) return "followup";
  return "general";
}

export function selectAnswerMaterials({ scope = "general", sections = [], query = "" } = {}) {
  // 微信点赞、按钮层级等外部产品分析题不需要也不能引用候选人的 AI 项目资料。
  if (scope === "product") return [];
  const eligible = sections.filter((section) => {
    if (section.sourceType === "skill") return false;
    if (scope === "general" || scope === "project" || scope === "followup") return !isPersonalProfile(section);
    return true;
  });
  // 未点名项目的通用题优先只引用通用方法论章节；项目完整逐字稿只在明确项目题、经历题或追问时进入。
  if (scope === "general") {
    const methodology = eligible.filter(isGeneralMethodology);
    // 原文逐字稿通常不参与通用题，避免把项目实践错带进通用方法论；但题目与原文标题明确一致时，
    // 这就是候选人写好的直接答案，必须保留并作为引用证据。
    const explicitAnswers = eligible.filter((section) => isExplicitArchiveAnswer(query, section));
    if (methodology.length) return [...methodology, ...explicitAnswers];
  }
  return eligible;
}

export function shouldUsePersonalContext(scope = "general") {
  return scope === "experience" || scope === "project" || scope === "followup";
}
