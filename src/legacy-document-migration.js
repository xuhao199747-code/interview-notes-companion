export function mergeLegacyConverterSkills(current = [], legacy = []) {
  const existingNames = new Set(current.map((document) => document?.name).filter(Boolean));
  return [
    ...current,
    ...legacy.filter((document) => document?.type === "converter-skill"
      && typeof document.name === "string"
      && typeof document.markdown === "string"
      && !existingNames.has(document.name)),
  ];
}
