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

test("泛问“讲一下你的项目”直接使用两个项目概览，不误命中项目复盘方法论", () => {
  const sections = [
    { title: "请做一下自我介绍（核心优势）", project: "AI 产品通用能力", content: "我目前重点参与两个 AI 项目：AlphaRank GEO 品牌增长平台，以及智能营销项目的成交转化模块。" },
    { title: "如何复盘一个 AI 项目（怎样讲清业务、技术和个人价值）", project: "AI 产品通用能力", content: "复盘时按业务目标、技术方案、个人职责、评测指标和结果展开。", score: 50 },
  ];
  const route = routeAnswer("讲一下你的项目", sections);
  assert.equal(route.mode, "direct");
  assert.deepEqual(route.matches.map((item) => item.title), ["请做一下自我介绍（核心优势）"]);
});

test("资料没有直接回答时不能用自我介绍冒充项目复盘答案", () => {
  const sections = [{ title: "自我介绍", content: "我有五年产品经验，负责过 AI 产品和项目交付。" }];
  const route = routeAnswer("如果让你重新做一个项目，你会怎么做", sections);
  assert.equal(route.mode, "fallback");
  assert.deepEqual(route.matches, []);
});

test("未指定项目的从零到一方法论题不能硬召回无关的 AI 能力表", () => {
  const sections = [{ title: "AI能力拆解", project: "AI能力拆解", content: "从零到一做项目时，Leader Agent 负责拆解任务并调度专业智能体，形成完整闭环。" }];
  const route = routeAnswer("如果让你从零到一做一个项目，你会怎么做", sections);
  assert.equal(route.mode, "fallback");
  assert.deepEqual(route.matches, []);
});

test("自我介绍只保留个人经历资料，不混入泛 AI 项目资料", () => {
  const sections = [
    { title: "自我介绍", project: "自我介绍", content: "我有五年 AI 产品经验。" },
    { title: "AI能力拆解", project: "AI能力拆解", content: "介绍 Agent 的能力和工作流。" },
  ];
  const route = routeAnswer("自我介绍一下", sections);
  assert.deepEqual(route.matches.map((item) => item.title), ["自我介绍"]);
});

test("自我介绍标题带完整问法时，仍应作为个人经历资料直接展示", () => {
  const sections = [
    { title: "请做一下自我介绍（为什么转向 AI 产品 / 你的核心优势是什么）", project: "AI 产品通用能力", content: "我有五年产品经验，重点负责 GEO 和旅游智能营销项目。" },
  ];
  const route = routeAnswer("自我介绍一下", sections);
  assert.equal(route.mode, "direct");
  assert.equal(route.matches[0].title, sections[0].title);
});

test("口语化的“给我介绍一下”默认命中自我介绍资料", () => {
  const sections = [{ title: "自我介绍", content: "我有五年产品经验，重点负责 GEO 和旅游智能营销项目。" }];
  const route = routeAnswer("给我介绍一下。", sections);
  assert.equal(route.mode, "direct");
  assert.equal(route.matches[0].title, "自我介绍");
});

test("传入本地语义候选时，回答路由不再退回关键词排序", () => {
  const sections = [
    { source: "经历.md", title: "自我介绍", project: "个人经历", content: "我有五年 AI 产品经验。" },
    { source: "项目.md", title: "项目挑战", project: "GEO", content: "项目存在跨平台数据波动。" },
  ];
  const route = routeAnswer("我说自我介绍一下", sections, { candidates: [{ ...sections[0], score: 8, semanticScore: 0.82, matchType: "semantic" }] });
  assert.deepEqual(route.matches.map((item) => item.title), ["自我介绍"]);
});

test("问题明确点名项目时，项目名本身应作为资料证据", () => {
  const sections = [{ title: "核心指标", project: "GEO", content: "通过可见度得分衡量品牌在 AI 平台的表现。" }];
  const route = routeAnswer("GEO项目的指标怎么计算", sections);
  assert.equal(route.mode, "direct");
  assert.equal(route.matches[0].title, "核心指标");
});

test("资料可直接回答时只保留第一条最强证据，避免低相关段落干扰生成", () => {
  const sections = [
    { title: "RAG 在 GEO 项目里起什么作用", project: "GEO", content: "负责知识切片、混合召回、重排与评测闭环。" },
    { title: "请介绍一下 GEO 项目", project: "GEO", content: "项目解决品牌可见度问题。" },
    { title: "项目挑战", project: "GEO", content: "面对跨平台回答波动。" },
  ];
  const route = routeAnswer("GEO 项目的 RAG 怎么做", sections);

  assert.equal(route.mode, "direct");
  assert.deepEqual(route.matches.map((item) => item.title), ["RAG 在 GEO 项目里起什么作用"]);
});

test("完整原文标题直接回答时，优先于名称相近但语义不同的术语", () => {
  const sections = [
    { title: "线索评分", content: "依据画像和互动判断线索优先级。", score: 68 },
    { title: "你的评分规则怎么制定的？", content: "定维度、配权重、做回测，85 分为直接发布线。", score: 36, archive: true },
  ];
  const route = routeAnswer("你的评分规则怎么制定的？", sections, { candidates: sections });
  assert.equal(route.mode, "direct");
  assert.deepEqual(route.matches.map((item) => item.title), ["你的评分规则怎么制定的？"]);
});

test("没有多模态资料时，不能用任何包含“区别”的无关资料凑回答", () => {
  const sections = [
    { title: "AI 产品经理和普通产品经理有什么区别", content: "AI 产品经理更关注模型能力和评测。" },
    { title: "项目挑战", project: "GEO", content: "不同 AI 平台的回答存在波动。" },
  ];
  const route = routeAnswer("多模态模型和传统模型有什么区别", sections);
  assert.equal(route.mode, "fallback");
  assert.deepEqual(route.matches, []);
});

test("已锁定项目后的“这个项目怎么做”可整合当前项目资料", () => {
  const sections = [
    { title: "项目背景", project: "GEO", content: "解决品牌在 AI 平台可见度无法量化的问题。" },
    { title: "项目方案", project: "GEO", content: "通过问题生成、跨平台采集、诊断和优化形成闭环。" },
  ];
  const route = routeAnswer("你这个项目是怎么做的", sections, { allowProjectOverview: true });
  assert.equal(route.mode, "compose");
  assert.equal(route.matches.length, 2);
});

test("明确点名旅游项目的概览问法优先返回项目介绍，而不是某个技术子模块", () => {
  const sections = [
    { title: "请介绍一下旅游智能营销项目", project: "旅游智能营销", content: "覆盖公域获客、私域承接、意向识别和方案推荐。" },
    { title: "RAG 在这个项目里起什么作用", project: "旅游智能营销", content: "负责套餐检索。" },
  ];
  const route = routeAnswer("旅游项目怎么做", sections, { allowProjectOverview: true });
  assert.equal(route.mode, "compose");
  assert.equal(route.matches[0].title, "请介绍一下旅游智能营销项目");
});

test("候选人主动开始讲项目时直接组织项目介绍，不退回澄清提问", () => {
  const sections = [
    { title: "项目介绍", project: "旅游智能营销", content: "覆盖线上销售、公域承接、客户经营和方案决策。" },
    { title: "产品方案", project: "旅游智能营销", content: "通过意向识别、需求澄清、套餐推荐和人工交接形成闭环。" },
  ];
  const route = routeAnswer("那我给您讲一下我负责的营销智能回答项目，也就是 Attrip", sections, { allowProjectOverview: true });
  assert.equal(route.mode, "compose");
  assert.equal(route.reason, "已确认当前项目，整合项目资料回答");
});

test("真实知识库中项目复盘问题没有对应材料时显示空状态", async () => {
  const markdown = await readFile(new URL("../interview-knowledge-base.md", import.meta.url), "utf8");
  const route = routeAnswer("如果让你重新做一个项目，你会怎么做", parseMarkdown(markdown));
  assert.equal(route.mode, "fallback");
  assert.deepEqual(route.matches, []);
});

test("知识库没有 AIGC 项目资料时，不得拿 GEO 项目资料凑回答", async () => {
  const markdown = await readFile(new URL("../interview-knowledge-base.md", import.meta.url), "utf8");
  const route = routeAnswer("如果让你从零做一个 AIGC 项目，你会怎么开始", parseMarkdown(markdown));
  assert.equal(route.mode, "fallback");
  assert.deepEqual(route.matches, []);
});

test("页面归一化术语后使用回答路由来决定资料来源标签", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /normalizeQuestion\(cleanQuery, state\.glossary\)/);
  assert.doesNotMatch(app, /projectOptions\(\)\.map\(\(project\) => \(\{ \.\.\.project, aliases: \[\] \}\)\)/);
  assert.match(app, /routeAnswer\(normalizedQuery, materials, \{ allowProjectOverview: scope === "project" \|\| scope === "followup", candidates \}\)/);
});
