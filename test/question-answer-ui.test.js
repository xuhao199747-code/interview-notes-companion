import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("面试页保留文档库和 LLM 两列回答", async () => {
  const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /id="llmResults"/);
  assert.match(html, /id="documentResults"/);
  assert.match(html, /文档库参考/);
  assert.match(html, /LLM 生成回答/);
  assert.doesNotMatch(html, /DOCUMENT LIBRARY|LLM GENERATED/);
});

test("文档库参考将 Markdown 强调语法渲染为易读文本", async () => {
  const app = await fs.readFile(new URL("../app.js", import.meta.url), "utf8");

  assert.match(app, /function formatDocumentExcerpt\(content\)/);
  assert.match(app, /<strong>\$1<\/strong>/);
  assert.match(app, /formatDocumentExcerpt\(item\.content\)/);
  assert.match(app, /class="document-excerpt"/);
});
