import assert from "node:assert/strict";
import test from "node:test";
import { defaultGlossary, mergeGlossaryTerms, normalizeQuestion, parseGlossaryMarkdown, renderGlossaryUploadState } from "../src/glossary.js";

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

test("人在回路、模型可靠性和 Agent 工程术语会在检索前归一化", () => {
  assert.equal(normalizeQuestion("HITL 怎么设计", defaultGlossary), "Human-in-the-loop 怎么设计");
  assert.equal(normalizeQuestion("人在回路什么时候介入", defaultGlossary), "Human-in-the-loop什么时候介入");
  assert.equal(normalizeQuestion("怎么处理模型幻觉", defaultGlossary), "怎么处理Hallucination");
  assert.equal(normalizeQuestion("少样本和思维链怎么用", defaultGlossary), "Few-shot和Chain-of-Thought怎么用");
  assert.equal(normalizeQuestion("结构化输出如何校验", defaultGlossary), "Structured Output如何校验");
  assert.equal(normalizeQuestion("模型路由怎么做", defaultGlossary), "Model Routing怎么做");
});

test("完整 AI 产品链路中的检索、Agent、评测与治理术语会归一化", () => {
  assert.equal(normalizeQuestion("稀疏检索和密集检索怎么配", defaultGlossary), "Sparse Retrieval和Dense Retrieval怎么配");
  assert.equal(normalizeQuestion("查询改写和假设文档嵌入怎么用", defaultGlossary), "Query Rewriting和HyDE怎么用");
  assert.equal(normalizeQuestion("规划器和执行器怎么协同", defaultGlossary), "Planner和Executor怎么协同");
  assert.equal(normalizeQuestion("影子流量和灰度发布怎么评估", defaultGlossary), "Shadow Mode和Canary Release怎么AI 产品评测");
  assert.equal(normalizeQuestion("越狱攻击和数据泄露怎么防", defaultGlossary), "Jailbreak和Data Leakage怎么防");
  assert.equal(normalizeQuestion("上下文缓存怎么降低延迟", defaultGlossary), "Context Caching怎么降低Latency");
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

test("完整词库覆盖 AI 产品、工程、模型、评测与多模态的高频术语", async () => {
  const { readFile } = await import("node:fs/promises");
  const markdown = await readFile(new URL("../AI产品经理术语表.md", import.meta.url), "utf8");
  const entries = parseGlossaryMarkdown(markdown);
  const expectedTerms = [
    "Function Calling", "Vector Database", "BM25", "GraphRAG", "RAGAS",
    "A2A", "Computer Use", "Browser Use", "VLM", "ASR", "TTS", "STT",
    "Deep Research", "Agentic Workflow", "MCP Server", "Evals",
  ];
  for (const term of expectedTerms) assert.ok(entries.some((entry) => entry.term === term), `缺少术语：${term}`);
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
  assert.equal(normalizeQuestion("Scale.scale 是什么", []), "Skill 是什么");
  assert.equal(normalizeQuestion("scale scale 怎么设计", []), "Skill 怎么设计");
  assert.equal(normalizeQuestion("scale 是什么意思", []), "Skill 是什么意思");
  assert.equal(normalizeQuestion("scale 和工作流有什么区别", []), "Skill 和工作流有什么区别");
  assert.equal(normalizeQuestion("Scale AI 是什么公司", []), "Scale AI 是什么公司");
  assert.equal(normalizeQuestion("怎么把产品 scale 到十万用户", []), "怎么把产品 scale 到十万用户");
  assert.equal(normalizeQuestion("什么是 Lope？", []), "什么是 Loop？");
  assert.equal(normalizeQuestion("Lope 在 MoE 推理里怎么优化？", []), "Lope 在 MoE 推理里怎么优化？");
  assert.equal(normalizeQuestion("PM25 是什么意思？", []), "BM25 是什么意思？");
  assert.equal(normalizeQuestion("P M 25 怎么和向量检索配合？", []), "BM25 怎么和向量检索配合？");
});

test("字母数字缩写的高风险 ASR 误听会还原为 AI 产品术语", () => {
  assert.equal(normalizeQuestion("L.M.L 是什么意思？", []), "LLM 是什么意思？");
  assert.equal(normalizeQuestion("大语言模型能做什么？", []), "LLM能做什么？");
  assert.equal(normalizeQuestion("P M 2.5 怎么和向量检索配合？", []), "BM25 怎么和向量检索配合？");
  assert.equal(normalizeQuestion("M C P 服务怎么接", []), "MCP Server怎么接");
  assert.equal(normalizeQuestion("A 2 A 协议是什么", []), "A2A 协议是什么");
  assert.equal(normalizeQuestion("RAGAS 怎么做 RAG 评估", []), "RAGAS 怎么做 RAGAS");
  assert.equal(normalizeQuestion("H I T L 怎么设计", []), "Human-in-the-loop 怎么设计");
  assert.equal(normalizeQuestion("瑞格斯怎么评估 RAG", []), "RAGAS怎么评估 RAG");
  assert.equal(normalizeQuestion("恩迪西吉和艾姆阿尔阿尔怎么看", []), "NDCG和MRR怎么看");
  assert.equal(normalizeQuestion("格拉夫 RAG 适合什么问题", []), "GraphRAG 适合什么问题");
});

test("高频 AI 产品与模型术语的拆读、音近转写会在检索前归一化", () => {
  assert.equal(normalizeQuestion("A I G C 产品怎么做", []), "AIGC 产品怎么做");
  assert.equal(normalizeQuestion("萝拉微调和全量微调怎么选", []), "LoRA微调和全量微调怎么选");
  assert.equal(normalizeQuestion("朗福斯怎么做链路观测", []), "Langfuse怎么做链路观测");
  assert.equal(normalizeQuestion("洛布 Chat 和扣子怎么选", []), "LobeChat 和Coze怎么选");
  assert.equal(normalizeQuestion("Open AI 的 Chat G P T 怎么接", []), "OpenAI 的 ChatGPT 怎么接");
  assert.equal(normalizeQuestion("摩伊架构和萝拉微调怎么配合", []), "MoE架构和LoRA微调怎么配合");
  assert.equal(normalizeQuestion("S F T、R L H F 和 D P O 的区别", []), "SFT、RLHF 和 DPO 的区别");
  assert.equal(normalizeQuestion("P G Vector 和欧喷搜索怎么选", []), "pgvector 和OpenSearch怎么选");
  assert.equal(normalizeQuestion("朗史密斯和弗洛维斯怎么用", []), "LangSmith和Flowise怎么用");
});

test("技术名、模型和工具的常见音近转写会还原", () => {
  assert.equal(normalizeQuestion("兰姆链怎么搭 RAG", []), "LangChain怎么搭 RAG");
  assert.equal(normalizeQuestion("兰姆图怎么做 Agent", []), "LangGraph怎么做 Agent");
  assert.equal(normalizeQuestion("米尔维斯和派恩空怎么选", []), "Milvus和Pinecone怎么选");
  assert.equal(normalizeQuestion("卡劳德和吉米尼怎么选", []), "Claude和Gemini怎么选");
  assert.equal(normalizeQuestion("豆包和迪普西克怎么选", []), "豆包和DeepSeek怎么选");
});

test("易错术语不覆盖明确的非 AI 常用词", () => {
  assert.equal(normalizeQuestion("今天 PM2.5 很高吗？", []), "今天 PM2.5 很高吗？");
  assert.equal(normalizeQuestion("MCP 是什么协议？", []), "MCP 是什么协议？");
});

test("新增 AI 工程、多模态和智能体协议术语可由口语问法归一化", () => {
  assert.equal(normalizeQuestion("函数工具调用怎么做", []), "Function Calling怎么做");
  assert.equal(normalizeQuestion("向量数据库怎么选", []), "Vector Database怎么选");
  assert.equal(normalizeQuestion("图检索增强生成适合什么场景", []), "GraphRAG适合什么场景");
  assert.equal(normalizeQuestion("电脑使用 agent 怎么设计", []), "Computer Use 怎么设计");
  assert.equal(normalizeQuestion("语音转文字怎么评测", []), "ASR怎么评测");
  assert.equal(normalizeQuestion("文本转语音怎么做", []), "TTS怎么做");
  assert.equal(normalizeQuestion("智能体对智能体协议", []), "A2A协议");
});

test("深层算法、Agent 协议与开发工具的常见语音误识别会被还原", () => {
  assert.equal(normalizeQuestion("路普 MCP 怎么接入", []), "Loop MCP 怎么接入");
  assert.equal(normalizeQuestion("Deep Sleep 和千问怎么选", []), "DeepSeek 和Qwen怎么选");
  assert.equal(normalizeQuestion("欧喷扣能做什么", []), "OpenClaw能做什么");
  assert.equal(normalizeQuestion("V LLM 怎么提高吞吐", []), "vLLM 怎么提高吞吐");
  assert.equal(normalizeQuestion("自归进化智能体怎么评测", []), "Self-Evolving Agent怎么评测");
  assert.equal(normalizeQuestion("库德兰特和米尔维斯怎么选", []), "Qdrant和Milvus怎么选");
  assert.equal(normalizeQuestion("交叉编码器怎么做重排", []), "Cross-Encoder怎么做Rerank");
});

test("语音重复引导语和夹杂的单字母噪声不会破坏项目概览检索", () => {
  assert.equal(
    normalizeQuestion("请介绍请介绍一下q介绍一下GEO的这个。", []),
    "请介绍一下 GEO 这个项目。",
  );
});

test("核心概念、评测术语和模型名的同音、拆读与重复转写会还原", () => {
  assert.equal(normalizeQuestion("斯给尔和沃克流怎么选", []), "Skill和Workflow怎么选");
  assert.equal(normalizeQuestion("Scale.skill 怎么写", []), "Skill 怎么写");
  assert.equal(normalizeQuestion("安吉特如何调用图尔", []), "Agent如何调用Tool");
  assert.equal(normalizeQuestion("艾姆西皮和瑞艾克特有什么区别", []), "MCP和ReAct有什么区别");
  assert.equal(normalizeQuestion("安贝丁和瑞兰克怎么配合", []), "Embedding和Rerank怎么配合");
  assert.equal(normalizeQuestion("鲁布里克怎么配合特瑞斯定位问题", []), "Rubric怎么配合Trace定位问题");
  assert.equal(normalizeQuestion("迪普西克和Q问怎么选", []), "DeepSeek和Qwen怎么选");
  assert.equal(normalizeQuestion("K 米和杰米奈哪个适合长文本", []), "Kimi和Gemini哪个适合长文本");
  assert.equal(normalizeQuestion("克罗德和吉皮提怎么比较", []), "Claude和GPT怎么比较");
});

test("常见 AI 编程工具名的语音误识别会在检索前还原", () => {
  assert.equal(normalizeQuestion("你用 COSER 做过什么", []), "你用 Cursor 做过什么");
  assert.equal(normalizeQuestion("你用 quder 做过什么", []), "你用 Qoder 做过什么");
  assert.equal(normalizeQuestion("库德儿和沃克巴迪有什么区别", []), "Qoder和Work Buddy有什么区别");
  assert.equal(normalizeQuestion("Claude 扣得优势是什么", []), "Claude Code优势是什么");
  assert.equal(normalizeQuestion("GitHub Copilot 和哥派勒怎么选", []), "GitHub Copilot 和GitHub Copilot怎么选");
  assert.equal(normalizeQuestion("温室和 Cursor 怎么选", []), "Windsurf和 Cursor 怎么选");
});

test("AI 开发平台、Agent 工具与基础设施的音近名称会还原", () => {
  assert.equal(normalizeQuestion("凯洛怎么做规格驱动开发", []), "Kiro怎么做规格驱动开发");
  assert.equal(normalizeQuestion("戴文能不能自动修 bug", []), "Devin能不能自动修 bug");
  assert.equal(normalizeQuestion("迪飞和扣子怎么选", []), "Dify和Coze怎么选");
  assert.equal(normalizeQuestion("恩8恩怎么编排", []), "n8n怎么编排");
  assert.equal(normalizeQuestion("朗链和朗图的区别", []), "LangChain和LangGraph的区别");
  assert.equal(normalizeQuestion("欧拉马本地部署怎么做", []), "Ollama本地部署怎么做");
  assert.equal(normalizeQuestion("米尔维斯怎么建向量库", []), "Milvus怎么建Vector Database");
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

test("上传的术语表保留原有条目，并自动补齐新增的内置 AI 术语", () => {
  const merged = mergeGlossaryTerms([{ term: "RAG", aliases: ["企业检索"] }]);
  assert.deepEqual(merged.find((entry) => entry.term === "RAG"), { term: "RAG", aliases: ["企业检索"] });
  assert.ok(merged.some((entry) => entry.term === "Human-in-the-loop"));
  assert.ok(merged.some((entry) => entry.term === "Canary Release"));
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
