function isCandidateExperienceQuestion(query = "") {
  const normalized = query.replace(/\s+/gu, "").trim();
  return /(自我介绍|你的(项目|经历|背景|经验)|你(做过|负责|参与|当时|过去)|介绍(一下)?你(自己|的经历|做过)|说说你(自己|的情况|做过))/u.test(normalized)
    || /(?:我自己|我本人|我做过|我写过|我开发过|我搭过).{0,24}(?:Coding|VibeCoding|编程|代码|Codex|ClaudeCode|Cursor|Qoder|Skill|项目)/iu.test(normalized)
    || /(?:Coding|VibeCoding|编程|代码|Codex|ClaudeCode|Cursor|Qoder).{0,24}(?:我自己|我本人|我做过|我写过|我开发过|我搭过|我的项目)/iu.test(normalized)
    || /^(?:请|麻烦)?(?:讲一下|讲讲|说说|介绍一下|介绍).{0,6}(?:你|您)(?:的)?项目[。？?!！]*$/u.test(normalized)
    || /^(?:请|麻烦)?(?:讲一下|讲讲|说说|介绍一下|介绍).{0,6}(?:你|您)(?:做过|负责|参与)(?:的)?项目[。？?!！]*$/u.test(normalized)
    || /^(?:请|麻烦)?(?:给我|给咱们|给大家)?介绍(?:一下)?[。？?!！]*$/u.test(normalized);
}

function isPersonalCodingExperienceQuestion(query = "") {
  const normalized = query.replace(/\s+/gu, "").trim();
  const firstPerson = /(?:我自己|我本人|我做过|我写过|我开发过|我搭过|我的(?:Coding|编程|代码|项目))/u;
  const codingSubject = /(?:Coding|VibeCoding|编程|代码|Codex|ClaudeCode|Cursor|Qoder|Skill)/iu;
  return firstPerson.test(normalized) && codingSubject.test(normalized);
}

function isPersonalCodingEvidence(section = {}) {
  const text = `${section.title || ""}\n${section.content || ""}`;
  return isPersonalProfile(section)
    || /(?:我|我的|自己).{0,40}(?:Vibe\s*Coding|Coding|编程|代码|Codex|Claude\s*Code|Cursor|Qoder)/iu.test(text);
}

function isPersonalProfile(section = {}) {
  return isPersonalProfileSection(section);
}

function isGeneralMethodology(section = {}) {
  return /面试知识库-通用面试问题/u.test(String(section.source || "")) && !section.archive;
}

function isGlossarySection(section = {}) {
  return section.sourceType === "glossary" || /AI产品经理术语表/u.test(String(section.source || ""));
}

function isExplicitArchiveAnswer(query = "", section = {}) {
  if (!section.archive) return false;
  const normalizedQuery = String(query).replace(/\brubrics?\b/giu, "评分规则");
  const title = String(section.title || "");
  const phrase = normalizedQuery
    .replace(/[^\u4e00-\u9fff]/gu, "")
    .replace(/(?:你们|你|我|请问|请|这个|那个|一下|怎么|如何|制定|设计|是什么|什么是|为什么|的吗|吗|呢|的|是)/gu, "");
  if (phrase.length >= 4 && title.replace(/[^\u4e00-\u9fff]/gu, "").includes(phrase)) return true;
  const technicalTerms = query.match(/[a-z][a-z0-9_-]{1,}/giu) || [];
  return technicalTerms.some((term) => new RegExp(`\\b${term}\\b`, "iu").test(title))
    && /(?:什么|怎么|如何|设计|架构|流程|评测|规则|区别|？|\?)/u.test(title);
}

function isProjectDirectAnswerQuestion(query = "") {
  return /(?:RAG|Agent|Skill|Workflow|Prompt|检索|召回|重排|知识链路|技术栈|技术架构|用了什么.{0,10}技术)/iu.test(query);
}

function isProjectTechnologyAnswer(section = {}) {
  return /(?:RAG|Agent|Skill|Workflow|Prompt|检索|召回|重排|知识链路|技术选型|技术架构|模型|工具边界)/iu.test(String(section.title || ""));
}

function sameQuestionTitle(left = "", right = "") {
  const normalize = (value) => String(value)
    .replace(/\brubrics?\b/giu, "评分规则")
    .replace(/[^\u4e00-\u9fffA-Za-z0-9]/gu, "")
    .replace(/(?:问题|回答|请问|请|你们|你的|你|我|怎么|如何|是什么|什么是|吗|呢|的|是)/gu, "")
    .toLowerCase();
  const a = normalize(left);
  const b = normalize(right);
  return a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a));
}

function isAiTrendQuestion(query = "") {
  return /(?:最近|近来|平时).{0,12}(?:关注|了解).{0,18}(?:AI|人工智能|大模型|模型|趋势)|(?:AI|人工智能|大模型|模型).{0,12}(?:趋势|新发布|最近发布|新模型)/iu.test(query);
}

function isExternalProductQuestion(query = "") {
  const normalized = query.replace(/\s+/gu, "").trim();
  // 这类题是在分析一个外部产品的交互/规则，不应因为“流程、功能、为什么”等泛词而套入 AI 项目资料。
  const externalProduct = /(?:微信|朋友圈|抖音|小红书|淘宝|支付宝|美团|滴滴|微博|B站|知乎|Notion|Figma|iPhone|安卓|网页|App|界面|按钮|点赞|评论|转发|入口|交互)/iu;
  // 面试官经常点名候选人未录入资料库的产品。只要问的是产品体验、优势或取舍，
  // 就按外部产品分析处理，不能因为产品名是陌生拼写而退化为“资料不足”。
  const productExperience = /(?:你|您)(?:有没有|是否|用过|体验过|了解(?:过)?).{1,48}(?:产品|功能|服务|软件|工具)|(?:这个|该|它的?).{0,8}(?:产品|功能|服务|软件|工具).{0,18}(?:好处|优点|优势|价值|体验|好用|不好用|区别|取舍|问题)/u;
  const namedAiProduct = /(?:Kimi(?:\s*K\s*3)?|DeepSeek(?:\s*[VR]\s*\d+)?|Qwen(?:\s*[\w.-]+)?|豆包|Doubao|Gemini(?:\s*[\w.-]+)?|Grok(?:\s*\d+)?|Claude(?:\s*[\w.-]+)?|ChatGPT|GPT(?:[-\s]*\d+(?:\.\d+)?)?|Llama(?:\s*[\w.-]+)?|Hailuo(?:\s*\d+(?:\.\d+)?)?|Sora(?:\s*\d+)?)\b/iu;
  const namedProductQuestion = /(?:了解|介绍|用过|体验|好处|优点|优势|特点|能力|适合|区别|怎么选|评价|看法)/u;
  const aiDomain = /(?:AI|人工智能|大模型|模型|RAG|Agent|智能体|Prompt|检索|知识库|LLM|多模态|AIGC|生成式|机器学习)/iu;
  if (namedAiProduct.test(normalized) && namedProductQuestion.test(normalized)) return true;
  return (externalProduct.test(normalized) || productExperience.test(normalized)) && !aiDomain.test(normalized);
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
  // 术语表只用于识别同义词和语音误识别，绝不能作为资料答案、引用或 LLM 上下文。
  const answerSections = sections.filter((section) => !isGlossarySection(section));
  // 微信点赞、按钮层级等外部产品分析题不需要也不能引用候选人的 AI 项目资料。
  if (scope === "product") {
    return [];
  }
  const eligibleBeforeVersionFilter = answerSections.filter((section) => {
    if (section.sourceType === "skill") return false;
    if (scope === "general" || scope === "project" || scope === "followup") return !isPersonalProfile(section);
    return true;
  });
  // 同一资料库同时保留当前飞书全文和历史快照。历史快照用于人工查看与追溯，
  // 自动检索、引用和 LLM 上下文一律优先当前飞书版本，避免旧答案抢占项目题。
  const sourcesWithCurrentVersion = new Set(eligibleBeforeVersionFilter
    .filter((section) => !section.archive && section.source)
    .map((section) => section.source));
  let eligible = eligibleBeforeVersionFilter.filter((section) => !section.archive || !sourcesWithCurrentVersion.has(section.source));
  // 项目资料也可能把写好的逐字回答放在历史原文区。题目明确点到技术主题时，
  // 保留该题原文作为最高优先级证据；项目概览等泛题仍只用最新飞书正文，避免旧口径抢答。
  if ((scope === "project" || scope === "followup") && isProjectDirectAnswerQuestion(query)) {
    const directArchiveAnswers = eligibleBeforeVersionFilter.filter((section) => section.archive
      && (isExplicitArchiveAnswer(query, section) || isProjectTechnologyAnswer(section)));
    eligible = [...eligible, ...directArchiveAnswers];
  }
  // “我自己的 Coding 项目 / Skill 怎么写”是在问候选人的实际做法，
  // 不能因为带有 Skill 这个技术词就退回通用术语库。
  if (scope === "experience" && isPersonalCodingExperienceQuestion(query)) {
    const personalCodingEvidence = eligible.filter(isPersonalCodingEvidence);
    if (personalCodingEvidence.length) return personalCodingEvidence;
  }
  // 未点名项目的通用题优先只引用通用方法论章节；项目完整逐字稿只在明确项目题、经历题或追问时进入。
  if (scope === "general") {
    if (isAiTrendQuestion(query)) {
      const trendAnswers = eligible.filter((section) => /(?:最近|近来).{0,12}(?:关注|了解).{0,18}(?:AI|人工智能|大模型|模型|趋势)|(?:AI|人工智能|大模型|模型).{0,12}(?:趋势|新发布|最近发布|新模型)/iu.test(`${section.title}\n${section.content}`));
      if (trendAnswers.length) return trendAnswers;
    }
    const methodology = eligible.filter(isGeneralMethodology);
    // 原文逐字稿通常不参与通用题，避免把项目实践错带进通用方法论；但题目与原文标题明确一致时，
    // 这就是候选人写好的直接答案，必须保留并作为引用证据。
    const explicitAnswers = eligibleBeforeVersionFilter.filter((section) => section.archive
      && isExplicitArchiveAnswer(query, section)
      // 当前飞书若已有同题答案，仍以当前答案为准；只有当前版本没有这道题时，
      // 才让历史区中用户写好的逐字稿补位，不能因同文件存在其他正文就整题丢失。
      && !eligibleBeforeVersionFilter.some((current) => !current.archive
        && current.source === section.source
        && sameQuestionTitle(current.title, section.title))
      && !methodology.some((current) => current.source === section.source && sameQuestionTitle(current.title, section.title)));
    // 资料库同时保留当前飞书全文与历史快照；当前版本已有通用资料时，历史快照只能用于人工追溯，不能与当前答案并列送入检索或 LLM。
    if (methodology.length) return [...methodology, ...explicitAnswers];
    if (explicitAnswers.length) return explicitAnswers;
  }
  return eligible;
}

export function shouldUsePersonalContext(scope = "general") {
  return scope === "experience" || scope === "project" || scope === "followup";
}
import { isPersonalProfileSection } from "./section-metadata.js";
