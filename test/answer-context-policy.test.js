import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { classifyAnswerScope, selectAnswerMaterials, shouldUsePersonalContext } from "../src/answer-context-policy.js";

const sections = [
  { title: "自我介绍", content: "我做过 AlphaRank GEO。", project: "" },
  { title: "GEO 项目挑战", content: "项目中的问题集管理。", project: "AlphaRank GEO" },
  { title: "AIGC 产品方法", content: "先明确用户问题与成功指标。", project: "" },
];

test("通用方法论检索全部技术资料，但不把个人档案送给模型", () => {
  const scope = classifyAnswerScope("如果让你从零开始做一个 AIGC 产品，你会怎么开始？", { answerMode: "auto" });
  const materials = selectAnswerMaterials({ scope, sections });
  assert.equal(scope, "general");
  assert.deepEqual(materials.map((item) => item.title), ["GEO 项目挑战", "AIGC 产品方法"]);
});

test("通用问题保留项目技术资料作为事实参考，但排除自我介绍", () => {
  const librarySections = [
    { title: "什么是 RAG", content: "检索增强生成先召回再生成。", project: "其他问题" },
    { title: "项目 RAG 复盘", content: "GEO 项目采用混合检索。", project: "GEO" },
    { title: "自我介绍", content: "我做过 GEO。", project: "自我介绍" },
  ];
  const materials = selectAnswerMaterials({ scope: "general", sections: librarySections });
  assert.deepEqual(materials.map((item) => item.title), ["什么是 RAG", "项目 RAG 复盘"]);
});

test("通用 Agent 题优先使用非档案的通用方法论，不让 GEO 或旅游逐字稿污染答案", () => {
  const librarySections = [
    { title: "什么是 Agent", source: "面试知识库-通用面试问题.md", archive: false, content: "目标、状态、工具和受控执行。" },
    { title: "Prompt Agent", source: "面试知识库-通用面试问题.md", archive: true, content: "通用逐字稿。" },
    { title: "会话经营 Agent", source: "面试知识库-旅游智能营销.md", archive: false, content: "旅游项目资料。" },
  ];
  const materials = selectAnswerMaterials({ scope: "general", sections: librarySections });
  assert.deepEqual(materials.map((item) => item.title), ["什么是 Agent"]);
});

test("当前飞书版本优先于同一资料库中的历史快照", () => {
  const librarySections = [
    { title: "问题：如何搭建评测体系", source: "面试知识库-通用面试问题.md", archive: false, content: "当前原文：收集正常案例、错误案例和边界案例。" },
    { title: "如何搭建评测体系", source: "面试知识库-通用面试问题.md", archive: true, content: "历史快照：收集 Good Case 和 Bad Case。" },
  ];
  const materials = selectAnswerMaterials({ scope: "general", query: "如何搭建评测体系", sections: librarySections });
  assert.deepEqual(materials.map((item) => item.content), ["当前原文：收集正常案例、错误案例和边界案例。"]);
});

test("通用题与原文问题标题明确对应时，保留该条逐字稿作为直接证据", () => {
  const librarySections = [
    { title: "线索评分", source: "AI产品经理术语表.md", archive: false, content: "线索优先级。" },
    { title: "你的评分规则怎么制定的？", source: "面试知识库-通用面试问题.md", archive: true, content: "定维度、配权重、做回测，85 分为直接发布线。" },
    { title: "Prompt Agent", source: "面试知识库-通用面试问题.md", archive: true, content: "通用逐字稿。" },
  ];
  const materials = selectAnswerMaterials({ scope: "general", query: "你的评分规则怎么制定的？", sections: librarySections });
  assert.deepEqual(materials.map((item) => item.title), ["你的评分规则怎么制定的？"]);
});

test("Rubric 的英文问法命中写好的评分规则逐字稿", () => {
  const librarySections = [
    { title: "项目背景", source: "面试知识库-面试口述与复盘原文.md", archive: false, content: "当前飞书正文。" },
    { title: "如何搭建评测体系", source: "面试知识库-通用面试问题.md", archive: false, content: "通用评测方法。" },
    { title: "你的评分规则怎么制定的？", source: "面试知识库-面试口述与复盘原文.md", archive: true, content: "项目评分分三层：品牌表现、内容诊断和平台能力。" },
  ];
  const materials = selectAnswerMaterials({ scope: "general", query: "你们的 Rubric 是怎么制定的？", sections: librarySections });
  assert.deepEqual(materials.map((item) => item.title), ["如何搭建评测体系", "你的评分规则怎么制定的？"]);
});

test("当前飞书已有同题术语答案时，历史逐字稿不再参与自动回答", () => {
  const librarySections = [
    { title: "什么是 Agent", source: "面试知识库-通用面试问题.md", archive: false, content: "通用整理答案。" },
    { title: "Agent 是什么？", source: "面试知识库-通用面试问题.md", archive: true, content: "原文逐字稿答案。" },
    { title: "会话经营 Agent", source: "面试知识库-旅游智能营销.md", archive: true, content: "旅游项目逐字稿。" },
  ];
  const materials = selectAnswerMaterials({ scope: "general", query: "Agent 是什么？", sections: librarySections });
  assert.deepEqual(materials.map((item) => item.title), ["什么是 Agent"]);
});

test("项目题也只使用当前飞书版本，历史项目介绍仅供人工追溯", () => {
  const librarySections = [
    { title: "项目背景", source: "面试知识库-GEO品牌增长平台.md", archive: false, content: "当前飞书：解决品牌在 AI 搜索中不可见的问题。" },
    { title: "请介绍一下 GEO 项目", source: "面试知识库-GEO品牌增长平台.md", archive: true, content: "历史快照：过期的项目介绍。" },
  ];
  const materials = selectAnswerMaterials({ scope: "project", query: "请介绍一下 GEO 项目", sections: librarySections });
  assert.deepEqual(materials.map((item) => item.content), ["当前飞书：解决品牌在 AI 搜索中不可见的问题。"]);
});

test("项目技术题命中明确的历史逐字原文时，保留该答案而不丢失", () => {
  const librarySections = [
    { title: "技术选型", source: "面试知识库-旅游智能营销.md", archive: false, content: "当前飞书正文。" },
    { title: "RAG 在这个项目里起什么作用，知识链路怎么设计", source: "面试知识库-旅游智能营销.md", archive: true, content: "原文回答：先检索再生成。" },
  ];
  const materials = selectAnswerMaterials({ scope: "project", query: "RAG 在这个项目里起什么作用，知识链路怎么设计？", sections: librarySections });
  assert.equal(materials.some((item) => item.title.startsWith("RAG 在这个项目里起什么作用")), true);
});

test("项目技术概览也可使用标题明确的历史 RAG 与 Agent 逐字答案", () => {
  const librarySections = [
    { title: "技术选型", source: "面试知识库-旅游智能营销.md", archive: false, content: "当前飞书正文。" },
    { title: "RAG 在这个项目里起什么作用", source: "面试知识库-旅游智能营销.md", archive: true, content: "原文 RAG 答案。" },
    { title: "Agent、Skill 和工具边界怎么划分", source: "面试知识库-旅游智能营销.md", archive: true, content: "原文 Agent 答案。" },
  ];
  const materials = selectAnswerMaterials({ scope: "project", query: "旅游智能营销项目用了什么 AI 技术？", sections: librarySections });
  assert.deepEqual(materials.map((item) => item.title), ["技术选型", "RAG 在这个项目里起什么作用", "Agent、Skill 和工具边界怎么划分"]);
});

test("明确询问候选人经历时才允许使用个人经历", () => {
  const scope = classifyAnswerScope("介绍一下你做过的项目", { answerMode: "auto" });
  const materials = selectAnswerMaterials({ scope, sections });
  assert.equal(scope, "experience");
  assert.equal(materials.some((item) => item.title === "自我介绍"), true);
});

test("询问我自己的 Coding 项目和 Skill 时按个人经历检索，不能退化成通用术语题", () => {
  const codingProfile = { title: "个人能力", project: "自我介绍", source: "面试口述原文.md", content: "我的优势是 Vibe Coding 能力，我会使用 Codex 和 Claude Code 完成原型开发。" };
  const genericSkill = { title: "Skill 怎么设计", project: "通用方法论", source: "面试知识库-通用面试问题.md", content: "Skill 用于封装稳定能力。" };
  const scope = classifyAnswerScope("我自己 Coding 的项目，Skill 怎么写的？");
  const materials = selectAnswerMaterials({ scope, query: "我自己 Coding 的项目，Skill 怎么写的？", sections: [codingProfile, genericSkill] });

  assert.equal(scope, "experience");
  assert.deepEqual(materials.map((item) => item.title), ["个人能力"]);
});

test("泛问候选人的项目概览属于经历题，保留两个项目的概览资料", () => {
  const scope = classifyAnswerScope("讲一下你的项目");
  const materials = selectAnswerMaterials({ scope, sections });
  assert.equal(scope, "experience");
  assert.equal(materials.some((item) => item.title === "自我介绍"), true);
});

test("自我介绍一下必须识别为候选人经历题", () => {
  const scope = classifyAnswerScope("自我介绍一下", { answerMode: "auto" });
  const materials = selectAnswerMaterials({ scope, sections });
  assert.equal(scope, "experience");
  assert.equal(materials.some((item) => item.title === "自我介绍"), true);
});

test("带上下文前缀的自我介绍不能被上一项目的追问状态覆盖", () => {
  const scope = classifyAnswerScope("刚才你先做一下自我介绍", { isFollowUp: true, projectSource: "context" });
  assert.equal(scope, "experience");
});

test("口语化的“给我介绍一下”在过滤资料前识别为候选人经历题", () => {
  const scope = classifyAnswerScope("给我介绍一下");
  assert.equal(scope, "experience");
  assert.equal(selectAnswerMaterials({ scope, sections }).some((item) => item.title === "自我介绍"), true);
});

test("带完整问法的自我介绍标题仍被视为个人经历资料", () => {
  const materials = selectAnswerMaterials({ scope: "general", sections: [{ title: "请做一下自我介绍（核心优势）", content: "真实经历" }] });
  assert.equal(materials.length, 0);
});

test("“你会怎么做 RAG 系统”是通用问题，不因提问语气中的“你”带入经历", () => {
  assert.equal(classifyAnswerScope("你会怎么做 RAG 系统"), "general");
  assert.equal(shouldUsePersonalContext(classifyAnswerScope("你会怎么做 RAG 系统")), false);
});

test("外部产品交互题不借用 AI 知识库或候选人项目", () => {
  const scope = classifyAnswerScope("为什么微信朋友圈点赞要多这一步，不同入口为什么不一样？");
  assert.equal(scope, "product");
  assert.deepEqual(selectAnswerMaterials({ scope, sections }), []);
  assert.equal(shouldUsePersonalContext(scope), false);
});

test("口语化的外部产品体验题不因产品名不在词表而退化成资料不足", () => {
  const scope = classifyAnswerScope("你有没有用过 wokebody 这个产品呢？这个产品它的好处是什么？");
  assert.equal(scope, "product");
  assert.deepEqual(selectAnswerMaterials({ scope, sections }), []);
});

test("点名 AI 模型的产品认知题不把术语表作为资料答案", () => {
  const scope = classifyAnswerScope("你了解 Kimi K3 吗？它有什么特点？");
  assert.equal(scope, "product");
  const materials = selectAnswerMaterials({ scope, sections: [
    { title: "Kimi K3", source: "AI产品经理术语表.md", content: "Kimi K3 的产品资料" },
    { title: "GEO 项目", source: "面试知识库-GEO品牌增长平台.md", content: "项目资料" },
  ] });
  assert.deepEqual(materials, []);
});

test("AI 趋势题不会从术语表取资料答案", () => {
  const scope = classifyAnswerScope("你最近关注什么 AI 趋势，或者有什么新模型？");
  assert.equal(scope, "general");
  const materials = selectAnswerMaterials({ scope, query: "你最近关注什么 AI 趋势，或者有什么新模型？", sections: [
    { title: "你最近关注什么 AI 趋势，或者新发布了什么模型？", source: "AI产品经理术语表.md", content: "我最近关注 Kimi K3。" },
    { title: "AI 产品经理需要掌握哪些技术知识？", source: "AI产品经理术语表.md", content: "大模型、RAG、Agent。" },
  ] });
  assert.deepEqual(materials, []);
});

test("经历问题自动保留相关项目资料，但不把回答 Skill 当知识库检索", () => {
  const experienceSections = [
    { title: "自我介绍", content: "我做过 GEO。", project: "自我介绍", sourceType: "knowledge" },
    { title: "RAG 方案", content: "在 GEO 项目中负责 RAG 召回和评测。", project: "GEO", sourceType: "knowledge" },
    { title: "回答原则", content: "这是回答 Skill，不是候选人事实。", project: "回答 Skill", sourceType: "skill" },
  ];
  const scope = classifyAnswerScope("你的项目里 RAG 怎么做的");
  const materials = selectAnswerMaterials({ scope, sections: experienceSections });
  assert.deepEqual(materials.map((item) => item.title), ["自我介绍", "RAG 方案"]);
});

test("项目题和追问不把标题为自我介绍的章节当作项目资料", () => {
  const mixedSections = [
    { title: "自我介绍", content: "我有五年产品经验。", project: "GEO", sourceType: "knowledge" },
    { title: "项目方案", content: "通过采集、诊断和优化闭环解决问题。", project: "GEO", sourceType: "knowledge" },
  ];
  for (const scope of ["project", "followup"]) {
    assert.deepEqual(selectAnswerMaterials({ scope, sections: mixedSections }).map((item) => item.title), ["项目方案"]);
  }
});

test("旧的手动回答方式不会覆盖自动判断", () => {
  assert.equal(classifyAnswerScope("自我介绍一下", { answerMode: "general" }), "experience");
  assert.equal(classifyAnswerScope("如果从零做一个 AIGC 项目怎么开始", { answerMode: "experience" }), "general");
});

test("页面按回答范围选择资料，并只在允许时发送个人背景", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(app, /classifyAnswerScope\(normalizedQuery/);
  assert.match(app, /selectAnswerMaterials\(\{ scope, sections: scoped\.sections, query: normalizedQuery \}\)/);
  assert.match(app, /shouldUsePersonalContext\(scope\) \? selectPersonalContext/);
  assert.match(app, /filter\(\(doc\) => doc\.type !== "skill" && doc\.type !== "converter-skill"\)/);
  assert.doesNotMatch(html, /id="answerModeSelect"/);
  assert.doesNotMatch(app, /interview\.answerMode/);
});

test("服务端回答范围优先于上传 Skill，通用题不得被 Skill 改成个人经历", async () => {
  const [server, rules] = await Promise.all([
    readFile(new URL("../server.js", import.meta.url), "utf8"),
    readFile(new URL("../assets/AI产品经理回答规则.md", import.meta.url), "utf8"),
  ]);
  assert.match(server, /answerRules\.markdown/);
  assert.match(server, /回答范围优先级最高/);
  assert.match(server, /回答 Skill 只能规定表达结构/);
  assert.match(server, /AI 产品经理/);
  assert.match(server, /外部产品分析/);
  assert.match(rules, /回答范围优先级最高/);
  assert.match(rules, /回答 Skill 只能规定表达结构/);
  assert.match(rules, /AI 产品经理/);
});

test("外部产品体验题以使用者视角直接分析，不能回复没有使用经验", async () => {
  const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
  assert.match(server, /外部产品体验题/);
  assert.match(server, /使用者视角/);
  assert.match(server, /不得以“没有直接使用经验”/);
});

test("服务端不可变策略约束通用题的表达、评测与高风险边界", async () => {
  const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
  assert.match(server, /可以、建议、我会/);
  assert.match(server, /移除项目、公司、人物和指标归属/);
  assert.match(server, /离线评测/);
  assert.match(server, /线上指标/);
  assert.match(server, /权威数据/);
  assert.match(server, /规则、模型与人工的分工/);
  assert.match(server, /低置信度/);
  assert.match(server, /拒答/);
  assert.match(server, /人工接管/);
  assert.match(server, /审计/);
});

test("项目技术题先回答实际 AI 技术，而不是把业务闭环当技术栈", async () => {
  const [server, rules] = await Promise.all([
    readFile(new URL("../server.js", import.meta.url), "utf8"),
    readFile(new URL("../assets/AI产品经理回答规则.md", import.meta.url), "utf8"),
  ]);
  assert.match(server, /项目技术题/);
  assert.match(server, /题目与当前项目资料共同确认/);
  assert.match(server, /不要把“监测—诊断—优化—验证”这类业务闭环当作技术栈/);
  assert.match(server, /技术栈是什么/);
  assert.match(rules, /项目技术题/);
  assert.match(rules, /题目与当前项目资料共同确认/);
  assert.match(rules, /不能当作技术栈/);
});

test("项目技术栈问法会为本地检索补充 AI 技术锚点", async () => {
  const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
  assert.match(server, /用了什么技术/);
  assert.match(server, /技术栈|技术架构/);
  assert.match(server, /Agent RAG Workflow 模型调用 规则引擎 混合召回 向量检索 评测 人工审核/);
});

test("回答规则不把通用题固定绑定到项目、模型或技术方案", async () => {
  const [server, rules] = await Promise.all([
    readFile(new URL("../server.js", import.meta.url), "utf8"),
    readFile(new URL("../assets/AI产品经理回答规则.md", import.meta.url), "utf8"),
  ]);
  assert.match(server, /不能预设具体项目、模型、产品或技术方案/);
  assert.match(rules, /具体内容只由题目范围和命中原文决定/);
  assert.match(rules, /默认用 3—5 个短段落/);
  assert.match(rules, /场景、做法和技术合在同一段/);
});

test("命中原文时优先原文，未命中时才按题型选择回答入口", async () => {
  const [server, rules] = await Promise.all([
    readFile(new URL("../server.js", import.meta.url), "utf8"),
    readFile(new URL("../assets/AI产品经理回答规则.md", import.meta.url), "utf8"),
  ]);
  assert.match(server, /命中原文逐字稿时优先沿用原文/);
  assert.match(server, /未命中原文时才按题型选择回答入口/);
  assert.match(rules, /命中原文时，优先使用原文/);
  assert.match(rules, /未命中原文时，才按题型选择入口/);
  assert.match(rules, /概念、术语、参数或简单事实题/);
});

test("生成策略区分原文直答、资料整合和通用兜底，不能让通用模板覆盖资料", async () => {
  const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
  assert.match(server, /原文直答/);
  assert.match(server, /资料整合/);
  assert.match(server, /通用兜底/);
  assert.match(server, /不得用通用模板覆盖命中的原文/);
});

test("给定场景的开放题先从用户背景与痛点进入产品方案", async () => {
  const rules = await readFile(new URL("../assets/AI产品经理回答规则.md", import.meta.url), "utf8");
  assert.match(rules, /给定业务场景的开放题/);
  assert.match(rules, /用户背景、具体场景与未被满足的痛点/);
  assert.match(rules, /产品目标、方案和验证方式/);
  assert.match(rules, /不从技术名词或功能清单开场/);
  assert.match(rules, /不适用于术语定义、项目技术追问或已有明确原文的具体做法/);
});

test("通用 AI 题用可执行建议表达，不把方法论说成候选人项目经历", async () => {
  const rules = await readFile(new URL("../assets/AI产品经理回答规则.md", import.meta.url), "utf8");
  assert.match(rules, /可以[、，]建议[、，]我会/);
  assert.match(rules, /不得写成候选人的项目经历/);
});

test("AI 趋势题要求先讲具体近期产品，而不是技术知识清单", async () => {
  const rules = await readFile(new URL("../assets/AI产品经理回答规则.md", import.meta.url), "utf8");
  assert.match(rules, /最近关注什么 AI 趋势/);
  assert.match(rules, /具体产品/);
  assert.match(rules, /技术知识清单/);
  assert.match(rules, /题目或命中资料明确的具体产品/);
  assert.doesNotMatch(rules, /当前优先使用已维护资料中的 Kimi K3/);
});

test("通用 AI 题包含评测闭环，且区分离线评测与线上指标", async () => {
  const rules = await readFile(new URL("../assets/AI产品经理回答规则.md", import.meta.url), "utf8");
  assert.match(rules, /评测集/);
  assert.match(rules, /Badcase/);
  assert.match(rules, /离线评测/);
  assert.match(rules, /线上指标/);
});

test("高风险通用题明确权威来源、人工接管和审计边界", async () => {
  const rules = await readFile(new URL("../assets/AI产品经理回答规则.md", import.meta.url), "utf8");
  assert.match(rules, /权威数据/);
  assert.match(rules, /规则、模型与人工的分工/);
  assert.match(rules, /低置信度/);
  assert.match(rules, /拒答/);
  assert.match(rules, /人工接管/);
  assert.match(rules, /审计/);
});

test("生成指令只输出可直接口述的答案，不强制结论或分析面试官", async () => {
  const [server, rules] = await Promise.all([
    readFile(new URL("../server.js", import.meta.url), "utf8"),
    readFile(new URL("../assets/AI产品经理回答规则.md", import.meta.url), "utf8"),
  ]);
  assert.match(server, /只输出候选人可以直接说出口的答案/);
  assert.doesNotMatch(server, /先输出一行“结论”/);
  assert.match(rules, /不解释面试官考察点/);
  assert.doesNotMatch(rules, /必须先给一句可立即开口的结论/);
});

test("生成指令禁止把题意复述、面试官考察点或回答过程说给面试官听", async () => {
  const [server, rules] = await Promise.all([
    readFile(new URL("../server.js", import.meta.url), "utf8"),
    readFile(new URL("../assets/AI产品经理回答规则.md", import.meta.url), "utf8"),
  ]);
  assert.match(server, /不要复述、改写或确认题意/);
  assert.match(server, /不要揣测或解释面试官考察点/);
  assert.match(server, /我会这样组织我的理解/);
  assert.match(server, /我理解您指的是/);
  assert.match(server, /如果你问的是/);
  assert.match(rules, /不复述、改写或确认题意/);
  assert.match(rules, /不解释面试官考察点/);
  assert.match(rules, /我理解您指的是/);
});

test("LLM 首次使用纯英文术语时附上中文解释", async () => {
  const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
  assert.match(server, /首次出现的纯英文术语、缩写或英文短语/);
  assert.match(server, /紧跟中文解释/);
  assert.match(server, /RAG（检索增强生成）/);
});

test("未知英文定义题不会被编造成模型、架构或缩写", async () => {
  const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
  assert.match(server, /单个英文词或疑似语音转写/);
  assert.match(server, /不得编造它是某个模型、架构、产品或缩写/);
  assert.match(server, /不得虚构英文全称/);
  assert.match(server, /Loop 表示循环/);
});

test("提交检索后以归一化后的问题显示和保存当前题", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /const displayQuery = normalizedQuery \|\| cleanQuery/);
  assert.match(app, /\$\("transcriptText"\)\.textContent = displayQuery/);
  assert.match(app, /beginQuestion\(answerState, displayQuery,/);
});

test("LLM 只参考按题型路由后的资料，原文逐字稿不会全局覆盖通用题", async () => {
  const [server, app] = await Promise.all([
    readFile(new URL("../server.js", import.meta.url), "utf8"),
    readFile(new URL("../app.js", import.meta.url), "utf8"),
  ]);
  assert.match(app, /selectAnswerMaterials\(\{ scope, sections: scoped\.sections, query: normalizedQuery \}\)/);
  assert.match(server, /只参考当前问题命中的资料/);
  assert.match(server, /通用题按通用资料回答/);
  assert.match(server, /项目题按对应项目资料回答/);
  assert.match(server, /无关原文覆盖当前题/);
});

test("候选人主动开始介绍项目时，生成指令直接续写而不反问", async () => {
  const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
  assert.match(server, /候选人开始介绍项目的口语开场/);
  assert.match(server, /直接续写完整项目回答/);
  assert.match(server, /不要向候选人提问/);
});

test("LLM 回答使用紧凑的专用正文样式，不继承资料卡片的大段距", async () => {
  const [app, config] = await Promise.all([
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../config.css", import.meta.url), "utf8"),
  ]);
  assert.match(app, /class="answer-body"/);
  assert.match(config, /\.ai-result \.answer-body/);
});

test("LLM 卡片只保留回答正文，不重复显示额外标题", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const renderer = app.slice(app.indexOf("async function generateAnswer"), app.indexOf("function setupSpeech"));
  assert.match(renderer, /<article class="ai-result"><div class="answer-body">/);
  assert.doesNotMatch(renderer, /AI GENERATED/);
  assert.doesNotMatch(renderer, /<h3>回答<\/h3>/);
});
