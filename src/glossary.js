export const defaultGlossary = [
  { term: "RAG", aliases: ["检索增强生成", "检索增强", "知识库问答", "向量检索"] },
  { term: "Agent", aliases: ["智能体", "多智能体", "代理"] },
  { term: "Embedding", aliases: ["嵌入模型", "向量化"] },
  { term: "MCP", aliases: ["模型上下文协议"] },
];

// 这层不受用户上传术语表覆盖：用于修正 ASR 对 AI 产品高频缩写的稳定误识别。
const asrCorrections = [
  { term: "RAG", aliases: ["IG", "AIG", "R A G"] },
];

export function renderGlossaryUploadState(fileName = "") {
  return fileName ? `${fileName}（已自动应用）` : "尚未上传术语表";
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceAlias(text, alias, term) {
  const escaped = escapeRegex(alias);
  // 英文缩写必须按完整 token 匹配，AIGC 不能因为前缀 AIG 被误改成 RAGC。
  const pattern = /^[a-z0-9 ]+$/iu.test(alias)
    ? new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, "giu")
    : new RegExp(escaped, "giu");
  return text.replace(pattern, term.trim());
}

export function normalizeQuestion(question = "", glossary = []) {
  return [...asrCorrections, ...glossary].reduce((normalized, entry) => {
    if (!entry?.term || !Array.isArray(entry.aliases)) return normalized;
    const aliases = entry.aliases.filter(Boolean).sort((a, b) => b.length - a.length);
    if (!aliases.length) return normalized;
    return aliases.reduce((next, alias) => replaceAlias(next, alias, entry.term), normalized);
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
