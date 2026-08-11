const projectAliases = {
  "GEO 品牌增长平台": ["GEO", "GEO品牌增长平台", "品牌增长平台"],
  "旅游智能营销": ["旅游项目", "旅游智能营销项目", "Lai trip", "LaiTrip", "营销智能回答", "营销智能问答", "Attrip", "at trip", "at-trip"],
};

const canonicalNames = new Map([
  ["geo", "GEO 品牌增长平台"],
  ["geo品牌增长平台", "GEO 品牌增长平台"],
]);

export function canonicalProjectName(name = "") {
  const normalized = String(name || "").trim();
  return canonicalNames.get(normalized.toLowerCase()) || normalized;
}

export function createProjectOptions(sections = []) {
  const options = new Map();
  for (const section of sections) {
    const name = canonicalProjectName(section?.project);
    if (!name) continue;
    const id = name.toLowerCase();
    if (!options.has(id)) options.set(id, { id, name, aliases: projectAliases[name] || [] });
  }
  return [...options.values()];
}

export function filterSectionsForProject(sections = [], projectId = "") {
  return sections.filter((section) => canonicalProjectName(section?.project).toLowerCase() === projectId);
}
