import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("资料管理允许上传 Markdown 和 Go 源码", async () => {
  const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await fs.readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(html, /id="fileInputModule"[^>]*accept="\.md,\.markdown,\.go,text\/markdown"/);
  assert.match(html, /上传资料/);
  assert.match(app, /function setupDropUploads\(\)/);
  assert.match(app, /dataTransfer\.files/);
  assert.match(app, /upload-drop-card/);
});

test("资料管理不再要求用户选择资料类型", async () => {
  const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await fs.readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.doesNotMatch(html, /id="sourceType"/);
  assert.match(app, /addDocument\(file\.name, await file\.text\(\), "knowledge"\)/);
});

test("每张已上传资料卡片可下载原始 Markdown 或 Go 文件", async () => {
  const app = await fs.readFile(new URL("../app.js", import.meta.url), "utf8");
  const documentRenderer = app.slice(app.indexOf("function renderDocuments"), app.indexOf("function renderSkillCards"));
  assert.match(documentRenderer, /class="download-doc large"/);
  assert.match(documentRenderer, /data-doc="\$\{escapeHtml\(doc\.name\)\}"/);
  assert.match(app, /function downloadDocument\(name\)/);
  assert.match(app, /closest\("\.download-doc"\)/);
});
