import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { routeAnswer } from "../src/answer-router.js";
import { parseMarkdown } from "../src/search.js";

test("数量问题必须有数量证据才能直接命中", () => {
  assert.equal(routeAnswer("项目有几个 Agent", [{ title: "Agent 架构", content: "项目共有 3 个 Agent" }]).mode, "direct");
  assert.equal(routeAnswer("项目有几个 Agent", [{ title: "Agent 职责", content: "负责规划" }]).mode, "supplement");
});

test("没有资料时使用通用兜底", () => {
  assert.equal(routeAnswer("薪资期望", []).mode, "fallback");
});

test("只命中泛词“项目”时不能拿自我介绍冒充资料答案", () => {
  const sections = [{ title: "自我介绍", content: "我做过多个 AI 项目，负责产品规划和交付。" }];
  assert.equal(routeAnswer("你这个项目的 ing 什么", sections).mode, "fallback");
});

test("具体询问做过哪些项目时应展示自我介绍中的项目经历", () => {
  const sections = [{ title: "自我介绍", content: "我做过 AlphaRank GEO 品牌增长平台和智能营销项目。" }];
  const route = routeAnswer("你具体做过什么项目", sections);
  assert.equal(route.mode, "supplement");
  assert.equal(route.matches[0].title, "自我介绍");
});

test("资料没有直接回答时不能用自我介绍冒充项目复盘答案", () => {
  const sections = [{ title: "自我介绍", content: "我有五年产品经验，负责过 AI 产品和项目交付。" }];
  const route = routeAnswer("如果让你重新做一个项目，你会怎么做", sections);
  assert.equal(route.mode, "fallback");
  assert.deepEqual(route.matches, []);
});

test("真实知识库中项目复盘问题没有对应材料时显示空状态", async () => {
  const markdown = await readFile(new URL("../interview-knowledge-base.md", import.meta.url), "utf8");
  const route = routeAnswer("如果让你重新做一个项目，你会怎么做", parseMarkdown(markdown));
  assert.equal(route.mode, "fallback");
  assert.deepEqual(route.matches, []);
});

test("页面归一化术语后使用回答路由来决定资料来源标签", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /normalizeQuestion\(cleanQuery, state\.glossary\)/);
  assert.match(app, /routeAnswer\(normalizedQuery, scopedSections\)/);
});
