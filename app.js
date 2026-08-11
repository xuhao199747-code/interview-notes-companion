import { parseMarkdown, searchSections } from "./src/search.js";
import { llmConfigChangedMessage, secretKeyPlaceholder } from "./src/config-ui.js";
import { acceptLlmAnswer, beginQuestion, buildFollowUpContext, createAnswerState, isConfirmedQuestion } from "./src/answer-state.js";
import { downsampleToPcm16 } from "./src/audio-pcm.js";
import { resolveProjectContext, shouldScopeToProject } from "./src/project-context.js";
import { createProjectOptions, filterSectionsForProject } from "./src/project-aliases.js";
import { routeAnswer } from "./src/answer-router.js";
import { classifyTranscript } from "./src/turn-detector.js";
import { mergeAsrTranscript } from "./src/asr-transcript-buffer.js";
import { formatGlobalHotkey } from "./src/global-hotkey.js";
import { selectPersonalContext } from "./src/personal-context.js";
import { extractSseDeltas } from "./src/llm-stream.js";
import { getActiveSkillName } from "./src/skill-ui.js";
import { syncActiveSkill } from "./src/skill-sync.js";
import { defaultGlossary, normalizeQuestion, parseGlossaryMarkdown } from "./src/glossary.js";
import { classifyAnswerScope, selectAnswerMaterials, shouldUsePersonalContext } from "./src/answer-context-policy.js";
import { mergeHybridCandidates } from "./src/hybrid-retrieval.js";
import { withRetrievalDeadline } from "./src/retrieval-budget.js";
import { bundledKnowledgeFiles, mergeBundledDocuments } from "./src/bundled-knowledge.js";
import { downloadTextFile } from "./src/download-file.js";

const legacyDefaultTemplate = "结论\n背景\n具体行动\n结果\n复盘";
const defaultTemplate = "直接回答问题，使用自然、可口述的段落。优先说明与问题直接相关的事实、口径、做法和结果。";
function readStorage(key, fallback) { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }
function writeStorage(key, value) { try { localStorage.setItem(key, value); } catch {} }
function readJsonStorage(key, fallback) { try { const value = JSON.parse(readStorage(key, JSON.stringify(fallback))); return value ?? fallback; } catch { return fallback; } }
const savedDocuments = readJsonStorage("interview.documents", []);
const savedDeletedDocuments = readJsonStorage("interview.deletedDocuments", []);
const savedGlossary = readJsonStorage("interview.glossary", defaultGlossary);
const savedQuestionHotkey = readStorage("interview.questionCaptureHotkey", "Alt+Space");
const savedTemplate = readStorage("interview.template", defaultTemplate);
const state = { sections: [], documents: Array.isArray(savedDocuments) ? savedDocuments.map((doc) => ({ type: "knowledge", ...doc, sections: parseMarkdown(doc.markdown || "", doc.name || "未命名资料") })) : [], template: savedTemplate === legacyDefaultTemplate ? defaultTemplate : savedTemplate, templateName: readStorage("interview.templateName", "面试口头回答模板"), deletedDocuments: Array.isArray(savedDeletedDocuments) ? savedDeletedDocuments : [], editingDocument: null, repeatAudio: null, repeatListening: false, repeatText: "", repeatSilenceTimer: null, repeatFinalizeTimer: null, repeatAwaitingFinal: false, repeatCaptureId: null, repeatLastVoiceAt: 0, repeatLastAudioFrameAt: 0, repeatLastRecoveryAt: 0, repeatHasVoice: false, repeatSubmitted: false, asrProvider: "browser", savedAsrProvider: "browser", activeProjectId: readStorage("interview.activeProjectId", ""), glossary: Array.isArray(savedGlossary) ? savedGlossary : defaultGlossary, glossaryFileName: readStorage("interview.glossaryFileName", "内置 AI 产品术语"), glossaryMarkdown: readStorage("interview.glossaryMarkdown", ""), answerRules: null, answerOverlayExpanded: false, answerOverlayView: "current" };
let documentSaveQueue = Promise.resolve();
const answerState = createAnswerState();
state.questionHotkey = savedQuestionHotkey || "Alt+Space";
function refreshSearchSections() {
  state.sections = state.documents.filter((doc) => doc.type !== "skill").flatMap((doc) => doc.sections);
}
refreshSearchSections();
const $ = (id) => document.getElementById(id);
const demoMarkdown = `# 自我介绍\n我有五年产品经验，负责过从零到一的 SaaS 产品，擅长用户研究、产品规划和跨团队协作。\n\n## 项目挑战\n我通过用户访谈定位核心问题，和工程团队一起拆解方案并快速验证，最终让关键流程转化率提升了 28%。\n\n## 离职原因\n希望加入更重视用户价值和长期产品建设的团队，在更复杂的业务环境中持续成长。\n\n## 你为什么适合这个岗位\n我既能深入理解用户，也能把模糊的问题拆成清晰可执行的计划，并用数据验证结果。`;

function emptyUploadCard(kind, inputId, title, hint) {
  return `<label class="empty-module upload-drop-card" data-upload-kind="${kind}" for="${inputId}"><span>＋</span><p>${title}</p><small>${hint}</small></label>`;
}

function addDocument(name, markdown, type = "knowledge") {
  if (state.deletedDocuments.includes(name)) return;
  state.documents = state.documents.filter((doc) => doc.name !== name);
  const sections = parseMarkdown(markdown, name);
  state.documents.push({ name, markdown, type, sections });
  refreshSearchSections();
  if (type === "skill") { state.template = markdown; state.templateName = name; writeStorage("interview.template", state.template); writeStorage("interview.templateName", state.templateName); updateSkillPreview(); }
  void persistDocuments().catch(() => {});
  renderDocuments();
}

function documentPayload() {
  return state.documents.map(({ name, markdown, type }) => ({ name, markdown, type }));
}

function persistDocuments() {
  const documents = documentPayload();
  writeStorage("interview.documents", JSON.stringify(documents));
  documentSaveQueue = documentSaveQueue.catch(() => {}).then(async () => {
    const response = await fetch("/api/documents", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ documents }) });
    if (!response.ok) throw new Error("资料保存失败");
  });
  return documentSaveQueue;
}

async function loadPersistedDocuments() {
  try {
    const response = await fetch("/api/documents");
    if (!response.ok) throw new Error("读取本地资料失败");
    const payload = await response.json();
    if (Array.isArray(payload.documents) && payload.documents.length) {
      state.documents = payload.documents.map((doc) => ({ ...doc, sections: parseMarkdown(doc.markdown || "", doc.name || "未命名资料") }));
      const syncedSkill = syncActiveSkill({ documents: state.documents, templateName: state.templateName });
      if (syncedSkill) {
        state.template = syncedSkill.template;
        state.templateName = syncedSkill.templateName;
        writeStorage("interview.template", state.template);
        writeStorage("interview.templateName", state.templateName);
        updateSkillPreview();
      }
      refreshSearchSections();
      writeStorage("interview.documents", JSON.stringify(documentPayload()));
    } else if (state.documents.length) {
      void persistDocuments().catch(() => {});
    }
  } catch {
    // 首次直接打开静态页面时仍用已有浏览器缓存；桌面端会使用本地文件恢复。
  }
  renderDocuments();
}

function persistGlossary() {
  writeStorage("interview.glossary", JSON.stringify(state.glossary));
  writeStorage("interview.glossaryFileName", state.glossaryFileName);
  writeStorage("interview.glossaryMarkdown", state.glossaryMarkdown);
  if (!state.glossaryMarkdown) {
    void fetch("/api/glossary", { method: "DELETE" }).catch(() => {});
    return;
  }
  void fetch("/api/glossary", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: state.glossaryFileName, markdown: state.glossaryMarkdown }) }).catch(() => {});
}

async function loadPersistedGlossary() {
  try {
    const response = await fetch("/api/glossary");
    if (!response.ok) throw new Error("读取本机术语表失败");
    const { glossary } = await response.json();
    if (glossary?.name && glossary?.markdown) {
      const terms = parseGlossaryMarkdown(glossary.markdown);
      if (terms.length) {
        state.glossary = terms;
        state.glossaryFileName = glossary.name;
        state.glossaryMarkdown = glossary.markdown;
        writeStorage("interview.glossary", JSON.stringify(state.glossary));
        writeStorage("interview.glossaryFileName", state.glossaryFileName);
        writeStorage("interview.glossaryMarkdown", state.glossaryMarkdown);
      }
    } else if (state.glossaryMarkdown) {
      persistGlossary();
    }
  } catch {
    // 静态页面仍可使用浏览器缓存；桌面端会从本机文件恢复。
  }
  renderRetrievalSettings();
}

function deleteDocument(name) {
  const deleted = state.documents.find((doc) => doc.name === name);
  state.documents = state.documents.filter((doc) => doc.name !== name);
  refreshSearchSections();
  if (deleted?.type === "skill") { const nextSkill = state.documents.find((doc) => doc.type === "skill"); state.template = nextSkill?.markdown || defaultTemplate; state.templateName = nextSkill?.name || "面试口头回答模板"; writeStorage("interview.template", state.template); writeStorage("interview.templateName", state.templateName); updateSkillPreview(); }
  if (name === "我的飞书面试知识库.md") state.deletedDocuments.push(name);
  writeStorage("interview.deletedDocuments", JSON.stringify(state.deletedDocuments));
  void persistDocuments().catch(() => {});
  renderDocuments();
}

function downloadDocument(name) {
  const selectedDocument = state.documents.find((item) => item.type !== "skill" && item.name === name);
  if (!selectedDocument) return;
  downloadTextFile({ name: selectedDocument.name, text: selectedDocument.markdown });
}

function renderDocuments() {
  $("docCount").textContent = state.documents.length;
  if ($("knowledgeSummary")) $("knowledgeSummary").textContent = state.documents.length ? `${state.documents.length} 个资料文件已加载` : "知识库为空";
  if ($("documentList")) $("documentList").innerHTML = state.documents.filter((doc) => doc.type !== "skill").map((doc) => `<div class="doc-item"><span>▤ &nbsp;${escapeHtml(doc.name)}</span><span>${doc.sections.length} 节 <button class="delete-doc" data-doc="${escapeHtml(doc.name)}" title="删除文档">×</button></span></div>`).join("");
  const documents = state.documents.filter((doc) => doc.type !== "skill");
  $("knowledgeGrid").innerHTML = documents.length ? documents.map((doc) => `<article class="knowledge-card"><div class="knowledge-card-icon">${escapeHtml(doc.type === "transcript" ? "稿" : "KB")}</div><div class="knowledge-card-body"><h3>${escapeHtml(doc.name)}</h3><p>${escapeHtml({ transcript: "逐字稿", knowledge: "知识库" }[doc.type] || "知识库")} · ${doc.sections.length} 个章节 · ${doc.sections.reduce((sum, section) => sum + section.content.length, 0)} 字</p></div><div class="knowledge-card-actions"><button class="download-doc large" data-doc="${escapeHtml(doc.name)}">下载</button><button class="delete-doc large" data-doc="${escapeHtml(doc.name)}">删除</button></div></article>`).join("") : emptyUploadCard("documents", "fileInputModule", "拖入资料文件，或点击上传", "支持 Markdown 和 Go 源码");
  renderSkillCards();
  renderRetrievalSettings();
}

function renderSkillCards() {
  const container = $("skillCardList");
  if (!container) return;
  const skills = state.documents.filter((doc) => doc.type === "skill");
  container.innerHTML = skills.length ? skills.map((doc) => {
    const active = doc.name === state.templateName;
    const wordCount = doc.sections.reduce((sum, section) => sum + section.content.length, 0);
    return `<article class="knowledge-card skill-card${active ? " active" : ""}"><div class="knowledge-card-icon">SK</div><div class="knowledge-card-body"><h3>${escapeHtml(doc.name)}</h3><p>回答 Skill · ${doc.sections.length} 个章节 · ${wordCount} 字${active ? ' · <span class="skill-card-badge">当前应用中</span>' : ""}</p></div><div class="knowledge-card-actions"><button class="delete-doc large" data-doc="${escapeHtml(doc.name)}">删除</button></div></article>`;
  }).join("") : emptyUploadCard("skills", "skillFileInput", "拖入回答 Skill，或点击上传", "支持 Markdown，上传后自动应用");
}

function renderRulesSettings() {
  const container = $("rulesCardList");
  const rule = state.answerRules;
  if (!container || !rule) return;
  const lines = rule.markdown.split("\n").length;
  container.innerHTML = `<article class="knowledge-card"><div class="knowledge-card-icon">规则</div><div class="knowledge-card-body"><h3>${escapeHtml(rule.name)}</h3><p>回答规则 · ${lines} 行 · 已应用到下一次 LLM 回答</p></div><div class="knowledge-card-actions"><button class="secondary-button download-rules" type="button">下载</button></div></article><details class="rules-preview"><summary>查看当前规则</summary><pre>${escapeHtml(rule.markdown)}</pre></details>`;
}

function downloadRules() {
  const rule = state.answerRules;
  if (!rule) return;
  downloadTextFile({ name: rule.name, text: rule.markdown });
}

async function importRulesFile(file) {
  if (!file) return;
  const markdown = await file.text();
  if (!markdown.trim()) return;
  const response = await fetch("/api/rules", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: file.name, markdown }) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "规则文件上传失败");
  state.answerRules = payload;
  renderRulesSettings();
}

async function loadAnswerRules() {
  try {
    const response = await fetch("/api/rules");
    if (!response.ok) throw new Error("读取本机规则失败");
    state.answerRules = await response.json();
  } catch {
    state.answerRules = { name: "回答规则未加载", markdown: "请使用本地桌面版读取规则。" };
  }
  renderRulesSettings();
}

function projectOptions() {
  return createProjectOptions(state.sections);
}

function renderRetrievalSettings(message = "") {
  const container = $("glossaryCardList");
  if (!container) return;
  const isUploaded = state.glossaryFileName !== "内置 AI 产品术语";
  container.innerHTML = isUploaded ? `<article class="knowledge-card"><div class="knowledge-card-icon">术</div><div class="knowledge-card-body"><h3>${escapeHtml(state.glossaryFileName)}</h3><p>术语表 · ${state.glossary.length} 个术语 · 已自动应用</p></div><div class="knowledge-card-actions"><button class="delete-glossary large" type="button">删除</button></div></article>` : emptyUploadCard("glossary", "glossaryFileInput", message || "拖入术语表，或点击上传", "支持 Markdown，上传后自动应用");
}

function deleteGlossary() {
  state.glossary = defaultGlossary;
  state.glossaryFileName = "内置 AI 产品术语";
  state.glossaryMarkdown = "";
  persistGlossary();
  renderRetrievalSettings();
}

function formatDocumentExcerpt(content) {
  return escapeHtml(content).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\n{2,}/g, "<br /><br />").replace(/\n/g, "<br />");
}

function documentResultsHtml(query, sections = state.sections, route = routeAnswer(query, sections), retrieval = { semantic: { available: true } }) {
  const matches = route.matches;
  const routeLabels = {
    direct: "资料直答：已命中可直接作答的内容",
    compose: "资料整合：将多段资料组合回答",
    supplement: "资料补充：资料不完整，LLM 会补充组织",
    fallback: "通用生成：本地资料没有可靠答案",
  };
  const semanticNotice = retrieval.semantic?.available === false
    ? `<p class="answer-muted">语义检索暂不可用：${escapeHtml(retrieval.semantic.error || "已降级为关键词匹配")}</p>`
    : "";
  const source = `<p class="answer-muted">${routeLabels[route.mode]} · ${route.reason}</p>${semanticNotice}`;
  return source + (matches.length ? matches.map((item) => `<article class="result-card">${item.project ? `<p class="answer-muted">所属项目：${escapeHtml(item.project)}</p>` : ""}<h3>${escapeHtml(item.title)}</h3><div class="document-excerpt">${formatDocumentExcerpt(item.content)}</div><div class="score-bar"><span style="width:${Math.min(98, 55 + item.score * 4)}%"></span></div></article>`).join("") : `<div class="empty-state compact"><span>⌕</span><p>文档库没有直接匹配</p><small>LLM 会明确标记为通用生成</small></div>`);
}

function getScopedSections(query) {
  const projects = projectOptions();
  const resolved = resolveProjectContext({ question: query, projects, activeProjectId: state.activeProjectId });
  if (!shouldScopeToProject(resolved, query)) return { sections: state.sections, resolved };
  if (resolved.source === "explicit") {
    state.activeProjectId = resolved.projectId;
    writeStorage("interview.activeProjectId", resolved.projectId);
  }
  return { sections: filterSectionsForProject(state.sections, resolved.projectId), resolved };
}

function renderPreviousAnswer(previous) {
  if (!previous) return `<div class="previous-answer-modal-card previous-answer-empty" role="dialog" aria-modal="true" aria-label="上一个问题"><div class="previous-answer-modal-heading"><div><span class="section-kicker">PREVIOUS QUESTION</span><h2>还没有上一题</h2><p>完成下一道问题后，这里会保留本题的资料参考和 AI 回答。</p></div><button class="previous-answer-close" type="button" aria-label="关闭上一个问题">×</button></div></div>`;
  const documentAnswer = previous.documentHtml || `<p class="answer-muted">没有可用的文档库回答</p>`;
  const llmAnswer = previous.llmHtml || `<p class="answer-muted">回答仍在生成中</p>`;
  return `<div class="previous-answer-modal-card" role="dialog" aria-modal="true" aria-label="上一个问题"><div class="previous-answer-modal-heading"><div><span class="section-kicker">PREVIOUS QUESTION</span><h2>上一个问题</h2><p>${escapeHtml(previous.question)}</p></div><button class="previous-answer-close" type="button" aria-label="关闭上一个问题">×</button></div><div class="previous-answer-grid"><section><span class="section-kicker">DOCUMENT LIBRARY</span>${documentAnswer}</section><section><span class="section-kicker">LLM GENERATED</span>${llmAnswer}</section></div></div>`;
}

function renderAnswerOverlay() {
  const overlay = $("answerOverlay");
  const expanded = state.answerOverlayExpanded && Boolean(answerState.current);
  overlay.classList.toggle("expanded", expanded);
  $("answerOverlayBackdrop").classList.toggle("hidden", !expanded);
  const toggle = $("answerOverlayToggle");
  toggle.textContent = expanded ? "⌄" : "⌃";
  toggle.setAttribute("aria-label", expanded ? "收起回答" : "展开回答");
  toggle.title = expanded ? "收起回答" : "展开回答";
  const previousButton = $("previousAnswerButton");
  previousButton.disabled = !answerState.previous;
  previousButton.textContent = state.answerOverlayView === "previous" ? "返回当前题" : "上一题";
  syncOverlayWindow();
}

function syncOverlayWindow() {
  void window.interviewApp?.setOverlayMode?.(state.answerOverlayExpanded ? "expanded" : "collapsed");
}

function showPreviousAnswer() {
  if (!answerState.previous) return;
  state.answerOverlayView = "previous";
  state.answerOverlayExpanded = true;
  renderAnswerState();
}

function showCurrentAnswer() {
  state.answerOverlayView = "current";
  renderAnswerState();
}

function toggleAnswerOverlay() {
  state.answerOverlayExpanded = !state.answerOverlayExpanded;
  renderAnswerState();
}

function renderAnswerState() {
  const current = answerState.current;
  const previous = answerState.previous;
  const visibleAnswer = state.answerOverlayView === "previous" && previous ? previous : current;
  $("documentResults").innerHTML = visibleAnswer?.documentHtml || `<div class="empty-state compact"><span>✧</span><p>等待完整问题</p></div>`;
  $("llmResults").innerHTML = !visibleAnswer ? `<div class="empty-state compact"><span>✦</span><p>等待完整问题</p></div>` : visibleAnswer.llmHtml || `<div class="empty-state compact"><span>✦</span><p>正在生成回答</p><small>会按当前 Skill 自动组织表达</small></div>`;
  renderAnswerOverlay();
}

async function retrieveSemanticCandidates(query, sections) {
  try {
    const retrieval = await withRetrievalDeadline(fetch("/api/retrieve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, sections }),
    }).then(async (response) => {
      if (!response.ok) throw new Error("本地语义检索不可用");
      return response.json();
    }), 1500, null);
    // 语义索引首次补全时不阻塞回答；后续 mergeHybridCandidates 会立即使用精确关键词候选。
    if (!retrieval) return { matches: [], semantic: { available: false, error: "本地语义索引仍在准备，已先使用关键词资料作答" } };
    return { matches: Array.isArray(retrieval.matches) ? retrieval.matches : [], semantic: retrieval.semantic || { available: true, error: null } };
  } catch (error) {
    // 不退回宽松关键词召回，避免服务异常时把旧资料错当答案。
    return { matches: [], semantic: { available: false, error: error.message || "本地语义检索不可用" } };
  }
}

async function runSearch(query, confirm = false) {
  const cleanQuery = query.trim();
  const normalizedQuery = normalizeQuestion(cleanQuery, state.glossary);
  $("transcriptText").textContent = cleanQuery || "点击“识别问题”后复述面试官的问题";
  if (!cleanQuery) return;
  if (!confirm || !isConfirmedQuestion(cleanQuery)) return;
  const searchId = (state.searchId || 0) + 1;
  state.searchId = searchId;
  const isFollowUp = classifyTranscript(cleanQuery).followUp;
  const scoped = getScopedSections(normalizedQuery);
  const scope = classifyAnswerScope(normalizedQuery, { isFollowUp, projectSource: scoped.resolved.source });
  const materials = selectAnswerMaterials({ scope, sections: scoped.sections });
  const retrieval = await retrieveSemanticCandidates(normalizedQuery, materials);
  if (state.searchId !== searchId) return;
  const candidates = mergeHybridCandidates(normalizedQuery, materials, retrieval.matches);
  const route = routeAnswer(normalizedQuery, materials, { allowProjectOverview: scope === "project" || scope === "followup", candidates });
  const previousContext = scope === "followup" ? buildFollowUpContext(answerState.current) : "";
  const current = beginQuestion(answerState, cleanQuery, documentResultsHtml(normalizedQuery, materials, route, retrieval), previousContext);
  state.answerOverlayView = "current";
  state.answerOverlayExpanded = true;
  renderAnswerState();
  generateAnswer(normalizedQuery, current.requestId, current.context || "", route.matches, shouldUsePersonalContext(scope) ? selectPersonalContext(state.sections) : "", scope);
}

function updateQuestionCaptureHotkeyUi() {
  if ($("questionCaptureHotkey")) $("questionCaptureHotkey").value = state.questionHotkey || "Alt+Space";
}

function captureQuestionCaptureHotkey(event) {
  if (["Tab", "Escape"].includes(event.key)) return;
  event.preventDefault();
  const hotkey = formatGlobalHotkey(event);
  if (!hotkey || !hotkey.includes("+")) {
    $("questionCaptureHotkeyStatus").innerHTML = '<span class="status-dot error-dot"></span>请按“修饰键 + 普通键”，例如 Alt + Q';
    return;
  }
  state.questionHotkey = hotkey;
  updateQuestionCaptureHotkeyUi();
  $("questionCaptureHotkeyStatus").innerHTML = `<span class="status-dot"></span>已选择 ${state.questionHotkey}，正在保存到本机…`;
  void saveQuestionCaptureHotkey();
}

async function saveQuestionCaptureHotkey() {
  const status = $("questionCaptureHotkeyStatus");
  const button = $("saveQuestionCaptureHotkeyButton");
  button.disabled = true;
  status.innerHTML = '<span class="status-dot"></span>正在保存快捷键…';
  try {
    const response = await fetch("/api/config", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionCaptureHotkey: state.questionHotkey }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "保存失败");
    const configured = await window.interviewApp?.configureQuestionCaptureHotkey?.(state.questionHotkey);
    if (configured && !configured.ok) throw new Error(configured.error || "快捷键不可用");
    writeStorage("interview.questionCaptureHotkey", state.questionHotkey);
    status.innerHTML = `<span class="status-dot"></span>${state.questionHotkey} 已保存，可在其他应用中直接使用。`;
  } catch (error) {
    status.innerHTML = `<span class="status-dot error-dot"></span>${escapeHtml(error.message || "快捷键设置失败")}`;
  }
  button.disabled = false;
}

async function generateAnswer(query, requestId, previousContext = "", matches = [], personalContext = "", answerScope = "general") {
  try {
    const current = { context: previousContext };
    const requestBody = { query, context: matches, personalContext, previousContext: current.context || "", template: state.template, answerScope };
    const response = await fetch("/api/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(requestBody) });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "API 请求失败");
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("LLM 流式连接未建立");
    const decoder = new TextDecoder();
    let pending = "";
    let answer = "";
    const renderStream = () => {
      acceptLlmAnswer(answerState, requestId, `<article class="ai-result"><div class="answer-body">${escapeHtml(answer).replace(/\n{3,}/g, "\n\n").replace(/\n/g, "<br />")}</div></article>`, "loading");
      renderAnswerState();
    };
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      const events = pending.split(/\r?\n\r?\n/);
      pending = events.pop() || "";
      for (const event of events) {
        for (const delta of extractSseDeltas(event)) answer += delta;
      }
      if (answer) renderStream();
    }
    for (const delta of extractSseDeltas(pending + decoder.decode())) answer += delta;
    if (!answer) throw new Error("AI 没有返回内容");
    acceptLlmAnswer(answerState, requestId, `<article class="ai-result"><div class="answer-body">${escapeHtml(answer).replace(/\n{3,}/g, "\n\n").replace(/\n/g, "<br />")}</div></article>`);
  } catch (error) {
    acceptLlmAnswer(answerState, requestId, `<div class="empty-state compact"><span>!</span><p>${escapeHtml(error.message)}</p><small>请在设置中配置并测试 LLM API</small></div>`, "error");
  }
  renderAnswerState();
}

function setupSpeech() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    $("micLabel").textContent = "浏览器不支持";
    $("micButton").title = "请使用 Chrome 浏览器开启语音识别";
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = "zh-CN";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    const results = [];
    for (let i = event.resultIndex; i < event.results.length; i += 1) results.push({ isFinal: event.results[i].isFinal, transcript: event.results[i][0].transcript });
    const merged = mergeSpeechResults(results, 0, state.speechFinal);
    state.speechFinal = merged.finalText;
    runSearch(merged.text, false);
    clearTimeout(state.speechTimer);
    if (merged.finalText) {
      const delay = getQuestionConfirmationDelay(state.speechFinal);
      if (delay === null) return;
      state.speechTimer = setTimeout(() => {
        const question = cleanSpeechQuestion(state.speechFinal);
        if (question) runSearch(question, true);
        state.speechFinal = "";
      }, delay);
    }
  };
  recognition.onend = () => {
    if (!state.listening) return;
    clearTimeout(state.restartTimer);
    state.restartTimer = setTimeout(() => {
      if (!state.listening) return;
      try { recognition.start(); }
      catch { recognition.onend(); }
    }, 250);
  };
  recognition.onerror = (event) => {
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      state.listening = false;
      $("micLabel").textContent = "请允许麦克风";
      return;
    }
    $("micLabel").textContent = "监听中";
  };
  state.recognition = recognition;
}

function toggleListening() {
  if (getListeningMode(state.asrProvider) === "desktop") {
    return state.desktopListening ? stopDesktopAsr() : startDesktopAsr();
  }
  if (!state.recognition) return;
  state.listening = !state.listening;
  if (state.listening) {
    state.speechFinal = "";
    clearTimeout(state.restartTimer);
    try { state.recognition.start(); } catch { state.recognition.onend(); }
    $("micButton").classList.add("active"); $("transcriptCard").classList.add("listening"); $("micLabel").textContent = "监听中";
  } else {
    clearTimeout(state.restartTimer);
    state.recognition.stop(); clearTimeout(state.speechTimer); state.speechFinal = "";
    $("micButton").classList.remove("active"); $("transcriptCard").classList.remove("listening"); $("micLabel").textContent = "开始监听";
  }
}

function updatePrimaryListeningControl() {
  // 持续监听入口已移除；保留旧函数仅兼容历史配置加载。
  if (!$("micButton") || !$("micLabel")) return;
  const desktopMode = getListeningMode(state.asrProvider) === "desktop";
  const desktopControl = getDesktopControlState({ listening: state.desktopListening, starting: state.desktopStarting, isDesktop: Boolean(window.interviewApp?.isDesktop) });
  $("micLabel").textContent = desktopMode ? desktopControl.label : (state.listening ? "监听中" : "开始监听");
  $("micButton").disabled = desktopMode && desktopControl.disabled;
  $("micButton").classList.toggle("active", desktopMode ? desktopControl.active : state.listening);
}

function setDesktopStatus(message, ready = false) {
  const status = $("desktopAsrStatus");
  if (status) status.innerHTML = `<span class="status-dot ${ready ? "" : "error-dot"}"></span>${escapeHtml(message)}`;
}

async function refreshAudioDevices() {
  try {
    const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    permissionStream.getTracks().forEach((track) => track.stop());
    const devices = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === "audioinput");
    const select = $("audioDeviceSelect");
    const selected = select.value;
    select.innerHTML = `<option value="">请选择桌面音频输入</option>${devices.map((device, index) => `<option value="${escapeHtml(device.deviceId)}">${escapeHtml(device.label || `音频输入 ${index + 1}`)}</option>`).join("")}`;
    select.value = getPreferredAudioDeviceId(devices, selected);
    setDesktopStatus(devices.length ? "已读取音频设备；请选择会议音频输入" : "没有检测到音频输入设备");
  } catch {
    setDesktopStatus("无法读取音频设备，请允许麦克风权限");
  }
}

async function startDesktopAsr() {
  if (!window.interviewApp?.startAsr) return setDesktopStatus("当前是浏览器页面；请使用 npm run desktop 启动 Mac 应用");
  if (state.desktopStarting) return;
  if (!$("audioDeviceSelect").value) await refreshAudioDevices();
  const deviceId = $("audioDeviceSelect").value;
  const redirect = getDesktopStartRedirect(deviceId);
  if (redirect) {
    openView(redirect.viewId, redirect.settingsId);
    setDesktopStatus(redirect.message);
    return;
  }
  state.desktopStarting = true;
  state.committedAsrQuestion = "";
  state.partialQuestionText = "";
  state.asrTurn = createAsrTurnState();
  clearPartialQuestionTimer();
  setDesktopStatus(state.questionCommitMode === "hotkey" ? `正在开启全程监听；识别完成后按 ${state.questionHotkey} 提交问题…` : "正在开启全程监听；之后会自动识别并检索每一个完整问题…");
  updatePrimaryListeningControl();
  try {
    const connection = await window.interviewApp.startAsr();
    if (!connection.ok) {
      setDesktopStatus(connection.error || "语音服务无法启动");
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId }, echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(4096, 1, 1);
    const mute = context.createGain();
    mute.gain.value = 0;
    processor.onaudioprocess = (event) => {
      const pcm = downsampleToPcm16(event.inputBuffer.getChannelData(0), context.sampleRate);
      window.interviewApp.sendAudio(new Uint8Array(pcm));
    };
    source.connect(processor);
    processor.connect(mute);
    mute.connect(context.destination);
    await context.resume();
    state.desktopAudio = { stream, context, processor, mute };
    state.desktopListening = true;
    if ($("startDesktopAsrButton")) $("startDesktopAsrButton").disabled = true;
    if ($("stopDesktopAsrButton")) $("stopDesktopAsrButton").disabled = false;
    const supportsSpeakerFilter = state.voiceprintEnabled && (state.voicePrintVerified || state.asrProvider === "tencent");
    const listeningMessage = state.questionCommitMode === "hotkey" ? `全程监听已开启；按 ${state.questionHotkey} 提交当前识别的问题` : (supportsSpeakerFilter ? (state.voicePrintVerified ? "全程监听已开启；声纹过滤已启用，会忽略本人回答" : (state.ownSpeakerId === "" ? "全程监听已开启；请先完成声纹验证或确认你的 Speaker 编号" : `全程监听已开启；自动过滤 Speaker ${state.ownSpeakerId}`)) : "全程监听已开启；每个完整语句会自动检索（声纹过滤未启用或尚未验证）");
    setDesktopStatus(listeningMessage, state.questionCommitMode === "hotkey" || !supportsSpeakerFilter || state.voicePrintVerified || state.ownSpeakerId !== "");
    updatePrimaryListeningControl();
  } catch (error) {
    await window.interviewApp.stopAsr();
    setDesktopStatus(`无法打开音频设备：${error.message || "请检查 Mac 麦克风权限和虚拟声卡"}`);
  } finally {
    state.desktopStarting = false;
    updatePrimaryListeningControl();
  }
}

async function stopDesktopAsr() {
  clearPartialQuestionTimer();
  state.partialQuestionText = "";
  state.asrTranscript = "";
  state.hotkeyTranscript = "";
  state.asrTurn = createAsrTurnState();
  state.desktopAudio?.stream.getTracks().forEach((track) => track.stop());
  await state.desktopAudio?.context.close();
  state.desktopAudio = null;
  state.desktopListening = false;
  state.desktopStarting = false;
  await window.interviewApp?.stopAsr?.();
  if ($("startDesktopAsrButton")) $("startDesktopAsrButton").disabled = false;
  if ($("stopDesktopAsrButton")) $("stopDesktopAsrButton").disabled = true;
  setDesktopStatus("已停止桌面监听");
  updatePrimaryListeningControl();
}

function handleAsrEvent(payload) {
  if (payload.type === "ready") return setDesktopStatus(state.questionCommitMode === "hotkey" ? `全程监听已开启；按 ${state.questionHotkey} 提交当前问题` : (state.voiceprintEnabled && state.voicePrintVerified ? "全程监听已开启；声纹过滤已启用，会自动忽略本人回答" : "全程监听已开启；每个完整语句会自动检索（声纹过滤未启用或尚未验证）"), true);
  if (payload.type === "audio") return setDesktopStatus(`全程监听中：已收到 ${payload.count} 个音频包，等待识别完整问题…`, true);
  if (payload.type === "error") return setDesktopStatus(payload.message || "腾讯云识别失败");
  if (payload.type === "voiceprint") {
    const label = payload.decision === "self" ? "本人声音，已忽略" : payload.decision === "other" ? "非本人声音，可继续识别问题" : "声纹不确定，按问题完整度保守处理";
    if ($("speakerLive")) $("speakerLive").textContent = `声纹：${label}${payload.score === null || payload.score === undefined ? "" : `（相似度 ${payload.score}）`}`;
    return;
  }
  if (payload.type !== "result") return;
  const sentence = payload.sentence;
  if (state.asrProvider === "doubao") {
    const incoming = removeCommittedQuestionPrefix(state.committedAsrQuestion, sentence.sentence);
    state.asrTurn = applyAsrEvent(state.asrTurn, {
      type: sentence.sentence_type === 1 ? "final" : "partial",
      text: incoming
    });
    state.asrTranscript = state.asrTurn.rawText;
    sentence.sentence = state.asrTranscript;
  }
  const ownSpeakerId = state.ownSpeakerId === "" ? null : Number(state.ownSpeakerId);
  if ($("speakerLive")) $("speakerLive").textContent = `${state.asrProvider === "doubao" ? "豆包" : `Speaker ${sentence.speaker_id}`} · ${sentence.sentence_type === 1 ? "最终结果" : "识别中"}：${sentence.sentence || ""}`;
  const ignoreOwnVoice = shouldIgnoreOwnVoice({ provider: state.asrProvider, voiceprintEnabled: state.voiceprintEnabled, verified: state.voicePrintVerified, verification: payload.voiceprint || "unknown" });
  if (shouldDisplayAsrSentence(sentence, state.asrProvider) && shouldRenderAsrTranscript({ provider: state.asrProvider, voiceprintEnabled: state.voiceprintEnabled, verified: state.voicePrintVerified, verification: payload.voiceprint || "unknown" })) $("transcriptText").textContent = sentence.sentence;
  if (state.asrProvider === "doubao") {
    if (ignoreOwnVoice) {
      clearPartialQuestionTimer();
      state.partialQuestionText = "";
      state.hotkeyTranscript = "";
      state.asrTurn = { ...state.asrTurn, rawText: "", stableText: "", submitText: "" };
      if ($("speakerLive")) $("speakerLive").textContent = "声纹：本人声音，已忽略，不会显示、检索或生成答案";
      return;
    }
    if (state.questionCommitMode === "hotkey") {
      state.hotkeyTranscript = sentence.sentence;
      if ($("speakerLive")) $("speakerLive").textContent = `快捷键确认模式：按 ${state.questionHotkey} 提交当前问题`;
      return;
    }
    const action = decideAsrQuestionAction({ provider: state.voiceprintProvider, verified: state.voicePrintVerified, verification: payload.voiceprint || "unknown", final: sentence.sentence_type === 1, questionLike: classifyTranscript(sentence.sentence).complete });
    if (action === "ignore") {
      clearPartialQuestionTimer();
      state.partialQuestionText = "";
      if ($("speakerLive")) $("speakerLive").textContent = "声纹：本人声音，已忽略，不会检索或生成答案";
      return;
    }
    if (action === "schedule") {
      schedulePartialQuestionCommit(sentence.sentence);
      return;
    }
    if (action === "hold") {
      if ($("speakerLive")) $("speakerLive").textContent = "声纹：等待完整问题";
      return;
    }
    commitAsrQuestion(state.asrTurn.submitText || sentence.sentence);
    return;
  }
  if (shouldRouteAsrSentence(sentence, state.asrProvider, ownSpeakerId)) {
    $("transcriptText").textContent = sentence.sentence;
    runSearch(sentence.sentence, true);
  }
}

function pcmToBase64(pcm) {
  const bytes = new Uint8Array(pcm);
  let binary = "";
  const step = 0x8000;
  for (let index = 0; index < bytes.length; index += step) binary += String.fromCharCode(...bytes.subarray(index, index + step));
  return btoa(binary);
}

async function captureVoiceSample(durationMs = 6000, onProgress) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  const context = new AudioContext();
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(4096, 1, 1);
  const mute = context.createGain();
  mute.gain.value = 0;
  const parts = [];
  processor.onaudioprocess = (event) => parts.push(new Uint8Array(downsampleToPcm16(event.inputBuffer.getChannelData(0), context.sampleRate)));
  source.connect(processor);
  processor.connect(mute);
  mute.connect(context.destination);
  await context.resume();
  onProgress?.(durationMs, 0);
  const startedAt = Date.now();
  const progressTimer = setInterval(() => onProgress?.(durationMs, Date.now() - startedAt), 250);
  await new Promise((resolve) => setTimeout(resolve, durationMs));
  clearInterval(progressTimer);
  processor.disconnect();
  mute.disconnect();
  source.disconnect();
  stream.getTracks().forEach((track) => track.stop());
  await context.close();
  const size = parts.reduce((total, part) => total + part.length, 0);
  const pcm = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { pcm.set(part, offset); offset += part.length; }
  return pcm.buffer;
}

function setVoiceprintStatus(message, ready = false) {
  $("voiceprintStatus").innerHTML = `<span class="status-dot ${ready ? "" : "error-dot"}"></span>${escapeHtml(message)}`;
}

function setVoiceprintRecordingStatus(durationMs, elapsedMs = 0) {
  const status = $("voiceprintRecordingStatus");
  const remaining = Math.max(0, Math.ceil((durationMs - elapsedMs) / 1000));
  status.hidden = false;
  status.innerHTML = `<span class="recording-dot"></span>正在录音，请正常说话，还剩 ${remaining} 秒`;
}

function setVoiceprintRecordingMessage(message) {
  const status = $("voiceprintRecordingStatus");
  status.hidden = false;
  status.textContent = message;
}

function renderVoiceprintGuide(config) {
  const guide = getSelectedVoiceprintGuide(config);
  const local = config.voiceprintProvider !== "tencent";
  $("voiceprintGuide").innerHTML = guide.cards.map((card, index) => `<article class="voiceprint-step${card.complete ? " complete" : ""}"><span>0${index + 1}</span><div><small>${card.title}</small><strong>${card.label}</strong></div></article>`).join("");
  const primaryAction = $("voiceprintPrimaryAction");
  primaryAction.classList.toggle("hidden", local || !guide.primaryAction);
  primaryAction.dataset.action = guide.primaryAction?.id || "";
  primaryAction.textContent = guide.primaryAction?.label || "";
  const hasProfile = local ? Boolean(config.localVoiceprintReady) : Boolean(config.voicePrintId);
  $("voiceprintArchive").hidden = local || !config.voicePrintId;
  $("audioDeviceSection").hidden = false;
  $("voiceprintHint").textContent = local ? "本地模式的模型和声纹档案只保存在这台电脑，不会上传录音。首次录入会下载一次模型。" : "腾讯云密钥仅保存在本机，不会显示原文。腾讯云模式需要先开通声纹服务。";
  const profiles = $("voiceprintProfiles");
  profiles.hidden = !local;
  if (local) profiles.innerHTML = (config.localVoiceprintProfiles || []).map((profile) => {
    const active = profile.id === config.activeLocalVoiceprintId;
    const stateLabel = active && profile.verified ? "正在使用" : profile.verified ? "已验证" : profile.ready ? "待验证" : "尚未录入";
    const primary = !profile.ready ? `<button class="primary-button voiceprint-record-slot" data-profile-id="${profile.id}">录入</button>` : !profile.verified ? `<button class="primary-button voiceprint-verify-slot" data-profile-id="${profile.id}">验证</button>` : active ? `<button class="secondary-button" disabled>正在使用</button>` : `<button class="primary-button voiceprint-select" data-profile-id="${profile.id}">切换使用</button>`;
    return `<article class="voiceprint-profile${active ? " active" : ""}"><strong>${escapeHtml(profile.name)}</strong><small>${stateLabel}</small><div class="voice-actions">${primary}${profile.ready ? `<button class="ghost-button voiceprint-record-slot" data-profile-id="${profile.id}">重录</button><button class="ghost-button voiceprint-delete-slot" data-profile-id="${profile.id}">删除</button>` : ""}</div></article>`;
  }).join("");
}

function setVoiceprintButtonsDisabled(disabled) {
  document.querySelectorAll("#voiceprintProfiles button, #voiceprintPrimaryAction").forEach((button) => { button.disabled = disabled; });
}

function openVoiceprintCredentials() {
  document.querySelector('.settings-tab[data-settings="apiSettings"]').click();
  $("tencentConfigFields").classList.remove("hidden");
  $("tencentSecretId").focus();
}

async function recordAndEnrollVoiceprint() {
  const local = state.voiceprintProvider !== "tencent";
  const duration = local ? 12000 : 6000;
  setVoiceprintButtonsDisabled(true);
  try {
    setVoiceprintRecordingStatus(duration);
    $("voiceSampleStatus").textContent = `正在录入 ${duration / 1000} 秒本人样本，请以正常面试音量连续说话…`;
    state.voiceSamplePcm = await captureVoiceSample(duration, setVoiceprintRecordingStatus);
    setVoiceprintRecordingMessage(local ? "样本已采集，正在本机生成声纹档案。首次使用会下载模型，请稍候…" : "样本已采集，正在提交腾讯云声纹注册…");
    $("voiceSampleStatus").textContent = local ? "样本已采集，正在本机生成声纹档案。首次使用会下载模型，请稍候…" : "样本已采集，正在提交腾讯云声纹注册…";
    const response = await fetch(local ? "/api/local-voiceprint/enroll" : "/api/voiceprint/enroll", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pcm16Base64: pcmToBase64(state.voiceSamplePcm), profileId: state.activeVoiceprintId }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "声纹注册失败");
    $("voicePrintId").value = payload.voicePrintId || "";
    state.voicePrintVerified = false;
    setVoiceprintStatus("样本已录入，尚未验证：请点击“验证声纹（重新录 4 秒）”", false);
    $("voiceSampleStatus").textContent = payload.message;
    await loadAsrConfig();
  } catch (error) {
    setVoiceprintStatus(formatVoiceprintError(error.message), false);
    $("voiceSampleStatus").textContent = local ? "录入失败：请检查麦克风权限与网络（首次使用需要下载本地模型）。" : "录入失败：请检查麦克风权限、腾讯云服务开通状态和密钥。";
  } finally { setVoiceprintButtonsDisabled(false); }
}

async function verifyVoiceprint() {
  const local = state.voiceprintProvider !== "tencent";
  if (!local && !$("voicePrintId").value) return setVoiceprintStatus("请先录入本人声纹样本", false);
  setVoiceprintButtonsDisabled(true);
  try {
    setVoiceprintRecordingStatus(4000);
    $("voiceSampleStatus").textContent = "正在重新录制 4 秒独立验证样本，请以正常面试音量连续说话…";
    state.voiceVerificationPcm = await captureVoiceSample(4000, setVoiceprintRecordingStatus);
    setVoiceprintRecordingMessage(local ? "验证样本已采集，正在本机比对声纹…" : "验证样本已采集，正在提交腾讯云确认…");
    $("voiceSampleStatus").textContent = local ? "验证样本已采集，正在本机比对声纹…" : "验证样本已采集，正在提交腾讯云确认…";
    const request = fetch(local ? "/api/local-voiceprint/verify" : "/api/voiceprint/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pcm16Base64: pcmToBase64(state.voiceVerificationPcm), profileId: state.activeVoiceprintId }) });
    const response = local ? await request : await withTimeout(request, 15000, "腾讯云声纹验证超过 15 秒没有返回，请重试");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "声纹验证失败");
    state.voicePrintVerified = true;
    setVoiceprintStatus(`${payload.message}${payload.score === null ? "" : `（相似度 ${payload.score}）`}`, true);
    $("voiceSampleStatus").textContent = "验证成功。实时声纹门控正在接入桌面端音频切片。";
    await loadAsrConfig();
  } catch (error) { setVoiceprintStatus(formatVoiceprintError(error.message), false); }
  finally { state.voiceVerificationPcm = null; setVoiceprintButtonsDisabled(false); }
}

async function deleteVoiceprint() {
  try {
    const response = await fetch(state.voiceprintProvider === "tencent" ? "/api/voiceprint/profile" : "/api/local-voiceprint/profile", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ profileId: state.activeVoiceprintId }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "删除失败");
    state.voiceSamplePcm = null;
    state.voiceVerificationPcm = null;
    state.voicePrintVerified = false;
    $("voicePrintId").value = "";
    setVoiceprintStatus("未连接声纹服务：本地绑定已删除", false);
    $("voiceSampleStatus").textContent = payload.message;
    await loadAsrConfig();
  } catch (error) { setVoiceprintStatus(error.message || "删除失败", false); }
}

function escapeHtml(value) { return value.replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char])); }

function updateRepeatQuestionButton() {
  const button = $("voiceRepeatButton");
  button.textContent = state.repeatListening ? "识别中 · 点击提交" : "识别问题";
  button.classList.toggle("active", state.repeatListening);
}

function clearRepeatSilenceTimer() {
  clearInterval(state.repeatSilenceTimer);
  state.repeatSilenceTimer = null;
}

function clearRepeatFinalizeTimer() {
  clearTimeout(state.repeatFinalizeTimer);
  state.repeatFinalizeTimer = null;
}

function submitRepeatedQuestion() {
  // 录音期间可能收到多个 ASR 分段；只在静音或用户再次确认时，将整段文本作为一个问题提交。
  const question = state.repeatText.trim();
  if (!question || state.repeatSubmitted) return;
  state.repeatSubmitted = true;
  runSearch(question, true);
}

async function stopRepeatQuestion(submit = true) {
  clearRepeatSilenceTimer();
  clearRepeatFinalizeTimer();
  state.repeatAudio?.stream.getTracks().forEach((track) => track.stop());
  await state.repeatAudio?.context.close();
  state.repeatAudio = null;
  state.repeatListening = false;
  state.repeatAwaitingFinal = false;
  await window.interviewApp?.stopQuestionCapture?.();
  updateRepeatQuestionButton();
  if (submit) submitRepeatedQuestion();
}

async function finalizeRepeatQuestion() {
  if (!state.repeatListening) return;
  clearRepeatSilenceTimer();
  state.repeatAudio?.stream.getTracks().forEach((track) => track.stop());
  await state.repeatAudio?.context.close().catch(() => {});
  state.repeatAudio = null;
  state.repeatListening = false;
  state.repeatAwaitingFinal = true;
  await window.interviewApp?.stopQuestionCapture?.();
  updateRepeatQuestionButton();
  $("transcriptText").textContent = state.repeatText || "正在整理完整问题…";
  clearRepeatFinalizeTimer();
  state.repeatFinalizeTimer = setTimeout(() => {
    state.repeatAwaitingFinal = false;
    submitRepeatedQuestion();
  }, 900);
}

async function abortRepeatQuestion(message) {
  clearRepeatSilenceTimer();
  clearRepeatFinalizeTimer();
  state.repeatAudio?.stream.getTracks().forEach((track) => track.stop());
  await state.repeatAudio?.context.close().catch(() => {});
  state.repeatAudio = null;
  state.repeatListening = false;
  state.repeatAwaitingFinal = false;
  state.repeatSubmitted = true;
  await window.interviewApp?.stopQuestionCapture?.();
  updateRepeatQuestionButton();
  $("transcriptText").textContent = message;
}

async function resumeRepeatAudioContext() {
  const context = state.repeatAudio?.context;
  if (!state.repeatListening || !context || context.state !== "suspended") return;
  try { await context.resume(); }
  catch { await abortRepeatQuestion("窗口切换后麦克风没有恢复，请重新点击“识别问题”"); }
}

async function ensureRepeatAudioHealthy() {
  const audio = state.repeatAudio;
  if (!state.repeatListening || !audio) return;
  const track = audio.stream.getAudioTracks()[0];
  if (!track || track.readyState !== "live") {
    await abortRepeatQuestion("麦克风采集在窗口切换后中断，请重新点击“识别问题”");
    return;
  }
  await resumeRepeatAudioContext();
  const now = Date.now();
  // ScriptProcessor 即使没有人说话也应持续有音频帧；没有帧说明 macOS 切换后图被挂起。
  if (state.repeatLastAudioFrameAt && now - state.repeatLastAudioFrameAt > 1600 && now - state.repeatLastRecoveryAt > 1600) {
    state.repeatLastRecoveryAt = now;
    try {
      if (audio.context.state === "running") await audio.context.suspend();
      await audio.context.resume();
    } catch { await abortRepeatQuestion("窗口切换后语音采集没有恢复，请重新点击“识别问题”"); }
  }
}

async function startRepeatQuestion() {
  if (state.repeatListening) return finalizeRepeatQuestion();
  state.answerOverlayExpanded = false;
  showCurrentAnswer();
  if (!window.interviewApp?.startQuestionCapture) {
    $("transcriptText").textContent = "识别问题需要使用本地桌面版";
    return;
  }
  try {
    const connection = await window.interviewApp.startQuestionCapture();
    if (!connection?.ok) throw new Error(connection?.error || "无法启动问题识别");
    state.repeatCaptureId = connection.captureId || null;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(4096, 1, 1);
    const mute = context.createGain();
    mute.gain.value = 0;
    processor.onaudioprocess = (event) => {
      state.repeatLastAudioFrameAt = Date.now();
      const samples = event.inputBuffer.getChannelData(0);
      const energy = Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length);
      if (energy > 0.012) {
        state.repeatHasVoice = true;
        state.repeatLastVoiceAt = Date.now();
      }
      const pcm = downsampleToPcm16(samples, context.sampleRate);
      window.interviewApp.sendQuestionCaptureAudio(new Uint8Array(pcm));
    };
    source.connect(processor);
    processor.connect(mute);
    mute.connect(context.destination);
    await context.resume();
    state.repeatAudio = { stream, context, processor, mute };
    state.repeatText = "";
    state.repeatHasVoice = false;
    state.repeatSubmitted = false;
    state.repeatAwaitingFinal = false;
    clearRepeatFinalizeTimer();
    state.repeatLastVoiceAt = 0;
    state.repeatLastAudioFrameAt = Date.now();
    state.repeatLastRecoveryAt = 0;
    state.repeatListening = true;
    clearRepeatSilenceTimer();
    state.repeatSilenceTimer = setInterval(() => {
      void ensureRepeatAudioHealthy();
      if (state.repeatListening && state.repeatHasVoice && Date.now() - state.repeatLastVoiceAt >= 1200) void finalizeRepeatQuestion();
    }, 180);
    $("transcriptText").textContent = "请复述面试官的问题；停顿 1.2 秒自动提交，也可再次点击立即提交";
    updateRepeatQuestionButton();
  } catch (error) {
    await window.interviewApp?.stopQuestionCapture?.();
    $("transcriptText").textContent = error.message || "无法启动问题识别";
  }
}

function handleRepeatAsrEvent(payload) {
  if (payload?.captureId && payload.captureId !== state.repeatCaptureId) return;
  if (payload?.type === "error" || payload?.type === "closed") {
    const message = payload.message || "语音识别连接已断开，请重新点击“识别问题”";
    void abortRepeatQuestion(message);
    return;
  }
  if (payload?.type !== "result") return;
  const text = payload.sentence?.sentence?.trim() || "";
  if (!text) return;
  // 豆包可能按分段返回，也可能返回累计文本；统一合并，不能让后半句覆盖完整问题。
  state.repeatText = mergeAsrTranscript(state.repeatText, text);
  $("transcriptText").textContent = state.repeatText;
  if (payload.sentence?.sentence_type === 1 && state.repeatAwaitingFinal) {
    clearRepeatFinalizeTimer();
    state.repeatAwaitingFinal = false;
    submitRepeatedQuestion();
  }
}

async function loadBundledKnowledgeBase() {
  try {
    const bundled = (await Promise.all(bundledKnowledgeFiles.map(async (name) => {
      const response = await fetch(encodeURI(name));
      return response.ok ? { name, markdown: await response.text(), type: "knowledge" } : null;
    }))).filter(Boolean);
    if (!bundled.length) return;
    const nextDocuments = mergeBundledDocuments(state.documents, bundled);
    const before = JSON.stringify(documentPayload());
    const after = JSON.stringify(nextDocuments);
    if (before === after) return;
    state.documents = nextDocuments.map((document) => ({ ...document, sections: parseMarkdown(document.markdown, document.name) }));
    refreshSearchSections();
    await persistDocuments();
    renderDocuments();
  } catch {
    // 直接用 file:// 打开时浏览器会阻止 fetch；使用本地服务器即可自动加载。
  }
}

function setupModules() {
  document.body.classList.add("overlay-mode");
  updateSkillPreview();
  setupDropUploads();
  document.querySelectorAll(".nav-button").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll(".nav-button").forEach((item) => item.classList.toggle("active", item === button));
    document.querySelectorAll(".app-view").forEach((view) => view.classList.toggle("hidden", view.id !== button.dataset.view));
    document.body.classList.toggle("overlay-mode", button.dataset.view === "questionView");
    void window.interviewApp?.setOverlayMode?.(button.dataset.view === "settingsView" ? "settings" : (state.answerOverlayExpanded ? "expanded" : "collapsed"));
  }));
  const settingsTabs = document.querySelector(".settings-tabs");
  settingsTabs?.addEventListener("click", (event) => {
    const button = event.target.closest(".settings-tab");
    if (button) activateSettingsPanel(button.dataset.settings);
  });
  document.addEventListener("click", (event) => { const glossaryButton = event.target.closest(".delete-glossary"); if (glossaryButton && window.confirm("确定删除当前术语表吗？")) deleteGlossary(); const downloadButton = event.target.closest(".download-doc"); if (downloadButton) downloadDocument(downloadButton.dataset.doc); const deleteButton = event.target.closest(".delete-doc"); if (deleteButton && window.confirm(`确定删除“${deleteButton.dataset.doc}”吗？`)) deleteDocument(deleteButton.dataset.doc); });
  $("previousAnswerButton").addEventListener("click", () => state.answerOverlayView === "previous" ? showCurrentAnswer() : showPreviousAnswer());
  $("answerOverlayToggle").addEventListener("click", toggleAnswerOverlay);
  $("answerOverlayBackdrop").addEventListener("click", () => {
    state.answerOverlayExpanded = false;
    renderAnswerState();
  });
  $("answerOverlayBody").addEventListener("click", (event) => {
    if (event.target.closest(".answer-body, .document-excerpt, .result-card p, .result-card h3, .result-meta, .score-bar, .empty-state, .source-heading")) return;
    state.answerOverlayExpanded = false;
    renderAnswerState();
  });
  $("overlaySettingsButton").addEventListener("click", () => document.querySelector('.nav-button[data-view="settingsView"]').click());
  $("alwaysOnTopButton").addEventListener("click", async () => {
    const enabled = await window.interviewApp?.toggleAlwaysOnTop?.();
    if (typeof enabled !== "boolean") return;
    const button = $("alwaysOnTopButton");
    button.textContent = enabled ? "⌖" : "⌑";
    button.setAttribute("aria-label", enabled ? "取消置顶" : "置顶显示");
    button.title = enabled ? "取消置顶" : "置顶显示";
  });
  $("saveAsrConfigButton").addEventListener("click", saveAsrConfig);
  $("questionCaptureHotkey").addEventListener("keydown", captureQuestionCaptureHotkey);
  $("saveQuestionCaptureHotkeyButton").addEventListener("click", saveQuestionCaptureHotkey);
  $("testAsrConfigButton").addEventListener("click", testAsrConnection);
  $("saveLlmConfigButton").addEventListener("click", saveLlmConfig);
  $("testLlmConfigButton").addEventListener("click", testLlmConnection);
  $("asrProvider").addEventListener("change", updateAsrProviderUi);
  ["aiApiUrl", "aiModel", "aiApiKey"].forEach((id) => $(id).addEventListener("input", () => {
    $("llmConfigStatus").innerHTML = `<span class="status-dot"></span>${llmConfigChangedMessage()}`;
  }));
  $("useDeepSeekPresetButton").addEventListener("click", () => {
    $("aiApiUrl").value = "https://api.deepseek.com/chat/completions";
    $("aiModel").value = "deepseek-v4-flash";
    $("llmConfigStatus").innerHTML = '<span class="status-dot"></span>已填入 DeepSeek 示例，请填写 API Key 后保存并测试';
  });
  $("glossaryFileInput").addEventListener("change", async (event) => { await importGlossaryFile(event.target.files[0]); event.target.value = ""; });
  $("closeEditorButton").addEventListener("click", closeEditor);
  $("cancelEditorButton").addEventListener("click", closeEditor);
  $("saveEditorButton").addEventListener("click", saveEditor);
  $("voiceRepeatButton").addEventListener("click", startRepeatQuestion);
  $("transcriptCard").addEventListener("click", startRepeatQuestion);
  if (window.interviewApp?.onQuestionCaptureEvent) window.interviewApp.onQuestionCaptureEvent(handleRepeatAsrEvent);
  if (window.interviewApp?.onQuestionCaptureHotkey) window.interviewApp.onQuestionCaptureHotkey(startRepeatQuestion);
  // 主进程只有收到此确认后才会投递全局快捷键；启动过程中用户已按下的快捷键也会补发。
  void window.interviewApp?.markQuestionCaptureRendererReady?.();
  document.addEventListener("visibilitychange", () => { if (!document.hidden) void resumeRepeatAudioContext(); });
  window.addEventListener("focus", () => { void resumeRepeatAudioContext(); });
  window.interviewApp?.onOverlayBlur?.(() => {
    if (!state.answerOverlayExpanded) return;
    state.answerOverlayExpanded = false;
    renderAnswerState();
  });
  $("skillFileInput").addEventListener("change", async (event) => { await importSkillFiles(event.target.files); event.target.value = ""; });
  $("rulesFileInput").addEventListener("change", async (event) => { try { await importRulesFile(event.target.files[0]); } catch (error) { window.alert(error.message || "规则文件上传失败"); } event.target.value = ""; });
  $("rulesCardList").addEventListener("click", (event) => { if (event.target.closest(".download-rules")) downloadRules(); });
}

function setupDropUploads() {
  const targets = [
    ["knowledgeGrid", importDocumentFiles],
    ["skillCardList", importSkillFiles],
    ["glossaryCardList", async (files) => importGlossaryFile(files[0])],
  ];
  targets.forEach(([id, importFiles]) => {
    const target = $(id);
    ["dragenter", "dragover"].forEach((type) => target.addEventListener(type, (event) => { event.preventDefault(); target.classList.add("is-dragging"); }));
    ["dragleave", "drop"].forEach((type) => target.addEventListener(type, (event) => { event.preventDefault(); target.classList.remove("is-dragging"); }));
    target.addEventListener("drop", async (event) => { await importFiles([...event.dataTransfer.files]); });
  });
}

function updateSkillPreview() {
  const activeSkillName = getActiveSkillName(state.documents, state.templateName);
  if ($("activeSkillName")) $("activeSkillName").textContent = activeSkillName;
  if ($("activeSkillStatus")) $("activeSkillStatus").textContent = "已应用到后续 LLM 回答。";
}

function openView(viewId, settingsId = null) {
  document.querySelectorAll(".nav-button").forEach((button) => button.classList.toggle("active", button.dataset.view === viewId));
  document.querySelectorAll(".app-view").forEach((view) => view.classList.toggle("hidden", view.id !== viewId));
  if (settingsId) activateSettingsPanel(settingsId);
}

function activateSettingsPanel(settingsId) {
  document.querySelectorAll(".settings-tab").forEach((button) => button.classList.toggle("active", button.dataset.settings === settingsId));
  document.querySelectorAll(".settings-panel").forEach((panel) => panel.classList.toggle("hidden", panel.id !== settingsId));
  const content = document.querySelector(".settings-scroll-content");
  if (content) content.scrollTop = 0;
}

async function saveAsrConfig() {
  const button = $("saveAsrConfigButton");
  const status = $("asrConfigStatus");
  const setStatus = (message) => { status.innerHTML = message; };
  button.disabled = true;
  setStatus('<span class="status-dot"></span>正在保存到本机服务…');
  try {
    const response = await fetch("/api/config", { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify({ asrProvider: $("asrProvider").value, tencentRegion: $("tencentRegion").value, tencentAppId: $("tencentAppId").value, tencentSecretId: $("tencentSecretId").value, tencentSecretKey: $("tencentSecretKey").value, doubaoAppId: $("doubaoAppId").value, doubaoAccessToken: $("doubaoAccessToken").value, doubaoResourceId: $("doubaoResourceId").value, doubaoEndpoint: $("doubaoEndpoint").value, questionCaptureHotkey: state.questionHotkey }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "保存失败");
    setStatus(`<span class="status-dot"></span>${payload.configured ? `${payload.provider === "doubao" ? "豆包" : "腾讯云"}配置已保存到本机，刷新后仍保留` : "默认使用浏览器语音识别"}`);
    $("tencentSecretId").value = "";
    $("tencentSecretId").placeholder = secretKeyPlaceholder(payload.secretId || "未配置");
    $("tencentSecretKey").value = "";
    $("tencentSecretKey").placeholder = secretKeyPlaceholder(payload.secretKey || "未配置");
    $("doubaoAccessToken").value = "";
    $("doubaoAccessToken").placeholder = secretKeyPlaceholder(payload.doubaoAccessToken || "未配置");
    state.savedAsrProvider = payload.provider;
    state.asrProvider = payload.provider;
    state.questionHotkey = payload.questionCaptureHotkey || "Alt+Space";
    updateQuestionCaptureHotkeyUi();
    updateAsrProviderUi();
  } catch (error) { setStatus(`<span class="status-dot error-dot"></span>${escapeHtml(error.message)}`); }
  button.disabled = false;
}

async function testAsrConnection() {
  const button = $("testAsrConfigButton");
  const status = $("asrConfigStatus");
  button.disabled = true;
  status.innerHTML = '<span class="status-dot"></span>正在测试当前语音服务…';
  try {
    const response = await fetch("/api/asr/test", { method: "POST" });
    const payload = await response.json();
    if (!response.ok || !payload.usable) throw new Error(payload.error || "语音服务不可用");
    status.innerHTML = `<span class="status-dot"></span>${escapeHtml(payload.message)}`;
  } catch (error) {
    status.innerHTML = `<span class="status-dot error-dot"></span>${escapeHtml(error.message)}`;
  }
  button.disabled = false;
}

async function saveLlmConfig() {
  const button = $("saveLlmConfigButton");
  const status = $("llmConfigStatus");
  button.disabled = true;
  status.innerHTML = '<span class="status-dot"></span>正在保存到本机服务…';
  try {
    const response = await fetch("/api/config", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ aiApiUrl: $("aiApiUrl").value, aiModel: $("aiModel").value, aiApiKey: $("aiApiKey").value }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "保存失败");
    $("aiApiKey").value = "";
    $("aiApiKey").placeholder = secretKeyPlaceholder(payload.aiApiKey || "未配置");
    status.innerHTML = `<span class="status-dot"></span>${payload.llmConfigured ? "配置已保存，尚未验证；请点击“测试连接”" : "请填写 API Key"}`;
  } catch (error) { status.innerHTML = `<span class="status-dot error-dot"></span>${escapeHtml(error.message)}`; }
  button.disabled = false;
}

async function testLlmConnection() {
  const button = $("testLlmConfigButton");
  const status = $("llmConfigStatus");
  button.disabled = true;
  status.innerHTML = '<span class="status-dot"></span>正在连接模型服务…';
  try {
    const response = await fetch("/api/llm/test", { method: "POST" });
    const payload = await response.json();
    if (!response.ok || !payload.usable) throw new Error(payload.error || payload.message || "模型不可用");
    status.innerHTML = `<span class="status-dot"></span>${escapeHtml(payload.message)}`;
  } catch (error) {
    status.innerHTML = `<span class="status-dot error-dot"></span>不可用：${escapeHtml(error.message)}`;
  }
  button.disabled = false;
}

async function loadAsrConfig() {
  try {
    const response = await fetch("/api/config");
    if (!response.ok) return;
    const config = await response.json();
    $("asrProvider").value = config.provider || "browser";
    state.asrProvider = config.provider || "browser";
    state.savedAsrProvider = state.asrProvider;
    $("tencentRegion").value = config.region || "ap-guangzhou";
    $("tencentAppId").value = config.appId || "";
    $("tencentSecretId").value = "";
    $("tencentSecretId").placeholder = secretKeyPlaceholder(config.secretId || "未配置");
    $("tencentSecretKey").placeholder = secretKeyPlaceholder(config.secretKey || "未配置");
    $("doubaoAppId").value = config.doubaoAppId || "";
    $("doubaoAccessToken").value = "";
    $("doubaoAccessToken").placeholder = secretKeyPlaceholder(config.doubaoAccessToken || "未配置");
    $("doubaoResourceId").value = config.doubaoResourceId || "";
    $("doubaoEndpoint").value = config.doubaoEndpoint || "wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async";
    state.questionHotkey = config.questionCaptureHotkey || savedQuestionHotkey || "Alt+Space";
    updateQuestionCaptureHotkeyUi();
    updateAsrProviderUi();
    $("asrConfigStatus").innerHTML = `<span class="status-dot"></span>${config.configured ? `${config.provider === "doubao" ? "豆包" : "腾讯云"}配置已保存到本机` : "默认使用浏览器语音识别"}`;
    $("aiApiUrl").value = config.aiApiUrl || "https://api.openai.com/v1/chat/completions";
    $("aiModel").value = config.aiModel || "gpt-4o-mini";
    $("aiApiKey").value = "";
    $("aiApiKey").placeholder = secretKeyPlaceholder(config.aiApiKey || "未配置");
    const llmStatusClass = config.llmConfigured && !config.llmValid ? "error-dot" : "status-dot";
    const llmMessage = config.llmConfigured ? (config.llmValid ? "配置已保存，尚未测试连接" : `配置有误：${config.llmMessage}`) : "尚未配置 LLM API";
    $("llmConfigStatus").innerHTML = `<span class="${llmStatusClass}"></span>${escapeHtml(llmMessage)}`;
  } catch {
    // 直接打开静态文件时没有本地 API，不影响浏览器识别模式。
  }
}

function updateAsrProviderUi() {
  const provider = $("asrProvider").value;
  state.asrProvider = provider;
  $("tencentConfigFields").classList.toggle("hidden", provider !== "tencent");
  $("doubaoConfigFields").classList.toggle("hidden", provider !== "doubao");
  $("testAsrConfigButton").textContent = provider === "browser" ? "浏览器模式无需测试" : "测试当前语音服务";
  $("testAsrConfigButton").disabled = provider === "browser";
  const providerHelp = $("asrProviderHelp");
  if (providerHelp) providerHelp.textContent = provider === "doubao" ? "豆包使用 App ID、Access Token 和资源 ID。保存后请测试连接；Access Token 仅保存在本机。" : provider === "tencent" ? "腾讯云 V2 需要 AppID、SecretID、SecretKey。保存后请测试连接。" : "浏览器模式不需要密钥，但不支持桌面会议音频转写。";
}

function openEditor(name) {
  const documentItem = state.documents.find((doc) => doc.name === name);
  if (!documentItem) return;
  state.editingDocument = documentItem;
  $("editorFileName").value = documentItem.name;
  $("editorContent").value = documentItem.markdown;
  $("editorModal").classList.remove("hidden");
}

function closeEditor() {
  state.editingDocument = null;
  $("editorModal").classList.add("hidden");
}

function saveEditor() {
  if (!state.editingDocument) return;
  const nextName = $("editorFileName").value.trim() || state.editingDocument.name;
  const nextMarkdown = $("editorContent").value;
  state.editingDocument.name = nextName;
  state.editingDocument.markdown = nextMarkdown;
  state.editingDocument.sections = parseMarkdown(nextMarkdown, nextName);
  if (state.editingDocument.type === "skill") { state.template = nextMarkdown; state.templateName = nextName; writeStorage("interview.template", state.template); writeStorage("interview.templateName", state.templateName); }
  refreshSearchSections();
  void persistDocuments().catch(() => {});
  updateSkillPreview();
  renderDocuments();
  closeEditor();
}

async function importDocumentFiles(files) { for (const file of files) { state.deletedDocuments = state.deletedDocuments.filter((name) => name !== file.name); addDocument(file.name, await file.text(), "knowledge"); } writeStorage("interview.deletedDocuments", JSON.stringify(state.deletedDocuments)); await persistDocuments(); }
async function importSkillFiles(files) { for (const file of files) addDocument(file.name, await file.text(), "skill"); }
async function importGlossaryFile(file) {
  if (!file) return;
  const markdown = await file.text();
  const glossary = parseGlossaryMarkdown(markdown);
  if (!glossary.length) { renderRetrievalSettings("文件未应用：未识别到有效术语"); return; }
  state.glossary = glossary;
  state.glossaryFileName = file.name;
  state.glossaryMarkdown = markdown;
  persistGlossary();
  renderRetrievalSettings();
}
$('fileInputModule').addEventListener("change", async (event) => { await importDocumentFiles(event.target.files); event.target.value = ""; });
// 示例资料仍可通过知识库文件导入；问题页不再放置上传控件。
setupModules();
renderAnswerState();
loadAsrConfig();
loadAnswerRules();
void (async () => {
  await loadPersistedDocuments();
  await loadPersistedGlossary();
  await loadBundledKnowledgeBase();
  setInterval(() => { void loadBundledKnowledgeBase(); }, 5000);
})();
