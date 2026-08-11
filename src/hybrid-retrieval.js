import { searchSections } from "./search.js";

function candidateKey(section = {}) {
  return `${section.source || ""}\u0000${section.project || ""}\u0000${section.title || ""}\u0000${section.content || ""}`;
}

export function mergeHybridCandidates(query, sections = [], semanticMatches = [], limit = 12) {
  const lexicalMatches = searchSections(query, sections, limit);
  const semanticByKey = new Map(semanticMatches.map((item) => [candidateKey(item), item]));
  const merged = new Map();
  for (const lexical of lexicalMatches) {
    const semantic = semanticByKey.get(candidateKey(lexical));
    merged.set(candidateKey(lexical), {
      ...lexical,
      semanticScore: semantic?.semanticScore,
      matchType: semantic ? "hybrid" : lexical.matchType,
      // 两路分数先归一化：旧逻辑把词面分数乘以 100，导致真正的语义相似永远无权竞争。
      rankingScore: Math.min(1, lexical.score / 60) * 0.52 + (semantic?.semanticScore || 0) * 0.48,
    });
  }
  // 词面已能准确定位时，向量只负责给这些候选加权；不允许从上万字资料中另拉一段
  // “语义相似”的内容插队。否则项目名、技术词都正确的问题仍会答到功能表或需求池。
  if (lexicalMatches.length) {
    return [...merged.values()]
      .sort((left, right) => right.rankingScore - left.rankingScore)
      .slice(0, limit)
      .map(({ rankingScore, ...candidate }) => candidate);
  }
  for (const semantic of semanticMatches) {
    const key = candidateKey(semantic);
    if (merged.has(key)) continue;
    merged.set(key, { ...semantic, rankingScore: (semantic.semanticScore || 0) * 0.48 });
  }
  return [...merged.values()]
    .sort((left, right) => right.rankingScore - left.rankingScore)
    .slice(0, limit)
    .map(({ rankingScore, ...candidate }) => candidate);
}
