import test from "node:test";
import assert from "node:assert/strict";
import { enrichKnowledgeCard } from "../src/knowledge-cards.js";

test("项目技术章节自动成为带项目和别名的知识卡，但不改原始正文", () => {
  const section = enrichKnowledgeCard({
    source: "GEO资料.md",
    project: "GEO 品牌增长平台",
    title: "GEO 项目的 RAG 怎么做",
    content: "使用混合召回、重排和评测闭环。",
    role: "project-solution",
  });

  assert.equal(section.content, "使用混合召回、重排和评测闭环。");
  assert.equal(section.cardScope, "project");
  assert.match(section.cardId, /^card-/u);
  assert.ok(section.aliases.includes("RAG 怎么做"));
  assert.match(section.retrievalText, /GEO 品牌增长平台/);
  assert.match(section.retrievalText, /RAG 怎么做/);
});

test("没有项目归属的技术定义自动成为通用知识卡", () => {
  const section = enrichKnowledgeCard({
    source: "通用技术.md",
    project: "AI 产品通用能力",
    title: "什么是 RAG",
    content: "RAG 是检索增强生成。",
    role: "general",
  });

  assert.equal(section.cardScope, "general");
  assert.ok(section.aliases.includes("RAG 是什么"));
});
