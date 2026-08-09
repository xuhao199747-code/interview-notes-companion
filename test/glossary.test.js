import assert from "node:assert/strict";
import test from "node:test";
import { defaultGlossary, normalizeQuestion, parseGlossaryMarkdown, renderGlossaryUploadState } from "../src/glossary.js";

test("术语别名在检索前归一化为标准 AI 产品术语", () => {
  const glossary = [...defaultGlossary, { term: "RAG", aliases: ["IG", "检索增强", "知识库问答"] }];
  assert.equal(normalizeQuestion("你们 IG 怎么做", glossary), "你们 RAG 怎么做");
  assert.equal(normalizeQuestion("知识库问答是怎么搭的", glossary), "RAG是怎么搭的");
});

test("未配置别名的问题保持原样", () => {
  assert.equal(normalizeQuestion("介绍一下你的项目", []), "介绍一下你的项目");
});

test("从 Markdown 术语文档读取标准术语与别名", () => {
  const glossary = parseGlossaryMarkdown("# AI 术语表\n\n## RAG\n别名：IG、检索增强、知识库问答\n\n## Agent\n别名：智能体、多智能体");
  assert.deepEqual(glossary, [
    { term: "RAG", aliases: ["IG", "检索增强", "知识库问答"] },
    { term: "Agent", aliases: ["智能体", "多智能体"] },
  ]);
});

test("术语表上传状态只显示文件名和自动应用状态", () => {
  assert.equal(renderGlossaryUploadState("AI产品经理术语表.md"), "AI产品经理术语表.md（已自动应用）");
  assert.equal(renderGlossaryUploadState(), "尚未上传术语表");
});

test("术语表使用独立的上传和删除卡片", async () => {
  const { readFile } = await import("node:fs/promises");
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(html, /id="glossaryCardList"/);
  assert.match(app, /function deleteGlossary\(\)/);
});
