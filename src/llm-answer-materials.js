function materialKey(section = {}) {
  return `${section.source || ""}\u0000${section.project || ""}\u0000${section.title || ""}\u0000${section.chunkIndex ?? ""}\u0000${section.content || ""}`;
}

function sameAnswerGroup(left = {}, right = {}) {
  return left.source === right.source
    && left.project === right.project
    && left.title === right.title;
}

function addUnique(target, seen, section) {
  const key = materialKey(section);
  if (seen.has(key)) return;
  seen.add(key);
  target.push(section);
}

// 左侧引用需要足够严格，避免把“相关”误写成“原文直接回答”；
// 右侧口述则需要完整的同题分段，才能保留原文的背景、做法、结果和边界。
export function selectLlmAnswerMaterials({ route = {}, materials = [], limit = 6 } = {}) {
  const routeMatches = Array.isArray(route.matches) ? route.matches : [];
  if (!routeMatches.length || route.mode === "fallback") return [];

  const selected = [];
  const seen = new Set();
  for (const match of routeMatches) {
    addUnique(selected, seen, match);
    for (const sibling of materials) {
      if (sameAnswerGroup(match, sibling)) addUnique(selected, seen, sibling);
      if (selected.length >= limit) return selected;
    }
  }
  return selected.slice(0, limit);
}
