import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createLocalSemanticIndex } from "../src/local-semantic-index.js";

function fakeEmbed(text) {
  const normalized = String(text).toLowerCase();
  return [
    normalized.includes("自我介绍") || normalized.includes("个人经历") ? 1 : 0,
    normalized.includes("rag") || normalized.includes("检索") ? 1 : 0,
    normalized.includes("项目") ? 0.25 : 0,
  ];
}

test("本地语义索引按余弦相似度返回匹配章节，并持久化向量", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "semantic-index-"));
  const filePath = path.join(directory, "semantic-index.json");
  const index = createLocalSemanticIndex({ filePath, embed: fakeEmbed });
  const sections = [
    { source: "经历.md", title: "自我介绍", project: "个人经历", content: "我有五年 AI 产品经验" },
    { source: "GEO.md", title: "RAG 设计", project: "GEO", content: "采用混合检索和重排" },
  ];

  const matches = await index.search("介绍一下你的个人经历", sections, 1);
  assert.equal(matches[0].title, "自我介绍");
  assert.equal(matches[0].matchType, "semantic");
  const stored = JSON.parse(await readFile(filePath, "utf8"));
  assert.equal(Object.keys(stored.entries).length, 2);
});

test("同一章节不会重复生成向量", async () => {
  let calls = 0;
  const index = createLocalSemanticIndex({ embed: (text) => { calls += 1; return fakeEmbed(text); } });
  const sections = [{ source: "资料.md", title: "RAG", content: "向量检索" }];
  await index.index(sections);
  await index.index(sections);
  assert.equal(calls, 1);
});

test("并发的预建索引与提问检索不会重复计算同一章节", async () => {
  let calls = 0;
  const index = createLocalSemanticIndex({ embed: (text) => { calls += 1; return fakeEmbed(text); } });
  const sections = [{ source: "资料.md", title: "RAG", content: "向量检索" }];
  await Promise.all([index.index(sections), index.index(sections)]);
  assert.equal(calls, 1);
});

test("大量完整资料按小批次生成向量，避免首次建库耗尽桌面端内存", async () => {
  const calls = [];
  const index = createLocalSemanticIndex({ embed: async (text) => { calls.push(text); return [1, 0]; } });
  const sections = Array.from({ length: 25 }, (_, index) => ({ title: `资料 ${index}`, content: "完整逐字稿", source: "资料" }));
  await index.index(sections);
  // mock embed 按单文本调用；关键是所有切片都被处理且不会因全量输入被丢弃。
  assert.equal(calls.length, 25);
});
