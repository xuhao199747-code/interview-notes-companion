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

test("一级标题会作为后续章节的项目边界", () => {
  const sections = parseMarkdown("# 营销项目\n## RAG 怎么做\n营销项目使用向量检索。\n# CEO 项目\n## RAG 怎么做\nCEO 项目使用知识图谱。");
  assert.equal(sections[0].project, "营销项目");
  assert.equal(sections[1].project, "CEO 项目");
});

test("Go 源码会作为可检索资料导入", () => {
  const sections = parseMarkdown("package main\n\nfunc LoginHandler() {\n  // 用户登录入口\n}", "auth.go");
  assert.equal(sections[0].title, "auth");
  assert.match(sections[0].content, /LoginHandler/);
});
