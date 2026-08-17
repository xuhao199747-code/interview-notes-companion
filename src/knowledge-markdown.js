function plain(value = "") {
  return String(value)
    .replace(/<br\s*\/?>/giu, "\n")
    .replace(/<img[^>]*>/giu, "[图示：原图信息请参考飞书原文]")
    .replace(/<[^>]+>/gu, "")
    .replace(/&nbsp;/giu, " ")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

function tableCell(value = "") {
  return String(value)
    // Markdown 表格内不能使用真实换行；保留为 <br> 才不会破坏原本的行列结构。
    .replace(/<br\s*\/?>/giu, "\uE001")
    .replace(/<img[^>]*>/giu, "[图示：原图信息请参考飞书原文]")
    .replace(/<[^>]+>/gu, "")
    .replace(/&nbsp;/giu, " ")
    .replace(/[\r\n]+/gu, " ")
    .replace(/\|/gu, "\\|")
    .replace(/\s{2,}/gu, " ")
    .replaceAll("\uE001", "<br>")
    .trim();
}

function toMarkdownTable(rows = []) {
  const nonEmptyRows = rows.filter((row) => row.some((cell) => cell.trim()));
  if (!nonEmptyRows.length) return "";
  const columnCount = Math.max(...nonEmptyRows.map((row) => row.length));
  const normalizedRows = nonEmptyRows.map((row) => Array.from({ length: columnCount }, (_, index) => tableCell(row[index] || "")));
  const [header, ...body] = normalizedRows;
  const renderRow = (row) => `| ${row.join(" | ")} |`;
  return [renderRow(header), renderRow(Array(columnCount).fill("---")), ...body.map(renderRow)].join("\n");
}

function htmlTableToMarkdown(table = "") {
  const rows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/giu)]
    .map((row) => [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/giu)].map((cell) => cell[1]))
    .filter((row) => row.length);
  return toMarkdownTable(rows);
}

function normalizeMarkdownTable(lines = []) {
  const rows = lines.map((line) => line.trim().replace(/^\||\|$/gu, "").split("|").map(tableCell));
  const [header, divider, ...body] = rows;
  const isDivider = divider?.length && divider.every((cell) => /^:?-{1,}:?$/u.test(cell.trim()));
  if (!header?.length || !isDivider) return lines.join("\n");
  return toMarkdownTable([header, ...body]);
}

function legacyRecordToText(line = "") {
  const match = line.match(/^-\s*记录\s*\d+：(.+)$/u);
  if (!match) return line;
  const fields = match[1].split("；").map((part) => {
    const pivot = part.indexOf("：");
    return pivot > 0 ? [part.slice(0, pivot).trim(), part.slice(pivot + 1).trim()] : ["说明", part.trim()];
  }).filter(([, value]) => value);
  if (!fields.length) return "- 说明：原表格此行没有可读取文字。";
  return fields.map(([label, value]) => `- ${label}：${value}`).join("\n");
}

function mermaidToText(source = "") {
  const labels = new Map();
  for (const match of source.matchAll(/([A-Za-z][\w-]*)\s*\["?([^\]\n]+)"?\]/gu)) labels.set(match[1], plain(match[2]));
  const nodes = [...labels.entries()].map(([id, label]) => `- 节点：${label || id}`).join("\n");
  const links = [...source.matchAll(/([A-Za-z][\w-]*)\s*[-=.]+>\s*([A-Za-z][\w-]*)/gu)]
    .map(([, from, to]) => `- 链路：${labels.get(from) || from} → ${labels.get(to) || to}`)
    .join("\n");
  return ["图示文字说明：", nodes, links].filter(Boolean).join("\n");
}

export function normalizeKnowledgeMarkdown(markdown = "") {
  let text = String(markdown).replace(/<table[^>]*>[\s\S]*?<\/table>/giu, htmlTableToMarkdown);
  text = text.replace(/```mermaid\s*\n([\s\S]*?)```/giu, (_all, source) => mermaidToText(source));
  // 飞书导出的“Plain Text”代码框并不是代码，去掉围栏后按正常段落显示。
  text = text.replace(/```(?:plain\s*text|plaintext)\s*\n([\s\S]*?)```/giu, "$1");
  // 部分飞书文档用 JSON 围栏承载普通口述文本；保留正文，去掉会干扰阅读和检索的布局标记。
  text = text.replace(/```json\s*\n([\s\S]*?)```/giu, "$1");
  text = text.replace(/<title[^>]*>([\s\S]*?)<\/title>/giu, (_all, title) => `# ${plain(title)}`);
  text = text.replace(/<whiteboard\b[^>]*\btoken="([^"]+)"[^>]*><\/whiteboard>/giu, (_all, token) =>
    `> 图示：飞书画板（原文资源标识：\`${token}\`）。图中可读取链路请以相邻标题和正文为准。`
  );
  text = text.replace(/<\/?(?:grid|column|callout|sheet)[^>]*>/giu, "");
  const lines = text.split(/\r?\n/);
  const output = [];
  for (let index = 0; index < lines.length;) {
    if (/^\|.*\|\s*$/u.test(lines[index])) {
      const table = [];
      while (index < lines.length && /^\|.*\|\s*$/u.test(lines[index])) table.push(lines[index++]);
      output.push(normalizeMarkdownTable(table));
      continue;
    }
    output.push(lines[index++]);
  }
  return output
    .map((line) => legacyRecordToText(line).replace(/[ \t]+$/u, ""))
    .join("\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trimEnd() + "\n";
}
