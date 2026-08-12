import { searchSections } from "./search.js";

function asksForCount(query) {
  return /(几个|多少个|数量|几名|几类)/u.test(query);
}

function hasCountEvidence(section) {
  return /(\d+\s*个|[一二三四五六七八九十]+个|数量)/u.test(`${section.title} ${section.content}`);
}

function hasSpecificEvidence(query, section) {
  const text = `${section.title} ${section.project || ""} ${section.content}`.toLowerCase();
  const differenceSubjects = getDifferenceSubjects(query);
  if (differenceSubjects.length && !differenceSubjects.some((subject) => text.includes(subject.toLowerCase()))) return false;
  // 英文技术词是强约束：不能因为“项目 / 怎么做”等泛词命中，就拿别的项目资料回答 AIGC、RAG、Agent 等问题。
  const technicalTerms = [...new Set(query.toLowerCase().match(/[a-z][a-z0-9_-]{1,}/gu) || [])];
  if (technicalTerms.length && technicalTerms.some((term) => !text.includes(term))) return false;
  if (/(重新.{0,8}(做|设计).{0,8}项目|重新做一个项目)/u.test(query) && !/(重新.{0,20}(做|设计|项目)|复盘|重做|回顾)/u.test(text)) return false;
  const keywords = query
    .toLowerCase()
    .replace(/你|我|他|她|这个|那个|项目|的|是|了|在|有|什么|怎么|如何|介绍|一下|请|问|吗|呢/gu, " ")
    .match(/[a-z0-9]+|[\u4e00-\u9fff]{2,}/gu) || [];
  if (keywords.some((keyword) => text.includes(keyword))) return true;
  if (/(做过|负责过|参与过).{0,8}项目/u.test(query) && /(做过|负责过|参与过).{0,20}(项目|平台|产品)/u.test(text)) return true;
  const ignoredCharacters = new Set(["你", "我", "他", "她", "这", "那", "个", "的", "是", "了", "在", "有", "过", "吗", "呢", "啊", "什", "么", "怎", "么", "如", "何", "介", "绍", "项", "目"]);
  const matchedMeaningfulCharacters = [...query].filter((character) => /[\u4e00-\u9fff]/u.test(character) && !ignoredCharacters.has(character) && text.includes(character));
  return new Set(matchedMeaningfulCharacters).size >= 2;
}

function isProfileQuestion(query = "") {
  const normalized = query.replace(/\s+/gu, "").trim();
  return /(自我介绍|说说你的情况|介绍你的情况|介绍你的经历|个人情况|个人背景|职业经历)/u.test(normalized)
    || /^(?:请|麻烦)?(?:给我|给咱们|给大家)?介绍(?:一下)?[。？?!！]*$/u.test(normalized);
}

function isCandidateProjectOverviewQuestion(query = "") {
  const normalized = query.replace(/\s+/gu, "").trim();
  return /^(?:请|麻烦)?(?:讲一下|讲讲|说说|介绍一下|介绍).{0,6}(?:你|您)(?:的)?项目[。？?!！]*$/u.test(normalized)
    || /^(?:请|麻烦)?(?:讲一下|讲讲|说说|介绍一下|介绍).{0,6}(?:你|您)(?:做过|负责|参与)(?:的)?项目[。？?!！]*$/u.test(normalized);
}

function isProfileSection(section = {}) {
  const title = String(section.title || "").trim();
  return /(自我介绍|个人经历|职业经历|我的情况)/u.test(title)
    || /^(自我介绍|个人经历|职业经历)$/u.test(String(section.project || "").trim());
}

function getDifferenceSubjects(query = "") {
  const normalized = query.replace(/[？?。！!]/gu, "").trim();
  const match = normalized.match(/^(.+?)(?:有什么|有何|是什么|什么是)?区别/u);
  if (!match) return [];
  return match[1]
    .split(/(?:和|与|跟|及|、)/u)
    .map((item) => item.replace(/^(?:你们的|你们|这个|该)/u, "").trim())
    .filter((item) => item.length >= 2 && !/^(?:模型|产品|项目|平台)$/u.test(item));
}

function isGenericZeroToOneQuestion(query = "") {
  const normalized = query.replace(/\s+/gu, "");
  return /(?:从零到一|0到1).{0,12}(?:做|开发|设计).{0,12}(?:项目|产品).{0,16}(?:怎么|如何|会)/u.test(normalized)
    || /(?:如果让你|假如让你).{0,12}(?:做|开发|设计).{0,12}(?:项目|产品).{0,16}(?:怎么|如何|会)/u.test(normalized);
}

function isProjectOverviewQuestion(query = "") {
  const technicalTopic = /(?:RAG|Agent|Workflow|Skill|指标|评分|Prompt|评测|召回|转人工)/iu.test(query);
  return (!technicalTopic && /(?:你这个|这个|该|你们的?|我负责的?(?:其中一个)?|我来|我给您|(?:讲讲|说说|介绍).{0,8}).{0,14}项目.{0,16}(?:怎么|如何|介绍|做|讲)?/u.test(query))
    || (!technicalTopic && /项目.{0,16}(?:怎么做|如何做|是什么|介绍|讲讲|说说)/u.test(query))
    || /(?:营销智能回答|营销智能问答|attrip|at\s*trip)/iu.test(query);
}

function projectOverviewMatches(sections = []) {
  return sections
    .filter((section) => /(?:介绍|概览).{0,30}项目|项目.{0,30}(?:介绍|概览)/u.test(String(section.title || "")))
    .slice(0, 4)
    .map((section) => ({ ...section, score: Math.max(section.score || 0, 20), matchType: "keyword" }));
}

function isExplicitQuestionTitle(query = "", section = {}) {
  const title = String(section.title || "");
  const phrase = query
    .replace(/[^\u4e00-\u9fff]/gu, "")
    .replace(/(?:你们|你|我|请问|请|这个|那个|一下|怎么|如何|制定|设计|是什么|什么是|为什么|的吗|吗|呢|的|是)/gu, "");
  if (phrase.length >= 4 && title.replace(/[^\u4e00-\u9fff]/gu, "").includes(phrase)) return true;
  const technicalTerms = query.match(/[a-z][a-z0-9_-]{1,}/giu) || [];
  return technicalTerms.some((term) => new RegExp(`\\b${term}\\b`, "iu").test(title))
    && /(?:什么|怎么|如何|设计|架构|流程|评测|规则|区别|？|\?)/u.test(title);
}

function rankedMatches(query, sections, candidates) {
  if (!Array.isArray(candidates)) return searchSections(query, sections, 4);
  const available = new Set(sections.map((section) => `${section.source || ""}\u0000${section.project || ""}\u0000${section.title}\u0000${section.content}`));
  return candidates
    .filter((section) => available.has(`${section.source || ""}\u0000${section.project || ""}\u0000${section.title}\u0000${section.content}`))
    .slice(0, 4);
}

export function routeAnswer(query, sections, { allowProjectOverview = false, candidates } = {}) {
  if (isCandidateProjectOverviewQuestion(query)) {
    const profileSections = sections.filter(isProfileSection);
    if (!profileSections.length) return { mode: "fallback", matches: [], confidence: 0, reason: "没有项目概览资料" };
    const matches = rankedMatches(query, profileSections, candidates);
    const strongest = matches.length ? matches.slice(0, 1) : profileSections.slice(0, 1).map((section) => ({ ...section, score: 12, matchType: "keyword" }));
    return { mode: "direct", matches: strongest, confidence: 94, reason: "资料直接回答两个代表项目概览" };
  }
  if (isProfileQuestion(query)) {
    const profileSections = sections.filter(isProfileSection);
    if (!profileSections.length) return { mode: "fallback", matches: [], confidence: 0, reason: "没有个人经历资料" };
    const matches = rankedMatches(query, profileSections, candidates);
    const strongest = matches.length ? matches.slice(0, 1) : profileSections.slice(0, 1).map((section) => ({ ...section, score: 12, matchType: "keyword" }));
    return { mode: "direct", matches: strongest, confidence: 94, reason: "资料直接回答核心问题" };
  }
  if (isGenericZeroToOneQuestion(query)) {
    return { mode: "fallback", matches: [], confidence: 0, reason: "通用从零到一方法论题，不引用无关项目资料" };
  }
  const matches = rankedMatches(query, sections, candidates);
  if (!matches.length) return { mode: "fallback", matches: [], confidence: 0, reason: "资料未命中" };
  const explicitAnswer = matches.find((section) => isExplicitQuestionTitle(query, section));
  if (explicitAnswer) return { mode: "direct", matches: [explicitAnswer], confidence: 98, reason: "命中原文直接答案" };
  if (allowProjectOverview && isProjectOverviewQuestion(query)) {
    const overview = projectOverviewMatches(sections);
    const selected = overview.length ? overview : matches;
    return { mode: "compose", matches: selected, confidence: Math.min(80, 50 + selected[0].score * 2), reason: "已确认当前项目，整合项目资料回答" };
  }
  const top = matches[0];
  if (!hasSpecificEvidence(query, top)) return { mode: "fallback", matches: [], confidence: 0, reason: "只命中泛词，资料无法可靠回答" };
  const countRequired = asksForCount(query);
  const direct = countRequired ? hasCountEvidence(top) : top.score >= 8;
  if (direct) return { mode: "direct", matches: [top], confidence: Math.min(98, 70 + top.score * 2), reason: "资料直接回答核心问题" };
  if (matches.length >= 2) return { mode: "compose", matches, confidence: Math.min(80, 50 + top.score * 2), reason: "需要整合多段资料" };
  return { mode: "supplement", matches, confidence: Math.min(65, 35 + top.score * 2), reason: "资料相关但未覆盖核心问题" };
}
