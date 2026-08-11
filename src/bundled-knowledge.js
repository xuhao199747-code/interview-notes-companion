export const bundledKnowledgeFiles = [
  "面试知识库-GEO品牌增长平台.md",
  "面试知识库-旅游智能营销.md",
  "面试知识库-AI产品通用能力.md",
  "AI产品经理术语表.md",
];

export function mergeBundledDocuments(current = [], bundled = []) {
  const bundledNames = new Set(bundled.map((document) => document.name));
  return [
    ...current.filter((document) => !bundledNames.has(document.name)),
    ...bundled.map((document) => ({ name: document.name, markdown: document.markdown, type: "knowledge" })),
  ];
}
