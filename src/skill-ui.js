export function getActiveSkillName(documents, templateName) {
  const activeSkill = documents.find((document) => document.type === "skill" && document.name === templateName);
  return activeSkill?.name || templateName || "尚未选择回答 Skill";
}
