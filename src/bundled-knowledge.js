// 候选人的面试资料只存在本机资料库，开源包不内置、下载或上传任何个人项目原文。
export const bundledKnowledgeFiles = [];

export function mergeBundledDocuments(current = [], bundled = []) {
  const retained = [...current];
  const existingNames = new Set(retained.map((document) => document.name));
  return [
    ...retained,
    ...bundled
      .filter((document) => !existingNames.has(document.name))
      .map((document) => ({ name: document.name, markdown: document.markdown, type: "knowledge" })),
  ];
}
