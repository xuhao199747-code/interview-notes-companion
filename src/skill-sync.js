export function syncActiveSkill({ documents = [], templateName = "" } = {}) {
  const activeSkill = documents.find((document) => document.type === "skill" && document.name === templateName);
  if (!activeSkill) return null;
  return { templateName: activeSkill.name, template: activeSkill.markdown || "" };
}
