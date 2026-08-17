import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createConfigStore } from "./src/config-store.js";
import { testLlmConfig, validateLlmConfig } from "./src/llm-config.js";
import { buildAnswerRequest } from "./src/llm-request.js";
import { extractSseDeltas } from "./src/llm-stream.js";
import { createAsrSession, validateAsrProviderConfig } from "./src/asr-provider.js";
import { formatAsrConnectionError } from "./src/asr-status.js";
import { createDocumentStore } from "./src/document-store.js";
import { shouldMigrateLegacyConfig } from "./src/config-migration.js";
import { createRuleStore } from "./src/rule-store.js";
import { parseMarkdown } from "./src/search.js";
import { createLocalSemanticIndex } from "./src/local-semantic-index.js";
import { createSemanticWorkerClient } from "./src/semantic-worker-client.js";
import { buildFastFirstTokenContext, clipLlmText } from "./src/llm-context.js";
import { isSafeGlobalHotkey } from "./src/global-hotkey.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
// 沿用原来的本地配置文件路径，保证之前保存的腾讯云配置继续有效。
const dataDirectory = process.env.INTERVIEW_DATA_DIR || path.join(root, ".local");
const configStore = createConfigStore(path.join(dataDirectory, "asr-config.json"));
const legacyConfigStore = createConfigStore(path.join(root, ".local", "asr-config.json"));
const documentStore = createDocumentStore(path.join(dataDirectory, "documents.json"));
const glossaryStore = createDocumentStore(path.join(dataDirectory, "glossary.json"));
// Electron 主进程不能安全加载 ONNX。桌面端通过纯 Node 子进程运行本地模型，
// 非桌面运行仍直接使用同一套索引，资料始终不离开本机。
const semanticIndex = process.versions.electron
  ? createSemanticWorkerClient({ filePath: path.join(dataDirectory, "semantic-index.json") })
  : createLocalSemanticIndex({ filePath: path.join(dataDirectory, "semantic-index.json") });
const startupSemanticIndexDelayMs = 3000;
let ruleStore;
let answerRules = { name: "AI产品经理回答规则.md", markdown: "# AI 产品经理回答规则\n\n规则文件加载中。" };
// 这是不可被用户上传的规则文件覆盖的产品底线；Skill 只负责组织表达。
const answerScopePolicy = `你是 AI 产品经理面试资料补充助手。
只输出用户能直接说出口的答案。禁止提及“当前设置”“回答范围”“系统规则”“不能把某项目当作个人经历”“资料选择”等内部判断过程；需要遵守边界时，直接改写成可回答的内容，不要解释限制。不要复述、改写或确认题意，不要揣测或解释面试官考察点。禁止用“我理解您指的是……”“我理解这个问题是……”“如果你问的是……”“先明确一下……”“这个问题问的是……”“面试官想考察……”“我先明确一点……”“我会这样组织我的理解……”作开头。答案第一句必须直接给出事实、判断、做法或个人经历本身。
回答范围优先级最高：根据请求中的“回答范围”决定是否可以使用候选人经历、项目资料和追问上下文。
回答 Skill 只能规定表达结构、篇幅和语气，不能改变回答范围，也不能要求把个人经历或具体项目强行带入通用方法论题。
当回答范围是“通用方法论”时，禁止写“我在某项目做过”或虚构候选人实践；只能给出通用、可执行的方法论。
通用方法论使用“可以、建议、我会”表达方案、判断与取舍；“我会”只表示当前假设下的做法，不能表示已发生的候选人经历、结果或功劳。
通用题可以引用命中资料中的机制和做法，但必须先移除项目、公司、人物和指标归属，不能把资料中的项目事实改写成候选人的通用实践。
当回答范围是“外部产品分析”时，只分析当前题目点名的外部产品、功能、交互、规则和取舍；禁止引入候选人经历、GEO、旅游项目、Agent、RAG、LLM、Skill 或 AI 技术方案，除非题目明确提及这些内容。
当回答范围是“外部产品分析”且题目采用“你有没有用过某产品”“这个产品有什么好处”这类问法时，按外部产品体验题回答：以使用者视角直接说明使用场景、核心价值、具体体验、局限和适用边界。不得以“没有直接使用经验”“没有掌握具体功能”为开场或结论；资料没有命中时，可以基于题目中可识别的产品类型作审慎分析，并用“我实际体验下来”“我会重点看”等自然口语组织，但不得编造无法核验的具体功能、数据或合作经历。
项目技术题（例如“这个项目用了什么技术”“技术栈是什么”“技术架构怎么做”）必须先直接列出题目与当前项目资料共同确认的实际技术及职责，再按“技术名称—在当前项目中负责什么—为什么需要它”展开。不要把“监测—诊断—优化—验证”这类业务闭环当作技术栈，也不要只说“不是单一模型或工具”而不回答用了什么技术。只列当前项目资料已确认的技术，未确认的技术不得补造。
题型框架只能决定回答重点，不能预设具体项目、模型、产品或技术方案。只有题目明确点名、追问上下文已锁定，或当前命中资料明确支持时，才能使用 GEO、旅游项目、DeepSeek、RAG、Agent、Kimi 等具体内容；否则按通用方法论回答。
命中原文逐字稿时优先沿用原文的事实、顺序和可口述表达，只在不改变原意的前提下拆分长句、删除重复或补足题目明确要求的缺口；未命中原文时才按题型选择回答入口。方案、项目、设计、技术取舍、评测和复盘题可以从用户场景、用户需求或业务痛点切入；概念、术语、参数或简单事实题直接定义、对比或回答事实，不强行虚构场景。
回答材料分三类：原文直答时，以该题完整原文为主组织口述；资料整合时，合并同题的背景、做法、结果与边界，不能只复述其中一段；通用兜底只在没有相关资料时使用。不得用通用模板覆盖命中的原文，也不得把内部的“资料不足”判断说给面试官。
需要谈效果时，应区分离线评测与线上指标：评测集、Rubric、Badcase 和回归用于验证离线质量，线上指标只用于观察真实使用效果；不能将离线结论说成线上收益，不能编造数值。
高风险决策应以权威数据和明确版本为准，说明规则、模型与人工的分工；对低置信度、证据不足、越权或无法核验的信息，应拒答或说明资料不足并转人工接管，保留必要的审计记录。
首次出现的纯英文术语、缩写或英文短语，必须紧跟中文解释，格式为“英文（中文解释）”；例如“RAG（检索增强生成）”“Rerank（重排序）”。已有清晰中文名称的产品名可保留原名，不必生硬翻译；同一术语在同一篇回答后续再次出现无需重复解释。
当没有可靠命中资料时，要明确资料不足，不得借用无关项目、无关经历或上一题内容。对于“什么是 X / X 是什么意思”这类定义题，如果 X 是单个英文词或疑似语音转写，且当前资料没有命中：不得编造它是某个模型、架构、产品或缩写，不得虚构英文全称。普通英语词应按常用含义直接解释；例如 Loop 表示循环，在产品或 AI 流程中通常指“执行—检查结果—反馈—再执行”的闭环。只有题目明确给出相应技术上下文且资料可以支持时，才解释为特殊专名。`;
const runtimeConfig = { asrProvider: process.env.ASR_PROVIDER || "browser", tencentRegion: process.env.TENCENT_REGION || "ap-guangzhou", tencentAppId: process.env.TENCENT_APP_ID || "", tencentSecretId: process.env.TENCENT_SECRET_ID || "", tencentSecretKey: process.env.TENCENT_SECRET_KEY || "", questionCaptureHotkey: "Alt+Space", doubaoAppId: process.env.DOUBAO_APP_ID || "", doubaoAccessToken: process.env.DOUBAO_ACCESS_TOKEN || "", doubaoResourceId: process.env.DOUBAO_RESOURCE_ID || "", doubaoEndpoint: process.env.DOUBAO_ENDPOINT || "wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async", aiApiUrl: process.env.AI_API_URL || "https://api.openai.com/v1/chat/completions", aiModel: process.env.AI_MODEL || "gpt-4o-mini", aiApiKey: process.env.AI_API_KEY || "" };
const contentTypes = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".md": "text/markdown; charset=utf-8" };

function isValidQuestionCaptureHotkey(value) {
  return typeof value === "string" && isSafeGlobalHotkey(value);
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" });
  response.end(JSON.stringify(payload));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function getDocuments(response) {
  sendJson(response, 200, { documents: await documentStore.load() });
}

function sectionsFromDocuments(documents = []) {
  return documents
    .filter((document) => document?.type !== "skill" && document?.type !== "converter-skill")
    .flatMap((document) => parseMarkdown(document.markdown || "", document.name || "未命名资料"));
}

// 语义模型并不天然理解口语省略（如“给我介绍一下”省略了“我自己”）。
// 这里补的是检索意图锚点，不替代原始问题，也不生成或篡改资料内容。
function semanticQueryFor(query = "") {
  const anchors = [];
  if (/(?:自我介绍|给我介绍|介绍一下(?:你|自己)?|讲讲(?:你|自己|背景)|个人背景|职业经历|为什么适合)/u.test(query)) {
    anchors.push("自我介绍 个人经历 职业背景 核心优势 项目经历 为什么适合岗位");
  }
  if (/(?:困难|难点|挑战|阻碍|卡点)/u.test(query)) anchors.push("项目难点 挑战 问题 如何解决");
  if (/(?:CEO|高层|老板|商业价值|ROI)/iu.test(query)) anchors.push("CEO 高层视角 商业价值 ROI 战略 决策");
  if (/(?:知识库|检索).{0,10}(?:怎么|如何|设计|搭建|构建)|(?:怎么|如何|设计|搭建|构建).{0,10}(?:知识库|检索)/u.test(query)) {
    anchors.push("RAG 知识库 切片 Metadata 混合召回 Rerank 引用 评测");
  }
  if (/(?:用了?(?:什么|哪些)技术|技术栈|技术架构|底层技术|技术方案)/u.test(query)) {
    anchors.push("Agent RAG Workflow 模型调用 规则引擎 混合召回 向量检索 评测 人工审核");
  }
  if (/(?:转人工|人工接管|人工兜底|低置信度|高风险|护栏)/u.test(query)) {
    anchors.push("高风险场景 置信度 拒答 人工接管 审计 Workflow");
  }
  if (/(?:评测|评估|Bad\s?Case|准确率|召回率|重排|效果)/iu.test(query)) {
    anchors.push("AI 产品评测 数据集 Rubric Bad Case Trace 回归集 离线评测 线上指标");
  }
  if (/(?:项目).{0,12}(?:介绍|讲讲|说说|怎么做|是什么)|(?:介绍|讲讲|说说).{0,12}(?:项目)/u.test(query)) {
    anchors.push("项目背景 业务问题 用户痛点 产品方案 技术架构 个人职责 指标结果 复盘");
  }
  return [query, ...anchors].join("\n");
}

async function saveDocuments(request, response) {
  const input = await readBody(request);
  const documents = await documentStore.save(input.documents);
  // 上传时先在本机完成建索引；后续提问只需要计算问题本身的向量。
  let semantic = { available: true, error: null };
  try { await semanticIndex.index(sectionsFromDocuments(documents)); } catch (error) { semantic = { available: false, error: error.message }; }
  sendJson(response, 200, { documents, semantic });
}

async function retrieveDocuments(request, response) {
  const input = await readBody(request);
  const query = typeof input.query === "string" ? input.query.trim() : "";
  if (!query) return sendJson(response, 400, { error: "问题不能为空" });
  const sections = Array.isArray(input.sections)
    ? input.sections.slice(0, 500).filter((section) => section && typeof section.title === "string" && typeof section.content === "string")
    : sectionsFromDocuments(await documentStore.load());
  let matches = [];
  let semantic = { available: true, error: null };
  try { matches = await semanticIndex.search(semanticQueryFor(query), sections, 20); } catch (error) { semantic = { available: false, error: error.message }; }
  sendJson(response, 200, { matches, semantic });
}

async function getGlossary(response) {
  const [glossary] = await glossaryStore.load();
  sendJson(response, 200, { glossary: glossary || null });
}

function getRules(response) {
  sendJson(response, 200, answerRules);
}

async function saveRules(request, response) {
  const input = await readBody(request);
  answerRules = await ruleStore.save({ name: input.name, markdown: input.markdown });
  sendJson(response, 200, answerRules);
}

async function deleteRules(response) {
  answerRules = await ruleStore.reset();
  sendJson(response, 200, answerRules);
}

async function saveGlossary(request, response) {
  const input = await readBody(request);
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const markdown = typeof input.markdown === "string" ? input.markdown : "";
  if (!name || !markdown) return sendJson(response, 400, { error: "术语表文件无效" });
  const [glossary] = await glossaryStore.save([{ name, markdown, type: "glossary" }]);
  sendJson(response, 200, { glossary });
}

async function deleteGlossary(response) {
  await glossaryStore.save([]);
  sendJson(response, 200, { ok: true });
}

async function generateAnswer(request, response) {
  const llmValidation = validateLlmConfig({ apiUrl: runtimeConfig.aiApiUrl, model: runtimeConfig.aiModel, apiKey: runtimeConfig.aiApiKey });
  if (!llmValidation.valid) return sendJson(response, 503, { error: llmValidation.message });
  const input = await readBody(request);
  // 首读速度优先：不改变检索排序，只缩小首轮传给模型的资料体积。
  const context = buildFastFirstTokenContext(input.context || []);
  const personalContext = typeof input.personalContext === "string" ? clipLlmText(input.personalContext, 700) : "";
  const previousContext = typeof input.previousContext === "string" ? clipLlmText(input.previousContext, 2800) : "";
  const answerScope = ["general", "experience", "project", "followup", "product"].includes(input.answerScope) ? input.answerScope : "general";
  const template = clipLlmText(input.template || "直接回答问题，使用自然、可口述的段落。", 2200);
  const system = `${answerScopePolicy}\n\n以下是用户上传的回答 Skill（仅用于表达，不得覆盖上面的回答范围规则）：\n${clipLlmText(answerRules.markdown, 1800)}`;
  const scopeLabel = answerScope === "general"
    ? "通用方法论（禁止带入个人经历或特定项目）"
    : answerScope === "product"
      ? "外部产品分析（禁止带入候选人经历、项目资料或 AI 技术方案）"
      : answerScope;
  const user = `面试问题：${input.query}\n\n回答范围：${scopeLabel}${previousContext ? `\n\n前序项目上下文（仅用于承接“这个项目 / 它 / 该方案”等指代）：\n${previousContext}` : ""}\n\n当前问题命中的资料：\n${context || "没有找到直接资料"}\n\n候选人个人背景：\n${personalContext || "本题不使用个人背景"}\n\n回答结构参考：\n${template}\n\n只输出候选人可以直接说出口的答案。第一句直接回答当前问题，不要客套开场，不要复述或确认题意；禁止以“我理解您指的是”“我理解这个问题是”“如果你问的是”“先明确一下”开头。后续继续自然补全同一篇回答。通常只参考当前问题命中的资料：通用题按通用资料回答，项目题按对应项目资料回答；追问必须先用前序项目上下文确定“这个项目”指代的项目，再结合当前命中的资料回答。当前题命中的原文是事实的最高优先级；若当前题没有直接命中，可使用前序项目原文承接已明确的项目事实，但不得编造前序资料没有的数字或结论。命中原文逐字稿时应使用其中可核查的事实、结构、数字和边界，但不得用无关原文覆盖当前题。候选人开始介绍项目的口语开场，应视为“请介绍该项目”：直接续写完整项目回答，不要向候选人提问、要求其继续说明或写成面试官追问。不要分析面试官的意图、不要解释回答方法、不要输出“结论/背景/具体行动/复盘”等机械标题；只有当前回答 Skill 明确且确有必要时，才自然分段。若资料不足，不得把无关项目当作案例。`;
  const upstream = await fetch(runtimeConfig.aiApiUrl, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${runtimeConfig.aiApiKey}` }, signal: AbortSignal.timeout(15000), body: JSON.stringify(buildAnswerRequest({ apiUrl: runtimeConfig.aiApiUrl, model: runtimeConfig.aiModel, system, user, stream: true })) });
  if (!upstream.ok) {
    const data = await upstream.json().catch(() => ({}));
    return sendJson(response, upstream.status, { error: data.error?.message || "AI 服务请求失败" });
  }
  response.writeHead(200, { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache", connection: "keep-alive" });
  const decoder = new TextDecoder();
  let pending = "";
  for await (const chunk of upstream.body) {
    pending += decoder.decode(chunk, { stream: true });
    const events = pending.split(/\r?\n\r?\n/);
    pending = events.pop() || "";
    for (const event of events) {
      for (const delta of extractSseDeltas(event)) response.write(`data: ${JSON.stringify({ delta })}\n\n`);
    }
  }
  for (const delta of extractSseDeltas(pending + decoder.decode())) response.write(`data: ${JSON.stringify({ delta })}\n\n`);
  response.write("data: [DONE]\n\n");
  response.end();
}

async function updateConfig(request, response) {
  const input = await readBody(request);
  const nextConfig = { ...runtimeConfig };
  for (const key of ["asrProvider", "tencentRegion", "tencentAppId", "doubaoAppId", "doubaoResourceId", "doubaoEndpoint"]) if (typeof input[key] === "string") nextConfig[key] = input[key].trim();
  if (isValidQuestionCaptureHotkey(input.questionCaptureHotkey || input.questionHotkey)) nextConfig.questionCaptureHotkey = (input.questionCaptureHotkey || input.questionHotkey).trim();
  if (typeof input.tencentSecretId === "string" && input.tencentSecretId.trim()) nextConfig.tencentSecretId = input.tencentSecretId.trim();
  if (typeof input.tencentSecretKey === "string" && input.tencentSecretKey.trim()) nextConfig.tencentSecretKey = input.tencentSecretKey.trim();
  if (typeof input.doubaoAccessToken === "string" && input.doubaoAccessToken.trim()) nextConfig.doubaoAccessToken = input.doubaoAccessToken.trim();
  if (typeof input.aiApiUrl === "string" && input.aiApiUrl.trim()) nextConfig.aiApiUrl = input.aiApiUrl.trim();
  if (typeof input.aiModel === "string" && input.aiModel.trim()) nextConfig.aiModel = input.aiModel.trim();
  if (typeof input.aiApiKey === "string" && input.aiApiKey.trim()) nextConfig.aiApiKey = input.aiApiKey.trim();
  const isLlmUpdate = ["aiApiUrl", "aiModel", "aiApiKey"].some((key) => typeof input[key] === "string");
  const isAsrUpdate = ["asrProvider", "tencentRegion", "tencentAppId", "tencentSecretId", "tencentSecretKey", "doubaoAppId", "doubaoAccessToken", "doubaoResourceId", "doubaoEndpoint"].some((key) => typeof input[key] === "string");
  const llmValidation = validateLlmConfig({ apiUrl: nextConfig.aiApiUrl, model: nextConfig.aiModel, apiKey: nextConfig.aiApiKey });
  if (isLlmUpdate && !llmValidation.valid) return sendJson(response, 400, { error: llmValidation.message });
  const asrValidation = validateAsrProviderConfig(nextConfig);
  if (isAsrUpdate && nextConfig.asrProvider !== "browser" && !asrValidation.valid) return sendJson(response, 400, { error: asrValidation.message });
  Object.assign(runtimeConfig, nextConfig);
  await configStore.save(runtimeConfig);
  sendJson(response, 200, configPayload(llmValidation));
}

function configPayload(llmValidation = validateLlmConfig({ apiUrl: runtimeConfig.aiApiUrl, model: runtimeConfig.aiModel, apiKey: runtimeConfig.aiApiKey })) {
  const asrValidation = validateAsrProviderConfig(runtimeConfig);
  return { configured: runtimeConfig.asrProvider === "browser" ? false : asrValidation.valid, provider: runtimeConfig.asrProvider, region: runtimeConfig.tencentRegion, appId: runtimeConfig.tencentAppId, secretId: runtimeConfig.tencentSecretId ? "已保存" : "未配置", secretKey: runtimeConfig.tencentSecretKey ? "已保存" : "未配置", questionCaptureHotkey: runtimeConfig.questionCaptureHotkey, doubaoAppId: runtimeConfig.doubaoAppId, doubaoAccessToken: runtimeConfig.doubaoAccessToken ? "已保存" : "未配置", doubaoResourceId: runtimeConfig.doubaoResourceId, doubaoEndpoint: runtimeConfig.doubaoEndpoint, asrValid: asrValidation.valid, asrMessage: asrValidation.message, llmConfigured: Boolean(runtimeConfig.aiApiKey), llmValid: llmValidation.valid, llmMessage: llmValidation.message, aiApiUrl: runtimeConfig.aiApiUrl, aiModel: runtimeConfig.aiModel, aiApiKey: runtimeConfig.aiApiKey ? "已保存" : "未配置" };
}

function configStatus(response) {
  sendJson(response, 200, configPayload());
}

export function getRuntimeConfig() {
  return { ...runtimeConfig };
}

async function testLlmConnection(response) {
  const result = await testLlmConfig({ apiUrl: runtimeConfig.aiApiUrl, model: runtimeConfig.aiModel, apiKey: runtimeConfig.aiApiKey });
  sendJson(response, result.usable ? 200 : result.status, result);
}

async function testAsrConnection(response) {
  const validation = validateAsrProviderConfig(runtimeConfig);
  if (!validation.valid) return sendJson(response, 400, { usable: false, error: validation.message });
  const result = await new Promise((resolve) => {
    let settled = false;
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      resolve(payload);
    };
    const session = createAsrSession(runtimeConfig, (event) => {
      if (event.type === "ready") {
        session.stop();
        finish({ usable: true, message: `${runtimeConfig.asrProvider === "doubao" ? "豆包" : "腾讯云 V2"}连接成功，鉴权和账户额度可用` });
      }
      if (event.type === "error") finish({ usable: false, error: runtimeConfig.asrProvider === "tencent" ? formatAsrConnectionError(event) : `豆包连接失败${event.code ? `（${event.code}）` : ""}${event.message ? `：${event.message}` : ""}` });
    });
    session.start();
    setTimeout(() => { session.stop(); finish({ usable: false, error: `${runtimeConfig.asrProvider === "doubao" ? "豆包" : "腾讯云"}连接超时，请检查网络和服务开通状态后重试` }); }, 12000);
  });
  sendJson(response, result.usable ? 200 : 503, result);
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "POST" && request.url === "/api/generate") return await generateAnswer(request, response);
    if (request.method === "POST" && request.url === "/api/retrieve") return await retrieveDocuments(request, response);
    if (request.method === "GET" && request.url === "/api/documents") return await getDocuments(response);
    if (request.method === "PUT" && request.url === "/api/documents") return await saveDocuments(request, response);
    if (request.method === "GET" && request.url === "/api/glossary") return await getGlossary(response);
    if (request.method === "PUT" && request.url === "/api/glossary") return await saveGlossary(request, response);
    if (request.method === "DELETE" && request.url === "/api/glossary") return await deleteGlossary(response);
    if (request.method === "GET" && request.url === "/api/rules") return getRules(response);
    if (request.method === "PUT" && request.url === "/api/rules") return await saveRules(request, response);
    if (request.method === "DELETE" && request.url === "/api/rules") return await deleteRules(response);
    if (request.method === "POST" && request.url === "/api/config") return await updateConfig(request, response);
    if (request.method === "POST" && request.url === "/api/llm/test") return await testLlmConnection(response);
    if (request.method === "POST" && request.url === "/api/asr/test") return await testAsrConnection(response);
    if (request.method === "GET" && request.url === "/api/config") return configStatus(response);
    if (request.method !== "GET") return sendJson(response, 405, { error: "Method not allowed" });
    const requested = decodeURIComponent(request.url === "/" ? "/index.html" : request.url.split("?")[0]);
    const filePath = path.resolve(root, `.${requested}`);
    if (!filePath.startsWith(root)) return sendJson(response, 403, { error: "Forbidden" });
    const data = await fs.readFile(filePath);
    response.writeHead(200, { "content-type": contentTypes[path.extname(filePath)] || "application/octet-stream" });
    response.end(data);
  } catch (error) {
    if (error.code === "ENOENT") return sendJson(response, 404, { error: "Not found" });
    sendJson(response, 500, { error: error.message });
  }
});

let loadedConfig = false;

export async function startServer(listenPort = port) {
  if (server.listening) return server;
  if (!loadedConfig) {
    const defaultRules = { name: "AI产品经理回答规则.md", markdown: await fs.readFile(path.join(root, "assets", "AI产品经理回答规则.md"), "utf8") };
    ruleStore = createRuleStore(path.join(dataDirectory, "answer-rules.json"), defaultRules);
    answerRules = await ruleStore.load();
    const saved = await configStore.load();
    if (dataDirectory !== path.join(root, ".local")) {
      const legacy = await legacyConfigStore.load();
      if (shouldMigrateLegacyConfig(saved, legacy)) {
        Object.assign(saved, legacy);
        await configStore.save(saved);
      }
    }
    const envNames = { asrProvider: "ASR_PROVIDER", tencentRegion: "TENCENT_REGION", tencentAppId: "TENCENT_APP_ID", tencentSecretId: "TENCENT_SECRET_ID", tencentSecretKey: "TENCENT_SECRET_KEY", doubaoAppId: "DOUBAO_APP_ID", doubaoAccessToken: "DOUBAO_ACCESS_TOKEN", doubaoResourceId: "DOUBAO_RESOURCE_ID", doubaoEndpoint: "DOUBAO_ENDPOINT", aiApiUrl: "AI_API_URL", aiModel: "AI_MODEL", aiApiKey: "AI_API_KEY" };
    for (const key of Object.keys(runtimeConfig)) if (!process.env[envNames[key]]) runtimeConfig[key] = saved[key] ?? runtimeConfig[key];
    loadedConfig = true;
  }
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(listenPort, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  // 首屏加载完成后再预建索引。资料较大时加载本地模型会瞬时占用 CPU，
  // 不能与刚启动的窗口、设置和语音控制同时竞争资源。
  setTimeout(() => {
    void documentStore.load().then((documents) => semanticIndex.index(sectionsFromDocuments(documents))).catch(() => {});
  }, startupSemanticIndexDelayMs);
  const address = server.address();
  console.log(`面试资料伴侣运行在 http://127.0.0.1:${address.port}`);
  return server;
}

const directRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (directRun) startServer();
