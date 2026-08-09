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
import { createVoiceprintClient, validateVoiceprintConfig } from "./src/tencent-voiceprint.js";
import { verificationSucceeded } from "./src/voiceprint-verification.js";
import { createDocumentStore } from "./src/document-store.js";
import { shouldMigrateLegacyConfig } from "./src/config-migration.js";
import { withTimeout } from "./src/request-timeout.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
// 沿用原来的本地配置文件路径，保证之前保存的腾讯云配置继续有效。
const dataDirectory = process.env.INTERVIEW_DATA_DIR || path.join(root, ".local");
const configStore = createConfigStore(path.join(dataDirectory, "asr-config.json"));
const legacyConfigStore = createConfigStore(path.join(root, ".local", "asr-config.json"));
const documentStore = createDocumentStore(path.join(dataDirectory, "documents.json"));
const glossaryStore = createDocumentStore(path.join(dataDirectory, "glossary.json"));
const runtimeConfig = { asrProvider: process.env.ASR_PROVIDER || "browser", tencentRegion: process.env.TENCENT_REGION || "ap-guangzhou", tencentAppId: process.env.TENCENT_APP_ID || "", tencentSecretId: process.env.TENCENT_SECRET_ID || "", tencentSecretKey: process.env.TENCENT_SECRET_KEY || "", voicePrintId: process.env.VOICE_PRINT_ID || "", voicePrintVerified: false, doubaoAppId: process.env.DOUBAO_APP_ID || "", doubaoAccessToken: process.env.DOUBAO_ACCESS_TOKEN || "", doubaoResourceId: process.env.DOUBAO_RESOURCE_ID || "", doubaoEndpoint: process.env.DOUBAO_ENDPOINT || "wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async", aiApiUrl: process.env.AI_API_URL || "https://api.openai.com/v1/chat/completions", aiModel: process.env.AI_MODEL || "gpt-4o-mini", aiApiKey: process.env.AI_API_KEY || "" };
const contentTypes = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".md": "text/markdown; charset=utf-8" };

function sendJson(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" });
  response.end(JSON.stringify(payload));
}

async function readBody(request) {
  let body = "";
  for await (const chunk of request) body += chunk;
  return JSON.parse(body || "{}");
}

async function getDocuments(response) {
  sendJson(response, 200, { documents: await documentStore.load() });
}

async function saveDocuments(request, response) {
  const input = await readBody(request);
  sendJson(response, 200, { documents: await documentStore.save(input.documents) });
}

async function getGlossary(response) {
  const [glossary] = await glossaryStore.load();
  sendJson(response, 200, { glossary: glossary || null });
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
  const context = (input.context || []).slice(0, 5).map((item) => `【${item.project ? `${item.project} / ` : ""}${item.title}】\n${item.content}`).join("\n\n");
  const personalContext = typeof input.personalContext === "string" ? input.personalContext.slice(0, 8000) : "";
  const previousContext = typeof input.previousContext === "string" ? input.previousContext.slice(0, 8000) : "";
  const answerScope = ["general", "experience", "project", "followup"].includes(input.answerScope) ? input.answerScope : "general";
  const template = input.template || "结论\n背景\n具体行动\n结果\n复盘";
  const system = "你是 AI 产品经理面试资料补充助手。回答范围优先级最高，上传的回答 Skill 只能规定表达结构，不能改变回答范围。只有明确询问候选人本人、本人项目、本人经历，或带有已确认项目的追问，才是经历/项目题。‘你会怎么做 RAG 系统’、‘怎么设计 AIGC 产品’中的‘你’只是提问语气，仍属于通用方法论，绝不能引用候选人经历。通用技术题默认从业务目标、用户/场景、产品方案、AI 能力与技术取舍、指标和迭代闭环来回答。只能把用户提供的资料当作事实依据；资料不足时必须明确标注‘需要本人确认’，禁止虚构个人经历、公司数据或项目结果。回答范围为‘通用方法论’时，绝不能提及候选人姓名、过往公司、个人项目或使用第一人称项目经历；只回答通用步骤、判断标准和取舍。回答范围为‘经历/项目/追问’时，才可使用提供的候选人背景和项目资料。资料标题前的项目名是重要范围：问题未指明项目且没有追问上下文时，不能把某个项目的答案说成所有项目的通用事实。回答必须先给一句可立即开口的结论，然后给可口述 1–2 分钟的完整版本：说明背景/问题、具体做法和关键取舍、结果数据、复盘。不要只列提纲；命中资料有技术细节、数字或案例时必须展开说明。";
  const user = `面试问题：${input.query}\n\n回答范围：${answerScope === "general" ? "通用方法论（禁止带入个人经历或特定项目）" : answerScope}${previousContext ? `\n\n追问上下文：\n${previousContext}` : ""}\n\n当前问题命中的资料：\n${context || "没有找到直接资料"}\n\n候选人个人背景：\n${personalContext || "本题不使用个人背景"}\n\n请按以下回答 Skill 生成完整口述回答：\n${template}\n\n先输出一行“结论”，随后按模板展开；每一部分优先使用命中资料中的具体事实、技术方案、权衡过程和数字。若资料不足，不得把无关项目当作案例。`;
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
  for (const key of ["asrProvider", "tencentRegion", "tencentAppId", "voicePrintId", "doubaoAppId", "doubaoResourceId", "doubaoEndpoint"]) if (typeof input[key] === "string") nextConfig[key] = input[key].trim();
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
  const voiceprintValidation = validateVoiceprintConfig(runtimeConfig);
  return { configured: runtimeConfig.asrProvider === "browser" ? false : asrValidation.valid, provider: runtimeConfig.asrProvider, region: runtimeConfig.tencentRegion, appId: runtimeConfig.tencentAppId, secretId: runtimeConfig.tencentSecretId ? "已保存" : "未配置", secretKey: runtimeConfig.tencentSecretKey ? "已保存" : "未配置", voicePrintId: runtimeConfig.voicePrintId, voicePrintConfigured: voiceprintValidation.valid, voicePrintVerified: Boolean(runtimeConfig.voicePrintVerified), doubaoAppId: runtimeConfig.doubaoAppId, doubaoAccessToken: runtimeConfig.doubaoAccessToken ? "已保存" : "未配置", doubaoResourceId: runtimeConfig.doubaoResourceId, doubaoEndpoint: runtimeConfig.doubaoEndpoint, asrValid: asrValidation.valid, asrMessage: asrValidation.message, llmConfigured: Boolean(runtimeConfig.aiApiKey), llmValid: llmValidation.valid, llmMessage: llmValidation.message, aiApiUrl: runtimeConfig.aiApiUrl, aiModel: runtimeConfig.aiModel, aiApiKey: runtimeConfig.aiApiKey ? "已保存" : "未配置" };
}

function pcmFromInput(input) {
  if (typeof input.pcm16Base64 !== "string" || !input.pcm16Base64) throw new Error("请先录入至少 3 秒的本人声音样本");
  const pcm = Buffer.from(input.pcm16Base64, "base64");
  if (pcm.length < 16000 * 2 * 2) throw new Error("声音样本太短，请录入至少 2 秒的清晰语音");
  return pcm;
}

async function enrollVoiceprint(request, response) {
  const input = await readBody(request);
  const result = await createVoiceprintClient(runtimeConfig).enroll({ speakerNick: input.speakerNick || "面试资料伴侣本人", pcm16: pcmFromInput(input) });
  const voicePrintId = result.Data?.VoicePrintId;
  if (!voicePrintId) throw new Error("腾讯云没有返回声纹档案 ID，请检查声纹服务是否已开通");
  runtimeConfig.voicePrintId = voicePrintId;
  runtimeConfig.voicePrintVerified = false;
  await configStore.save(runtimeConfig);
  sendJson(response, 200, { ok: true, voicePrintId, message: "声纹样本已提交腾讯云，请再执行一次验证测试确认可用", requestId: result.RequestId });
}

async function verifyVoiceprint(request, response) {
  const input = await readBody(request);
  if (!runtimeConfig.voicePrintId) return sendJson(response, 400, { error: "请先成功录入本人声纹样本" });
  const result = await withTimeout(
    createVoiceprintClient(runtimeConfig).verify({ voicePrintId: runtimeConfig.voicePrintId, pcm16: pcmFromInput(input) }),
    15000,
    "腾讯云声纹验证超过 15 秒没有响应，请检查网络或腾讯云服务状态后重试",
  );
  const verified = verificationSucceeded(result);
  runtimeConfig.voicePrintVerified = verified;
  await configStore.save(runtimeConfig);
  if (!verified) return sendJson(response, 422, { error: "声纹验证未通过，请使用更清晰、时长更长的本人样本重新录入" });
  sendJson(response, 200, { ok: true, message: "声纹验证通过，本人过滤已可用于桌面监听", score: result.Data?.Score ?? null, requestId: result.RequestId });
}

async function deleteVoiceprint(response) {
  if (runtimeConfig.voicePrintId) await createVoiceprintClient(runtimeConfig).delete(runtimeConfig.voicePrintId);
  runtimeConfig.voicePrintId = "";
  runtimeConfig.voicePrintVerified = false;
  await configStore.save(runtimeConfig);
  sendJson(response, 200, { ok: true, message: "已删除腾讯云声纹档案和本地绑定" });
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
    if (request.method === "GET" && request.url === "/api/documents") return await getDocuments(response);
    if (request.method === "PUT" && request.url === "/api/documents") return await saveDocuments(request, response);
    if (request.method === "GET" && request.url === "/api/glossary") return await getGlossary(response);
    if (request.method === "PUT" && request.url === "/api/glossary") return await saveGlossary(request, response);
    if (request.method === "DELETE" && request.url === "/api/glossary") return await deleteGlossary(response);
    if (request.method === "POST" && request.url === "/api/config") return await updateConfig(request, response);
    if (request.method === "POST" && request.url === "/api/llm/test") return await testLlmConnection(response);
    if (request.method === "POST" && request.url === "/api/asr/test") return await testAsrConnection(response);
    if (request.method === "POST" && request.url === "/api/voiceprint/enroll") return await enrollVoiceprint(request, response);
    if (request.method === "POST" && request.url === "/api/voiceprint/verify") return await verifyVoiceprint(request, response);
    if (request.method === "DELETE" && request.url === "/api/voiceprint/profile") return await deleteVoiceprint(response);
    if (request.method === "GET" && request.url === "/api/config") return configStatus(response);
    if (request.method !== "GET") return sendJson(response, 405, { error: "Method not allowed" });
    const requested = request.url === "/" ? "/index.html" : request.url.split("?")[0];
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
    const saved = await configStore.load();
    if (dataDirectory !== path.join(root, ".local")) {
      const legacy = await legacyConfigStore.load();
      if (shouldMigrateLegacyConfig(saved, legacy)) {
        Object.assign(saved, legacy);
        await configStore.save(saved);
      }
    }
    const envNames = { asrProvider: "ASR_PROVIDER", tencentRegion: "TENCENT_REGION", tencentAppId: "TENCENT_APP_ID", tencentSecretId: "TENCENT_SECRET_ID", tencentSecretKey: "TENCENT_SECRET_KEY", voicePrintId: "VOICE_PRINT_ID", voicePrintVerified: "VOICE_PRINT_VERIFIED", doubaoAppId: "DOUBAO_APP_ID", doubaoAccessToken: "DOUBAO_ACCESS_TOKEN", doubaoResourceId: "DOUBAO_RESOURCE_ID", doubaoEndpoint: "DOUBAO_ENDPOINT", aiApiUrl: "AI_API_URL", aiModel: "AI_MODEL", aiApiKey: "AI_API_KEY" };
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
  const address = server.address();
  console.log(`面试资料伴侣运行在 http://127.0.0.1:${address.port}`);
  return server;
}

const directRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (directRun) startServer();
