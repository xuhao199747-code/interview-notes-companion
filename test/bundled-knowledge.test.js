import assert from "node:assert/strict";
import test from "node:test";
import { bundledKnowledgeFiles, mergeBundledDocuments } from "../src/bundled-knowledge.js";

test("开源应用不内置候选人的知识库，资料仅由本机上传", () => {
  assert.deepEqual(bundledKnowledgeFiles, []);
});

test("内置资料只补齐缺失项，不覆盖同名的本机同步资料", () => {
  const current = [{ name: "我的本机资料.md", markdown: "本机原文", type: "knowledge" }];
  const bundled = [{ name: "示例资料.md", markdown: "示例", type: "knowledge" }];

  assert.deepEqual(mergeBundledDocuments(current, bundled), [
    { name: "我的本机资料.md", markdown: "本机原文", type: "knowledge" },
    { name: "示例资料.md", markdown: "示例", type: "knowledge" },
  ]);
});
