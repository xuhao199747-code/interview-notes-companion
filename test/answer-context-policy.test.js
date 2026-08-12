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
    { title: "什么是 Agent", source: "面试知识库-AI产品通用能力.md", archive: false, content: "目标、状态、工具和受控执行。" },
    { title: "Prompt Agent", source: "面试知识库-AI产品通用能力.md", archive: true, content: "GEO 项目逐字稿。" },
    { title: "会话经营 Agent", source: "面试知识库-旅游智能营销.md", archive: false, content: "旅游项目资料。" },
  ];
  const materials = selectAnswerMaterials({ scope: "general", sections: librarySections });
  assert.deepEqual(materials.map((item) => item.title), ["什么是 Agent"]);
});

test("通用题与原文问题标题明确对应时，保留该条逐字稿作为直接证据", () => {
  const librarySections = [
    { title: "线索评分", source: "AI产品经理术语表.md", archive: false, content: "线索优先级。" },
    { title: "你的评分规则怎么制定的？", source: "面试知识库-AI产品通用能力.md", archive: true, content: "定维度、配权重、做回测，85 分为直接发布线。" },
    { title: "Prompt Agent", source: "面试知识库-AI产品通用能力.md", archive: true, content: "GEO 项目逐字稿。" },
  ];
  const materials = selectAnswerMaterials({ scope: "general", query: "你的评分规则怎么制定的？", sections: librarySections });
  assert.deepEqual(materials.map((item) => item.title), ["线索评分", "你的评分规则怎么制定的？"]);
});

test("原文里已有技术术语问答时，通用技术题也优先保留该原文", () => {
  const librarySections = [
    { title: "什么是 Agent", source: "面试知识库-AI产品通用能力.md", archive: false, content: "通用整理答案。" },
    { title: "Agent 是什么？", source: "面试知识库-AI产品通用能力.md", archive: true, content: "原文逐字稿答案。" },
    { title: "会话经营 Agent", source: "面试知识库-旅游智能营销.md", archive: true, content: "旅游项目逐字稿。" },
  ];
  const materials = selectAnswerMaterials({ scope: "general", query: "Agent 是什么？", sections: librarySections });
  assert.deepEqual(materials.map((item) => item.title), ["什么是 Agent", "Agent 是什么？"]);
});

test("明确询问候选人经历时才允许使用个人经历", () => {
  const scope = classifyAnswerScope("介绍一下你做过的项目", { answerMode: "auto" });
  const materials = selectAnswerMaterials({ scope, sections });
  assert.equal(scope, "experience");
  assert.equal(materials.some((item) => item.title === "自我介绍"), true);
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

test("点名 AI 模型的产品认知题进入产品分析，不退化为参数方法论", () => {
  const scope = classifyAnswerScope("你了解 Kimi K3 吗？它有什么特点？");
  assert.equal(scope, "product");
  const materials = selectAnswerMaterials({ scope, sections: [
    { title: "Kimi K3", source: "AI产品经理术语表.md", content: "Kimi K3 的产品资料" },
    { title: "GEO 项目", source: "面试知识库-GEO品牌增长平台.md", content: "项目资料" },
  ] });
  assert.deepEqual(materials.map((item) => item.title), ["Kimi K3"]);
});

test("AI 趋势题优先使用具体近期产品资料，不退化成技术清单", () => {
  const scope = classifyAnswerScope("你最近关注什么 AI 趋势，或者有什么新模型？");
  assert.equal(scope, "general");
  const materials = selectAnswerMaterials({ scope, query: "你最近关注什么 AI 趋势，或者有什么新模型？", sections: [
    { title: "你最近关注什么 AI 趋势，或者新发布了什么模型？", source: "AI产品经理术语表.md", content: "我最近关注 Kimi K3。" },
    { title: "AI 产品经理需要掌握哪些技术知识？", source: "AI产品经理术语表.md", content: "大模型、RAG、Agent。" },
  ] });
  assert.deepEqual(materials.map((item) => item.title), ["你最近关注什么 AI 趋势，或者新发布了什么模型？"]);
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
  assert.match(app, /selectAnswerMaterials\(\{ scope, sections: candidateSections, query: normalizedQuery \}\)/);
  assert.match(app, /shouldUsePersonalContext\(scope\) \? selectPersonalContext/);
  assert.match(app, /filter\(\(doc\) => doc\.type !== "skill"\)/);
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
  assert.match(server, /Agent、RAG、Workflow/);
  assert.match(server, /不要把“监测—诊断—优化—验证”这类业务闭环当作技术栈/);
  assert.match(server, /技术栈是什么/);
  assert.match(rules, /项目技术题/);
  assert.match(rules, /Agent、RAG、Workflow/);
  assert.match(rules, /不能当作技术栈/);
});

test("项目技术栈问法会为本地检索补充 AI 技术锚点", async () => {
  const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
  assert.match(server, /用了什么技术/);
  assert.match(server, /技术栈|技术架构/);
  assert.match(server, /Agent RAG Workflow 模型调用 规则引擎 混合召回 向量检索 评测 人工审核/);
});

test("通用 AI 题用可执行建议表达，不把方法论说成候选人项目经历", async () => {
  const rules = await readFile(new URL("../assets/AI产品经理回答规则.md", import.meta.url), "utf8");
  assert.match(rules, /可以[、，]建议[、，]我会/);
  assert.match(rules, /不得写成候选人的项目经历/);
});

test("AI 趋势题要求先讲具体近期产品，而不是技术知识清单", async () => {
  const rules = await readFile(new URL("../assets/AI产品经理回答规则.md", import.meta.url), "utf8");
  assert.match(rules, /最近关注什么 AI 趋势/);
  assert.match(rules, /具体近期产品或模型/);
  assert.match(rules, /Kimi K3/);
  assert.match(rules, /Hailuo 2\.3/);
  assert.match(rules, /技术知识清单/);
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
  assert.match(server, /不要复述题意/);
  assert.match(server, /不要揣测或解释面试官考察点/);
  assert.match(server, /我会这样组织我的理解/);
  assert.match(rules, /不复述题意/);
  assert.match(rules, /不解释面试官考察点/);
});

test("LLM 首次使用纯英文术语时附上中文解释", async () => {
  const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
  assert.match(server, /首次出现的纯英文术语、缩写或英文短语/);
  assert.match(server, /紧跟中文解释/);
  assert.match(server, /RAG（检索增强生成）/);
});

test("LLM 只参考按题型路由后的资料，原文逐字稿不会全局覆盖通用题", async () => {
  const [server, app] = await Promise.all([
    readFile(new URL("../server.js", import.meta.url), "utf8"),
    readFile(new URL("../app.js", import.meta.url), "utf8"),
  ]);
  assert.match(app, /selectAnswerMaterials\(\{ scope, sections: candidateSections, query: normalizedQuery \}\)/);
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
