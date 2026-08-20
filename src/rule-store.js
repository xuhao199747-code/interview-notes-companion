import fs from "node:fs/promises";
import path from "node:path";

export function createRuleStore(filePath, fallback) {
  return {
    async load() {
      try {
        const saved = JSON.parse(await fs.readFile(filePath, "utf8"));
        if (typeof saved?.name === "string" && typeof saved?.markdown === "string" && saved.markdown.trim()) return saved;
      } catch {}
      return { ...fallback };
    },
    async save(rule) {
      if (!rule?.name?.trim() || !rule?.markdown?.trim()) throw new Error("规则 Markdown 文件无效");
      const saved = { name: rule.name.trim(), markdown: rule.markdown };
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(saved, null, 2), "utf8");
      return saved;
    },
    async reset() {
      await fs.rm(filePath, { force: true });
      return { ...fallback };
    },
  };
}
