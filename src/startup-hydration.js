export async function hydrateDocumentsInBatches(documents = [], parse, { yieldToUi = () => Promise.resolve() } = {}) {
  const hydrated = [];
  for (let index = 0; index < documents.length; index += 1) {
    const document = documents[index];
    hydrated.push({ ...document, sections: parse(document.markdown || "", document.name || "未命名资料") });
    if (index < documents.length - 1) await yieldToUi();
  }
  return hydrated;
}
