import fs from "node:fs/promises";
import path from "node:path";

export function createDocumentStore(filePath) {
  return {
    async load() {
      try {
        const documents = JSON.parse(await fs.readFile(filePath, "utf8"));
        return Array.isArray(documents) ? documents : [];
      } catch {
        return [];
      }
    },
    async save(documents = []) {
      const safeDocuments = documents
        .filter((document) => document && typeof document.name === "string" && typeof document.markdown === "string")
        .map(({ name, markdown, type }) => ({ name, markdown, type: typeof type === "string" ? type : "knowledge" }));
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(safeDocuments, null, 2), "utf8");
      return safeDocuments;
    }
  };
}
