import { searchSections } from "./search.js";

function asksForCount(query) {
  return /(几个|多少个|数量|几名|几类)/u.test(query);
}

function hasCountEvidence(section) {
  return /(\d+\s*个|[一二三四五六七八九十]+个|数量)/u.test(`${section.title} ${section.content}`);
}

function hasSpecificEvidence(query, section) {
  const text = `${section.title} ${section.content}`.toLowerCase();
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

export function routeAnswer(query, sections) {
  const matches = searchSections(query, sections, 3);
  if (!matches.length) return { mode: "fallback", matches: [], confidence: 0, reason: "资料未命中" };
  const top = matches[0];
  if (!hasSpecificEvidence(query, top)) return { mode: "fallback", matches: [], confidence: 0, reason: "只命中泛词，资料无法可靠回答" };
  const countRequired = asksForCount(query);
  const direct = countRequired ? hasCountEvidence(top) : top.score >= 8;
  if (direct) return { mode: "direct", matches, confidence: Math.min(98, 70 + top.score * 2), reason: "资料直接回答核心问题" };
  if (matches.length >= 2) return { mode: "compose", matches, confidence: Math.min(80, 50 + top.score * 2), reason: "需要整合多段资料" };
  return { mode: "supplement", matches, confidence: Math.min(65, 35 + top.score * 2), reason: "资料相关但未覆盖核心问题" };
}
