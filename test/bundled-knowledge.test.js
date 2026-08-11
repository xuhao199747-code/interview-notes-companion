import assert from "node:assert/strict";
import test from "node:test";
import { bundledKnowledgeFiles, mergeBundledDocuments } from "../src/bundled-knowledge.js";

test("内置知识库包含三份项目资料和独立的通用术语表", () => {
  assert.deepEqual(bundledKnowledgeFiles, [
    "面试知识库-GEO品牌增长平台.md",
    "面试知识库-旅游智能营销.md",
    "面试知识库-AI产品通用能力.md",
    "AI产品经理术语表.md",
  ]);
});

test("同步内置资料时更新同名资料但保留手动上传资料", () => {
  const current = [
    { name: "面试知识库-GEO品牌增长平台.md", markdown: "旧 GEO", type: "knowledge" },
    { name: "我的补充.md", markdown: "手动资料", type: "knowledge" },
  ];
  const bundled = [
    { name: "面试知识库-GEO品牌增长平台.md", markdown: "新 GEO", type: "knowledge" },
    { name: "面试知识库-旅游智能营销.md", markdown: "旅游", type: "knowledge" },
  ];

  assert.deepEqual(mergeBundledDocuments(current, bundled), [
    { name: "我的补充.md", markdown: "手动资料", type: "knowledge" },
    { name: "面试知识库-GEO品牌增长平台.md", markdown: "新 GEO", type: "knowledge" },
    { name: "面试知识库-旅游智能营销.md", markdown: "旅游", type: "knowledge" },
  ]);
});
