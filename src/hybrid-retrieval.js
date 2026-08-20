import { searchSections } from "./search.js";

function candidateKey(section = {}) {
  return `${section.source || ""}\u0000${section.project || ""}\u0000${section.title || ""}\u0000${section.content || ""}`;
}

function exactSubjectBoost(query = "", section = {}) {
  const title = String(section.title || "").toLowerCase();
  const technicalPhrases = String(query).toLowerCase().match(/[a-z][a-z0-9_-]*(?:\s+[a-z][a-z0-9_-]*)+/gu) || [];
  // 点名 “Leader Agent / Prompt Agent” 这类能力时，标题精确命中比泛语义相近更可信。
  return technicalPhrases.some((phrase) => title.includes(phrase.trim())) ? 0.26 : 0;
}

const RRF_K = 60;

function reciprocalRank(rank) {
  return rank ? 1 / (RRF_K + rank) : 0;
}

function normaliseProject(value = "") {
  return String(value).trim().toLowerCase();
}

function isScopedSemanticCandidate(candidate, lexicalMatches, query) {
  if (!lexicalMatches.length) return true;
  const candidateProject = normaliseProject(candidate.project);
  if (!candidateProject) return false;
  const lexicalProjects = new Set(lexicalMatches.map((item) => normaliseProject(item.project)).filter(Boolean));
  if (lexicalProjects.has(candidateProject)) return true;
  // 问题明确点名项目时，允许该项目的向量候选参与；否则不让泛语义段落插队。
  return String(query).toLowerCase().includes(candidateProject);
}

export function mergeHybridCandidates(query, sections = [], semanticMatches = [], limit = 12) {
  const lexicalMatches = searchSections(query, sections, limit);
  const scopedSemantic = semanticMatches.filter((item) => isScopedSemanticCandidate(item, lexicalMatches, query));
  const semanticByKey = new Map(scopedSemantic.map((item) => [candidateKey(item), item]));
  const lexicalRankByKey = new Map(lexicalMatches.map((item, index) => [candidateKey(item), index + 1]));
  const semanticRankByKey = new Map(scopedSemantic.map((item, index) => [candidateKey(item), index + 1]));
  const merged = new Map();
  for (const lexical of lexicalMatches) {
    const semantic = semanticByKey.get(candidateKey(lexical));
    merged.set(candidateKey(lexical), {
      ...lexical,
      semanticScore: semantic?.semanticScore,
      matchType: semantic ? "hybrid" : lexical.matchType,
      // RRF 只融合各路“名次”，避免词面分数尺度压过向量相似度。
      rankingScore: reciprocalRank(lexicalRankByKey.get(candidateKey(lexical)))
        + reciprocalRank(semanticRankByKey.get(candidateKey(lexical)))
        + exactSubjectBoost(query, lexical),
    });
  }
  for (const semantic of scopedSemantic) {
    const key = candidateKey(semantic);
    if (merged.has(key)) continue;
    merged.set(key, {
      ...semantic,
      rankingScore: reciprocalRank(semanticRankByKey.get(key)) + exactSubjectBoost(query, semantic),
    });
  }
  return [...merged.values()]
    .sort((left, right) => right.rankingScore - left.rankingScore)
    .slice(0, limit)
    .map(({ rankingScore, ...candidate }) => candidate);
}
