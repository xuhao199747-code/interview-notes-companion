export const defaultGlossary = [
  { term: "RAG", aliases: ["检索增强生成", "检索增强", "知识库问答", "向量检索"] },
  { term: "Agent", aliases: ["智能体", "多智能体", "代理"] },
  { term: "Embedding", aliases: ["嵌入模型", "向量化"] },
  { term: "MCP", aliases: ["模型上下文协议"] },
];

export function renderGlossaryUploadState(fileName = "") {
  return fileName ? `${fileName}（已自动应用）` : "尚未上传术语表";
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeQuestion(question = "", glossary = []) {
  return glossary.reduce((normalized, entry) => {
    if (!entry?.term || !Array.isArray(entry.aliases)) return normalized;
    const aliases = entry.aliases.filter(Boolean).sort((a, b) => b.length - a.length);
    if (!aliases.length) return normalized;
    return normalized.replace(new RegExp(aliases.map(escapeRegex).join("|"), "giu"), entry.term.trim());
  }, question);
}

export function parseGlossaryMarkdown(markdown = "") {
  const entries = [];
  let current = null;
  for (const line of markdown.split(/\r?\n/u)) {
    const heading = line.match(/^##\s+(.+?)\s*#*$/u);
    if (heading) {
      if (current) entries.push(current);
      current = { term: heading[1].trim(), aliases: [] };
      continue;
    }
    const aliases = line.match(/^\s*(?:[-*]\s*)?(?:别名|关键词|aliases?)\s*[:：]\s*(.+)$/iu);
    if (current && aliases) current.aliases = aliases[1].split(/[,，、]/u).map((value) => value.trim()).filter(Boolean);
  }
  if (current) entries.push(current);
  return entries.filter((entry) => entry.term && entry.aliases.length);
}
