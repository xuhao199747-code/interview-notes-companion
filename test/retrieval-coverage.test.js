import test from "node:test";
import assert from "node:assert/strict";
import { normalizeQuestion, defaultGlossary } from "../src/glossary.js";
import { resolveProjectContext } from "../src/project-context.js";

const projects = [
  { id: "geo", name: "GEO 品牌增长平台", aliases: ["GEO", "GEO品牌增长平台"] },
  { id: "travel", name: "旅游智能营销", aliases: ["旅游项目", "营销智能回答", "Attrip", "Lai trip"] },
];

test("语音误识别的 CEO 会被还原为 GEO 项目", () => {
  const question = normalizeQuestion("CEO 会关心什么", defaultGlossary);
  assert.equal(question, "GEO 会关心什么");
  assert.equal(resolveProjectContext({ question, projects }).projectId, "geo");
});

test("旅游项目、营销智能回答和 Attrip 都路由到旅游资料", () => {
  for (const question of ["旅游项目怎么做", "营销智能回答怎么做", "Attrip 怎么做"]) {
    assert.equal(resolveProjectContext({ question, projects }).projectId, "travel", question);
  }
});

test("通用术语表只做别名替换，不作为可检索资料", async () => {
  const { bundledKnowledgeFiles } = await import("../src/bundled-knowledge.js");
  assert.equal(bundledKnowledgeFiles.includes("AI产品经理术语表.md"), false);
});
