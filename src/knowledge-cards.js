function compact(value = "") {
  return String(value).replace(/[：:？?。！!（）()\[\]]/gu, " ").replace(/\s+/gu, " ").trim();
}

function stableId(section = {}) {
  const source = compact(section.source).slice(0, 80);
  const project = compact(section.inferredProject || section.project).slice(0, 80);
  const title = compact(section.title).slice(0, 120);
  const chunk = Number.isInteger(section.chunkIndex) ? section.chunkIndex : 0;
  return `card-${[source, project, title, chunk].join("-").replace(/[^\p{L}\p{N}-]+/gu, "-").toLowerCase()}`;
}

function inferredScope(section = {}) {
  if (section.role === "profile") return "personal";
  if (section.role === "general") return "general";
  if (section.inferredProject) return "project";
  if (/^(?:通用|AI 产品通用能力|产品方法论|技术专题)/u.test(String(section.project || ""))) return "general";
  return "project";
}

function unique(values = []) {
  return [...new Set(values.map((value) => compact(value)).filter((value) => value.length >= 2))];
}

export function inferCardAliases(section = {}) {
  const title = compact(section.title);
  const aliases = [title];
  if (/(?:自我介绍|个人经历|职业经历)/u.test(title)) aliases.push("自我介绍", "介绍一下你自己", "说说你的情况", "介绍你的经历");
  if (/\bRAG\b/iu.test(title)) aliases.push("RAG 是什么", "RAG 怎么做", "RAG 方案怎么设计", "检索增强生成怎么做");
  if (/\bAgent\b|智能体/iu.test(title)) aliases.push("Agent 怎么设计", "智能体怎么做", "Agent 架构是什么");
  if (/(?:指标|得分|评分|口径|权重|计算)/u.test(title)) aliases.push("指标怎么算", "评分规则怎么制定", "指标口径是什么");
  if (/(?:挑战|难点|困难|问题)/u.test(title)) aliases.push("项目挑战是什么", "遇到什么困难", "怎么解决难点");
  if (/(?:项目介绍|项目概览|项目背景|项目定位)/u.test(title)) aliases.push("介绍一下项目", "项目是做什么的", "项目背景是什么");
  return unique(aliases);
}

export function enrichKnowledgeCard(section = {}) {
  const aliases = unique([...(section.aliases || []), ...inferCardAliases(section)]);
  const project = section.inferredProject || section.project || "";
  const cardScope = inferredScope(section);
  return {
    ...section,
    cardId: section.cardId || stableId(section),
    cardScope,
    aliases,
    retrievalText: unique([project, section.title, ...aliases, section.content]).join("\n"),
  };
}

export function enrichKnowledgeCards(sections = []) {
  return sections.map(enrichKnowledgeCard);
}
