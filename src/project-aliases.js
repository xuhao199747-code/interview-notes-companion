const projectAliases = {
  "GEO 品牌增长平台": ["GEO", "GEO品牌增长平台", "品牌增长平台"],
  "旅游智能营销": ["旅游项目", "旅游智能营销项目", "旅游智能营消", "旅游自能营销", "旅游智能影像", "旅游获客", "旅游获客项目", "旅游获客场景", "旅游营销获客", "旅游客户获取", "Lai trip", "LaiTrip", "营销智能回答", "营销智能问答", "Attrip", "at trip", "at-trip"],
};

const canonicalNames = new Map([
  ["geo", "GEO 品牌增长平台"],
  ["geo品牌增长平台", "GEO 品牌增长平台"],
]);

function projectFromSource(source = "") {
  const normalized = String(source || "").toLowerCase();
  // 早期导入的 Markdown 只有文件名，没有在每个一级标题里重复项目名。
  // 在这里补齐归属，避免真实资料在切片后失去项目上下文。
  if (/(?:geo|alpharank|品牌增长)/iu.test(normalized)) return "GEO 品牌增长平台";
  if (/(?:旅游|营销智能|attrip|lai\s*trip)/iu.test(normalized)) return "旅游智能营销";
  return "";
}

function sectionProjectName(section = {}) {
  // 飞书正文的一级标题会被解析成“项目背景”等章节名，不是项目实体。
  // 对专属项目资料，文件名是更稳定的归属信号，必须优先于章节标题。
  return projectFromSource(section?.source) || inferredProjectName(section) || canonicalProjectName(section?.project);
}

export function canonicalProjectName(name = "") {
  const normalized = String(name || "").trim();
  return canonicalNames.get(normalized.toLowerCase()) || normalized;
}

export function createProjectOptions(sections = []) {
  const options = new Map();
  for (const section of sections) {
    const name = sectionProjectName(section);
    if (!name) continue;
    const id = name.toLowerCase();
    if (!options.has(id)) options.set(id, { id, name, aliases: projectAliases[name] || [] });
  }
  return [...options.values()];
}

export function filterSectionsForProject(sections = [], projectId = "") {
  return sections.filter((section) => sectionProjectName(section).toLowerCase() === projectId);
}
import { inferredProjectName } from "./section-metadata.js";
