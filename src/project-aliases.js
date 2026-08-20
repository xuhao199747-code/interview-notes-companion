function sectionProjectName(section = {}) {
  return inferredProjectName(section) || canonicalProjectName(section?.project);
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
    if (!options.has(id)) options.set(id, { id, name, aliases: [] });
  }
  return [...options.values()];
}

export function filterSectionsForProject(sections = [], projectId = "") {
  return sections.filter((section) => sectionProjectName(section).toLowerCase() === projectId);
}
import { inferredProjectName } from "./section-metadata.js";
