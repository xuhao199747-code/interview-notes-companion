import test from "node:test";
import assert from "node:assert/strict";
import { mergeHybridCandidates } from "../src/hybrid-retrieval.js";

test("技术词的直接命中优先于语义上泛相关的资料", () => {
  const sections = [
    { title: "自我介绍", project: "经历", content: "我负责过 RAG 和 Agent 项目。" },
    { title: "RAG 怎么做", project: "GEO", content: "使用混合召回、重排和评测闭环。" },
    { title: "AI能力拆解", project: "GEO", content: "Leader Agent 拆解任务。" },
  ];
  const candidates = mergeHybridCandidates("RAG 怎么设计", sections, [
    { ...sections[2], score: 7, semanticScore: 0.7, matchType: "semantic" },
    { ...sections[1], score: 5, semanticScore: 0.5, matchType: "semantic" },
  ]);
  assert.equal(candidates[0].title, "RAG 怎么做");
  assert.equal(candidates[0].matchType, "hybrid");
});

test("只有语义候选时仍可保留给严格回答路由二次判断", () => {
  const section = { title: "项目难点", project: "GEO", content: "跨平台回答波动需要评测。" };
  const candidates = mergeHybridCandidates("我遭遇的阻碍", [section], [{ ...section, score: 6, semanticScore: 0.6, matchType: "semantic" }]);
  assert.equal(candidates[0].matchType, "semantic");
});

test("高语义相似度不会再被只有弱词面命中的片段永久压制", () => {
  const sections = [
    { title: "项目概览", project: "GEO", content: "介绍了产品背景。" },
    { title: "请做一下自我介绍", project: "个人经历", content: "我的经历、核心优势与两个项目概览。" },
  ];
  const candidates = mergeHybridCandidates("给我介绍一下", sections, [
    { ...sections[1], score: 9, semanticScore: 0.94, matchType: "semantic" },
  ]);
  assert.equal(candidates[0].title, "请做一下自我介绍");
});

test("已有明确词面候选时，不让语义模型单独召回的无关大段资料抢占第一名", () => {
  const sections = [
    { title: "RAG 怎么做", project: "GEO", content: "采用混合召回、重排和评测闭环。" },
    { title: "3.3 功能规则表", project: "AI 产品通用能力", content: "需求池、规则表和流程说明。" },
  ];
  const candidates = mergeHybridCandidates("GEO 项目的 RAG 怎么做", sections, [
    { ...sections[1], score: 0, semanticScore: 0.99, matchType: "semantic" },
    { ...sections[0], score: 8, semanticScore: 0.7, matchType: "semantic" },
  ]);

  assert.equal(candidates[0].title, "RAG 怎么做");
  assert.equal(candidates.some((item) => item.title === "3.3 功能规则表"), false);
});
