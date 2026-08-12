import assert from "node:assert/strict";
import test from "node:test";
import { defaultGlossary, normalizeQuestion, parseGlossaryMarkdown, renderGlossaryUploadState } from "../src/glossary.js";

test("术语别名在检索前归一化为标准 AI 产品术语", () => {
  const glossary = [...defaultGlossary, { term: "RAG", aliases: ["IG", "检索增强", "知识库问答"] }];
  assert.equal(normalizeQuestion("你们 IG 怎么做", glossary), "你们 RAG 怎么做");
  assert.equal(normalizeQuestion("知识库问答是怎么搭的", glossary), "RAG是怎么搭的");
});

test("默认词表覆盖核心 AI 产品术语及常见口语别名", () => {
  assert.equal(normalizeQuestion("扣子怎么搭", defaultGlossary), "Coze怎么搭");
  assert.equal(normalizeQuestion("知识库问答怎么评测", defaultGlossary), "RAG怎么AI 产品评测");
  assert.equal(normalizeQuestion("智能体和工作流怎么选", defaultGlossary), "Agent和Workflow怎么选");
  assert.equal(normalizeQuestion("工具调用的边界", defaultGlossary), "Tool的边界");
  assert.equal(normalizeQuestion("提示词技能怎么沉淀", defaultGlossary), "Skill怎么沉淀");
  assert.equal(normalizeQuestion("坏案例怎么回归", defaultGlossary), "AI 产品评测怎么回归");
  assert.equal(normalizeQuestion("人工兜底怎么设计", defaultGlossary), "高风险场景怎么设计");
});

test("词表覆盖评测、GEO 与旅游智能营销的高频口语问法", () => {
  assert.equal(normalizeQuestion("金标集怎么写", defaultGlossary), "Golden Set怎么写");
  assert.equal(normalizeQuestion("LLM 裁判怎么做", defaultGlossary), "LLM-as-a-Judge怎么做");
  assert.equal(normalizeQuestion("AI 概览怎么监测", defaultGlossary), "AI Overviews怎么监测");
  assert.equal(normalizeQuestion("品牌被引用率怎么评估", defaultGlossary), "引用率怎么AI 产品评测");
  assert.equal(normalizeQuestion("客户数据平台怎么接入", defaultGlossary), "CDP怎么接入");
  assert.equal(normalizeQuestion("在线旅游平台怎么做分发", defaultGlossary), "OTA怎么做分发");
});

test("词表覆盖 GEO 情感分析和旅游成交链路的项目专有口语", () => {
  assert.equal(normalizeQuestion("品牌口碑舆情怎么分析", defaultGlossary), "情感分析怎么分析");
  assert.equal(normalizeQuestion("AI 说品牌是正面的怎么统计", defaultGlossary), "AI 表达倾向怎么统计");
  assert.equal(normalizeQuestion("品牌总可见度怎么算", defaultGlossary), "Visibility Score怎么算");
  assert.equal(normalizeQuestion("游客需求卡怎么维护", defaultGlossary), "动态需求摘要怎么维护");
  assert.equal(normalizeQuestion("怎么判断旅游客户购买意图", defaultGlossary), "怎么判断动态购买意图识别");
  assert.equal(normalizeQuestion("怎么把客户引到企微", defaultGlossary), "怎么公转私");
  assert.equal(normalizeQuestion("旅游套餐怎么匹配", defaultGlossary), "标准套餐检索与比较");
});

test("术语表以统一结构维护核心概念及其别名", async () => {
  const { readFile } = await import("node:fs/promises");
  const markdown = await readFile(new URL("../AI产品经理术语表.md", import.meta.url), "utf8");
  const entries = parseGlossaryMarkdown(markdown);
  const expectedAliases = {
    Coze: ["扣子", "字节扣子", "Coze 平台"],
    RAG: ["检索增强生成", "检索增强", "知识库问答", "向量检索"],
    Agent: ["智能体", "多智能体", "代理"],
    Workflow: ["工作流", "固定流程", "编排流程"],
    Skill: ["技能", "提示词技能", "回答规则"],
    Tool: ["工具调用", "函数调用", "Function Calling"],
    "AI 产品评测": ["评测", "评估", "测试集", "效果评估"],
    "高风险场景": ["人工兜底", "人工接管", "安全护栏"],
  };

  for (const [term, aliases] of Object.entries(expectedAliases)) {
    const entry = entries.find((item) => item.term === term);
    assert.ok(entry, `缺少术语：${term}`);
    for (const alias of aliases) assert.ok(entry.aliases.includes(alias), `${term} 缺少别名：${alias}`);
  }

  for (const section of ["一句话定义", "解决什么业务问题", "核心组成或实现链路", "适用场景", "不适用场景或局限", "面试时可直接口述的 1 分钟回答", "区别和关系"]) {
    assert.match(markdown, new RegExp(`### ${section}`));
  }
});

test("每个核心术语独立具备完整结构且不冒充个人经历", async () => {
  const { readFile } = await import("node:fs/promises");
  const markdown = await readFile(new URL("../AI产品经理术语表.md", import.meta.url), "utf8");
  const requiredSections = ["一句话定义", "解决什么业务问题", "核心组成或实现链路", "适用场景", "不适用场景或局限", "面试时可直接口述的 1 分钟回答", "区别和关系"];
  const terms = ["Coze", "RAG", "Agent", "Workflow", "Skill", "Tool", "AI 产品评测", "高风险场景"];

  for (const term of terms) {
    const start = markdown.indexOf(`## ${term}\n`);
    assert.notEqual(start, -1, `缺少术语：${term}`);
    const next = markdown.indexOf("\n## ", start + 1);
    const entry = markdown.slice(start, next === -1 ? undefined : next);
    for (const section of requiredSections) assert.match(entry, new RegExp(`### ${section}`), `${term} 缺少结构：${section}`);
  }

  for (const prohibitedPhrase of ["我做过", "我负责过", "我们上线后"]) {
    assert.doesNotMatch(markdown, new RegExp(prohibitedPhrase));
  }
});

test("未配置别名的问题保持原样", () => {
  assert.equal(normalizeQuestion("介绍一下你的项目", []), "介绍一下你的项目");
});

test("AI 产品经理高频术语的 ASR 误识别始终会被纠正", () => {
  assert.equal(normalizeQuestion("你会怎么做 AIG 系统", []), "你会怎么做 RAG 系统");
  assert.equal(normalizeQuestion("你会怎么做 IG 系统", []), "你会怎么做 RAG 系统");
  assert.equal(normalizeQuestion("你会怎么做 RH 系统", []), "你会怎么做 RAG 系统");
  assert.equal(normalizeQuestion("你会怎么做 R H 系统", []), "你会怎么做 RAG 系统");
  assert.equal(normalizeQuestion("你会怎么做阿瑞吉系统", []), "你会怎么做RAG系统");
  assert.equal(normalizeQuestion("扣字怎么搭", []), "Coze怎么搭");
  assert.equal(normalizeQuestion("介绍一下 CEO 项目的指标", []), "介绍一下 GEO 项目的指标");
  assert.equal(normalizeQuestion("请介绍一下 GU 这个项目", []), "请介绍一下 GEO 这个项目");
  assert.equal(normalizeQuestion("你在刺幽这个项目中是怎么做的", []), "你在GEO这个项目中是怎么做的");
  assert.equal(normalizeQuestion("请介绍一下最优这个项目", []), "请介绍一下GEO这个项目");
  assert.equal(normalizeQuestion("最优方案怎么选", []), "最优方案怎么选");
  assert.equal(normalizeQuestion("怎么做 AIGC 产品", []), "怎么做 AIGC 产品");
});

test("常见 AI 编程工具名的语音误识别会在检索前还原", () => {
  assert.equal(normalizeQuestion("你用 COSER 做过什么", []), "你用 Cursor 做过什么");
  assert.equal(normalizeQuestion("你用 quder 做过什么", []), "你用 Qoder 做过什么");
  assert.equal(normalizeQuestion("Claude 扣得优势是什么", []), "Claude Code优势是什么");
  assert.equal(normalizeQuestion("GitHub Copilot 和哥派勒怎么选", []), "GitHub Copilot 和GitHub Copilot怎么选");
  assert.equal(normalizeQuestion("温室和 Cursor 怎么选", []), "Windsurf和 Cursor 怎么选");
});

test("AI 开发平台、Agent 工具与基础设施的音近名称会还原", () => {
  assert.equal(normalizeQuestion("凯洛怎么做规格驱动开发", []), "Kiro怎么做规格驱动开发");
  assert.equal(normalizeQuestion("戴文能不能自动修 bug", []), "Devin能不能自动修 bug");
  assert.equal(normalizeQuestion("迪飞和扣子怎么选", []), "Dify和扣子怎么选");
  assert.equal(normalizeQuestion("恩8恩怎么编排", []), "n8n怎么编排");
  assert.equal(normalizeQuestion("朗链和朗图的区别", []), "LangChain和LangGraph的区别");
  assert.equal(normalizeQuestion("欧拉马本地部署怎么做", []), "Ollama本地部署怎么做");
  assert.equal(normalizeQuestion("米尔维斯怎么建向量库", []), "Milvus怎么建向量库");
  assert.equal(normalizeQuestion("魔搭和百炼怎么选模型", []), "ModelScope和百炼怎么选模型");
});

test("Codex 的音近、拆读和误拼会还原，但普通代码词不被污染", () => {
  assert.equal(normalizeQuestion("你用 code x 做过什么", []), "你用 Codex 做过什么");
  assert.equal(normalizeQuestion("你用 C O D E X 做过什么", []), "你用 Codex 做过什么");
  assert.equal(normalizeQuestion("你用 kodeks 做过什么", []), "你用 Codex 做过什么");
  assert.equal(normalizeQuestion("可戴克斯怎么做代码审查", []), "Codex怎么做代码审查");
  assert.equal(normalizeQuestion("你觉得扣得 X 和 Claude Code 怎么选", []), "你觉得Codex 和 Claude Code 怎么选");
  assert.equal(normalizeQuestion("代码评审和代码生成怎么做", []), "代码评审和代码生成怎么做");
  assert.equal(normalizeQuestion("写 code 的规范是什么", []), "写 code 的规范是什么");
});

test("Claude Code 的音近、拆读和误拼会独立还原，不和 Codex 混淆", () => {
  assert.equal(normalizeQuestion("你用 Claude 扣得做过什么", []), "你用 Claude Code做过什么");
  assert.equal(normalizeQuestion("你用克劳德 code做过什么", []), "你用Claude Code做过什么");
  assert.equal(normalizeQuestion("Claude C O D E 怎么用", []), "Claude Code 怎么用");
  assert.equal(normalizeQuestion("克劳德扣德和可戴克斯怎么选", []), "Claude Code和Codex怎么选");
});

test("从 Markdown 术语文档读取标准术语与别名", () => {
  const glossary = parseGlossaryMarkdown("# AI 术语表\n\n## RAG\n别名：IG、检索增强、知识库问答\n\n## Agent\n别名：智能体、多智能体");
  assert.deepEqual(glossary, [
    { term: "RAG", aliases: ["IG", "检索增强", "知识库问答"] },
    { term: "Agent", aliases: ["智能体", "多智能体"] },
  ]);
});

test("术语表上传状态只显示文件名和自动应用状态", () => {
  assert.equal(renderGlossaryUploadState("AI产品经理术语表.md"), "AI产品经理术语表.md（已自动应用）");
  assert.equal(renderGlossaryUploadState(), "尚未上传术语表");
});

test("术语表使用独立的上传和删除卡片", async () => {
  const { readFile } = await import("node:fs/promises");
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(html, /id="glossaryCardList"/);
  assert.match(app, /function deleteGlossary\(\)/);
  assert.match(app, /emptyUploadCard\("glossary", "glossaryFileInput"/);
  assert.match(css, /\.delete-glossary/);
  assert.match(app, /function loadPersistedGlossary\(\)/);
  assert.match(app, /\/api\/glossary/);
  assert.match(server, /request\.url === "\/api\/glossary"/);
});
