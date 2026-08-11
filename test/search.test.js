import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseMarkdown, searchSections } from "../src/search.js";

const markdown = `# 自我介绍
我有五年产品经验，负责过从零到一的 SaaS 产品，能够把模糊的问题拆成清晰可执行的计划，因此我适合需要产品判断和跨团队协作的岗位。

## 项目挑战
- 我通过用户访谈定位核心问题
- 和工程团队一起拆解方案并快速验证

## 离职原因
希望加入更重视用户价值和长期产品建设的团队。`;

test("解析 Markdown 标题和正文", () => {
  const sections = parseMarkdown(markdown, "答案.md");
  assert.equal(sections.length, 3);
  assert.equal(sections[0].title, "自我介绍");
  assert.match(sections[1].content, /用户访谈/);
});

test("根据问题返回最相关的章节", () => {
  const results = searchSections("你遇到过什么项目挑战，怎么解决", parseMarkdown(markdown));
  assert.equal(results[0].title, "项目挑战");
  assert.ok(results[0].score > 0);
});

test("空问题不返回结果", () => {
  assert.deepEqual(searchSections("", parseMarkdown(markdown)), []);
});

test("只剩‘区别是什么’这类泛问题时不应伪造高相关资料命中", () => {
  assert.deepEqual(searchSections("区别是什么", parseMarkdown(markdown)), []);
});

test("理解中文近义问法，而不是只匹配标题原词", () => {
  const results = searchSections("你在项目里遇到过什么困难，后来是怎么处理的", parseMarkdown(markdown));
  assert.equal(results[0].title, "项目挑战");
  assert.ok(results[0].matchType === "semantic" || results[0].matchType === "hybrid");
});

test("个人情况类问法应优先命中自我介绍", () => {
  const sections = [
    { title: "自我介绍", content: "我有五年产品经验，负责 AI 产品建设。" },
    { title: "项目挑战", content: "项目中需要处理复杂的数据问题。" },
  ];
  assert.equal(searchSections("说说你的情况", sections, 1)[0].title, "自我介绍");
});

test("技术缩写问题优先命中标题明确的技术章节，而不是泛自我介绍", () => {
  const sections = [
    { title: "自我介绍", content: "我有五年产品经验，负责过多个 AI 项目，主要负责 RAG、Agent 和企业级 AI 平台建设。", project: "自我介绍" },
    { title: "RAG 怎么做", content: "使用混合召回、重排和评测闭环。", project: "GEO" },
  ];
  assert.equal(searchSections("你的项目里 RAG 怎么做的", sections, 1)[0].title, "RAG 怎么做");
});

test("RAG 设计问题不能被只有“设计”泛词的归因章节抢占", () => {
  const sections = [
    { title: "你怎么设计的归因引擎", content: "通过指标下降定位原因。", project: "GEO" },
    { title: "你们怎么做的 RAG", content: "使用混合召回、重排和评测闭环。", project: "GEO" },
    { title: "自我介绍", content: "我负责过 RAG 和 Agent 项目。", project: "自我介绍" },
  ];
  assert.equal(searchSections("RAG 怎么设计", sections, 1)[0].title, "你们怎么做的 RAG");
});

test("指标和计算口径问题优先命中评分规则", () => {
  const sections = [
    { title: "你面对的挑战是什么", content: "客户看到品牌可见度得分后，不知道下一步怎么提升。" },
    { title: "你的评分规则怎么制定", content: "评分规则按维度、权重和回测三步制定，形成可见度得分。" },
  ];
  assert.equal(searchSections("你们有什么指标？你们的指标是怎么算的", sections, 1)[0].title, "你的评分规则怎么制定");
});

test("真实知识库中指标追问优先命中评分规则，而不是挑战", async () => {
  const markdown = await readFile(new URL("../interview-knowledge-base.md", import.meta.url), "utf8");
  const result = searchSections("你们有什么指标？你们的指标是怎么算的", parseMarkdown(markdown), 1);
  assert.equal(result[0].title, "你的评分规则怎么制定的？");
});

test("正文能回答问题时，即使标题不同也可以被召回", () => {
  const results = searchSections("你为什么适合这个岗位", parseMarkdown(markdown));
  assert.equal(results[0].title, "自我介绍");
});

test("问题中的项目名优先匹配对应项目章节", () => {
  const results = searchSections("介绍一下你的 GEO 项目", parseMarkdown(markdown));
  assert.equal(results[0].title, "项目挑战");
});

test("询问 Agent 数量时优先返回包含数量结论的章节", () => {
  const agentNotes = `# GEO\n## 你AGENT的架构是什么？\n核心包括3个Agent：数据Agent、策略Agent和内容Agent。\n## 你们怎么做的rag\n我们采用BM25和向量检索。\n## Agent输入输出\n每个Agent有不同的输入输出。`;
  const results = searchSections("这个项目有几个 Agent", parseMarkdown(agentNotes));
  assert.equal(results[0].title, "你AGENT的架构是什么？");
});

test("问题中的多个标题关键词应优先命中完整逐字稿里的对应问题", () => {
  const markdown = `# 项目\n\n## 项目介绍\n\nAlphaRank GEO 的 Prompt 怎么生产和优化，需要先看 Prompt 的生产、优化、分类、复测和 GEO 项目配置。\n\n## Prompt 是怎么生产和优化的\n\n先读取知识，再生成、去重、分类并复测。`;
  const results = searchSections("AlphaRank GEO 的 Prompt 怎么生产和优化", parseMarkdown(markdown), 1);
  assert.equal(results[0].title, "Prompt 是怎么生产和优化的");
});

test("一级标题会作为后续章节的项目边界", () => {
  const sections = parseMarkdown("# 营销项目\n## RAG 怎么做\n营销项目使用向量检索。\n# CEO 项目\n## RAG 怎么做\nCEO 项目使用知识图谱。");
  assert.equal(sections[0].project, "营销项目");
  assert.equal(sections[1].project, "CEO 项目");
});

test("完整原文资料之后的章节标记为档案，供通用题过滤而不删除内容", () => {
  const sections = parseMarkdown("# 通用能力\n## 什么是 Agent\n通用定义。\n## 完整原文资料（逐条保留）\n说明。\n### Prompt Agent\n项目逐字稿。");
  assert.equal(sections.find((section) => section.title === "什么是 Agent").archive, false);
  assert.equal(sections.find((section) => section.title === "Prompt Agent").archive, true);
});

test("Go 源码会作为可检索资料导入", () => {
  const sections = parseMarkdown("package main\n\nfunc LoginHandler() {\n  // 用户登录入口\n}", "auth.go");
  assert.equal(sections[0].title, "auth");
  assert.match(sections[0].content, /LoginHandler/);
});

test("知识库设计优先命中 RAG 方法论，不被长项目原文的零散词抢走", () => {
  const sections = [
    { title: "评分指标", content: "知识库检索准确率是一个指标。" },
    { title: "什么是 RAG", content: "知识库设计包括切片、Metadata、混合召回和重排。" },
  ];
  assert.equal(searchSections("知识库如何设计", sections, 1)[0].title, "什么是 RAG");
});

test("什么时候转人工优先命中高风险与人工接管规则", () => {
  const sections = [
    { title: "用户需求映射", content: "某些流程会提到人工。" },
    { title: "高风险场景", content: "低置信度、资料不足或不可逆动作时转人工。" },
  ];
  assert.equal(searchSections("什么时候转人工", sections, 1)[0].title, "高风险场景");
});

test("未点名项目的通用知识库设计优先引用术语表，而不是借用项目实践", () => {
  const sections = [
    { title: "RAG 在 GEO 项目里起什么作用", source: "面试知识库-GEO品牌增长平台.md", content: "项目知识库怎么建。" },
    { title: "RAG", source: "AI产品经理术语表.md", content: "通用知识库设计包含切片、Metadata、混合召回和重排。" },
  ];
  assert.equal(searchSections("知识库如何设计", sections, 1)[0].source, "AI产品经理术语表.md");
});

test("通用 Agent 设计题优先命中 Agent 方法论，而不是泛项目复盘", () => {
  const sections = [
    { title: "如何复盘一个 AI 项目", source: "面试知识库-AI产品通用能力.md", content: "说明业务、技术、职责和结果。" },
    { title: "什么是 Agent（什么时候用 Agent、Workflow 或 Tool）", source: "面试知识库-AI产品通用能力.md", content: "先定义目标、状态、工具、边界和失败出口。" },
  ];
  assert.equal(searchSections("如果让我设计一个 Agent，我会怎么设计", sections, 1)[0].title, "什么是 Agent（什么时候用 Agent、Workflow 或 Tool）");
});
