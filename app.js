import { parseMarkdown, searchSections } from "./src/search.js";
import { llmConfigChangedMessage, secretKeyPlaceholder } from "./src/config-ui.js";
import { acceptLlmAnswer, beginQuestion, buildFollowUpContext, createAnswerState, isConfirmedQuestion, setQuestionContext, setQuestionDocument } from "./src/answer-state.js";
import { downsampleToPcm16 } from "./src/audio-pcm.js";
import { resolveProjectContext, shouldScopeToProject } from "./src/project-context.js";
import { createProjectOptions, filterSectionsForProject } from "./src/project-aliases.js";
import { routeAnswer } from "./src/answer-router.js";
import { classifyTranscript } from "./src/turn-detector.js";
import { mergeAsrTranscript } from "./src/asr-transcript-buffer.js";
import { normalizeAsrQuestion } from "./src/question-turn.js";
import { formatGlobalHotkey } from "./src/global-hotkey.js";
import { nextQuestionCaptureAction, nextQuestionCaptureTerminalAction, questionCaptureFinalResultWaitMs, questionCaptureRestartDelayMs, questionCaptureSilenceMs } from "./src/question-capture.js";
import { decideQuestionCaptureHealth } from "./src/question-capture-health.js";
import { selectPersonalContext } from "./src/personal-context.js";
import { extractSseDeltas } from "./src/llm-stream.js";
import { getActiveSkillName } from "./src/skill-ui.js";
import { syncActiveSkill } from "./src/skill-sync.js";
import { defaultGlossary, mergeGlossaryTerms, normalizeQuestion, parseGlossaryMarkdown } from "./src/glossary.js";
import { classifyAnswerScope, selectAnswerMaterials, shouldUsePersonalContext } from "./src/answer-context-policy.js";
import { mergeHybridCandidates } from "./src/hybrid-retrieval.js";
import { selectAnswerEvidence } from "./src/answer-evidence.js";
import { selectLlmAnswerMaterials } from "./src/llm-answer-materials.js";
import { withRetrievalDeadline } from "./src/retrieval-budget.js";
import { bundledKnowledgeFiles, mergeBundledDocuments } from "./src/bundled-knowledge.js";
import { downloadTextFile } from "./src/download-file.js";
import { nextOverlayWindowMode } from "./src/overlay-mode-sync.js";
import { nextVisibleTranscript } from "./src/asr-display.js";
import { extractOriginalAnswer } from "./src/document-excerpt.js";
import { hydrateDocumentsInBatches } from "./src/startup-hydration.js";
import { buildLlmContext } from "./src/llm-context.js";

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
const state = { sections: [], documents: Array.isArray(savedDocuments) ? savedDocuments.map((doc) => ({ type: "knowledge", ...doc, sections: [] })) : [], template: savedTemplate === legacyDefaultTemplate ? defaultTemplate : savedTemplate, templateName: readStorage("interview.templateName", "面试口头回答模板"), deletedDocuments: Array.isArray(savedDeletedDocuments) ? savedDeletedDocuments : [], editingDocument: null, repeatAudio: null, repeatListening: false, repeatText: "", repeatSilenceTimer: null, repeatFinalizeTimer: null, repeatRestartTimer: null, repeatReadyAt: 0, repeatAwaitingFinal: false, pendingQuestionCaptureStart: false, repeatCaptureId: null, repeatLastVoiceAt: 0, repeatLastAudioFrameAt: 0, repeatLastRecoveryAt: 0, repeatHasVoice: false, repeatSubmitted: false, repeatRecovering: false, knowledgeReady: false, asrProvider: "browser", savedAsrProvider: "browser", activeProjectId: readStorage("interview.activeProjectId", ""), glossary: mergeGlossaryTerms(Array.isArray(savedGlossary) ? savedGlossary : []), glossaryFileName: readStorage("interview.glossaryFileName", "内置 AI 产品术语"), glossaryMarkdown: readStorage("interview.glossaryMarkdown", ""), answerRules: null, answerOverlayExpanded: false, answerOverlayView: "current" };
let documentSaveQueue = Promise.resolve();
let syncedOverlayWindowMode = null;
const answerState = createAnswerState();
const allowedQuestionCaptureSources = new Set(["button", "hotkey", "recovery", "queued"]);
state.questionHotkey = savedQuestionHotkey || "Alt+Space";
function refreshSearchSections() {
  state.sections = state.documents.filter((doc) => doc.type !== "skill" && doc.type !== "converter-skill").flatMap((doc) => doc.sections);
}
refreshSearchSections();
const $ = (id) => document.getElementById(id);
function yieldToUi() {
  return new Promise((resolve) => window.requestAnimationFrame(resolve));
}

function hydrateDocumentSections(documents) {
  return hydrateDocumentsInBatches(documents, parseMarkdown, { yieldToUi });
}
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
      state.documents = await hydrateDocumentSections(payload.documents);
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

function syncQuestionCaptureHotwords() {
  const terms = state.glossary.map((entry) => entry?.term).filter(Boolean);
  return window.interviewApp?.configureQuestionCaptureHotwords?.(terms);
}

async function loadPersistedGlossary() {
  try {
    const response = await fetch("/api/glossary");
    if (!response.ok) throw new Error("读取本机术语表失败");
    const { glossary } = await response.json();
    if (glossary?.name && glossary?.markdown) {
      const terms = parseGlossaryMarkdown(glossary.markdown);
      if (terms.length) {
        state.glossary = mergeGlossaryTerms(terms);
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
  void syncQuestionCaptureHotwords();
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
  if ($("documentList")) $("documentList").innerHTML = state.documents.filter((doc) => doc.type !== "skill" && doc.type !== "converter-skill").map((doc) => `<div class="doc-item"><span>▤ &nbsp;${escapeHtml(doc.name)}</span><span>${doc.sections.length} 节 <button class="delete-doc" data-doc="${escapeHtml(doc.name)}" title="删除文档">×</button></span></div>`).join("");
  const documents = state.documents.filter((doc) => doc.type !== "skill" && doc.type !== "converter-skill" && doc.name !== state.glossaryFileName);
  $("knowledgeGrid").innerHTML = documents.length ? documents.map((doc) => `<article class="knowledge-card preview-doc" data-preview-doc="${escapeHtml(doc.name)}"><div class="knowledge-card-icon">${escapeHtml(doc.type === "transcript" ? "稿" : "KB")}</div><div class="knowledge-card-body"><h3>${escapeHtml(doc.name)}</h3><p>${escapeHtml({ transcript: "逐字稿", knowledge: "知识库" }[doc.type] || "知识库")} · ${doc.sections.length} 个章节 · ${doc.sections.reduce((sum, section) => sum + section.content.length, 0)} 字</p></div><div class="knowledge-card-actions"><button class="secondary-button download-doc large" data-doc="${escapeHtml(doc.name)}">下载</button><button class="secondary-button delete-doc large" data-doc="${escapeHtml(doc.name)}">删除</button></div></article>`).join("") : emptyUploadCard("documents", "fileInputModule", "拖入资料文件，或点击上传", "支持 Markdown 和 Go 源码");
  renderSkillCards();
  renderConverterSkillTabs();
  renderConverterSkillCards();
  renderRetrievalSettings();
}

function renderSkillCards() {
  const container = $("skillCardList");
  if (!container) return;
  const skills = state.documents.filter((doc) => doc.type === "skill");
  container.innerHTML = skills.length ? skills.map((doc) => {
    const active = doc.name === state.templateName;
    const wordCount = doc.sections.reduce((sum, section) => sum + section.content.length, 0);
    return `<article class="knowledge-card skill-card preview-doc${active ? " active" : ""}" data-preview-doc="${escapeHtml(doc.name)}"><div class="knowledge-card-icon">SK</div><div class="knowledge-card-body"><h3>${escapeHtml(doc.name)}</h3><p>回答 Skill · ${doc.sections.length} 个章节 · ${wordCount} 字${active ? ' · <span class="skill-card-badge">当前应用中</span>' : ""}</p></div><div class="knowledge-card-actions"><button class="secondary-button download-doc large" data-doc="${escapeHtml(doc.name)}">下载</button><button class="secondary-button delete-doc large" data-doc="${escapeHtml(doc.name)}">删除</button></div></article>`;
  }).join("") : emptyUploadCard("skills", "skillFileInput", "拖入回答 Skill，或点击上传", "支持 Markdown，上传后自动应用");
}

function converterSkillPanelId(name) {
  return `converterSkill-${encodeURIComponent(name)}`;
}

function renderConverterSkillTabs() {
  const tabs = $("converterSkillTabs");
  const content = document.querySelector(".settings-scroll-content");
  if (!tabs || !content) return;
  const skills = state.documents.filter((doc) => doc.type === "converter-skill");
  tabs.innerHTML = skills.map((doc) => `<button class="settings-tab converter-skill-tab" data-settings="${escapeHtml(converterSkillPanelId(doc.name))}" data-converter-skill="${escapeHtml(doc.name)}">${escapeHtml(doc.name.replace(/\.(md|markdown)$/iu, ""))}</button>`).join("");
  content.querySelectorAll(".converter-skill-panel").forEach((panel) => panel.remove());
  skills.forEach((doc) => {
    const wordCount = doc.sections.reduce((sum, section) => sum + section.content.length, 0);
    const panel = document.createElement("div");
    panel.className = "settings-panel hidden converter-skill-panel";
    panel.id = converterSkillPanelId(doc.name);
    panel.innerHTML = `<div class="module-header compact"><div><span class="section-kicker">DOCUMENT CONVERSION SKILL</span><h3>${escapeHtml(doc.name)}</h3><p>用于把原始文档整理成 Markdown 资料；不参与问答检索或回答生成。</p></div></div><div class="knowledge-grid"><article class="knowledge-card preview-doc" data-preview-doc="${escapeHtml(doc.name)}"><div class="knowledge-card-icon">CV</div><div class="knowledge-card-body"><h3>${escapeHtml(doc.name)}</h3><p>资料转换 Skill · ${doc.sections.length} 个章节 · ${wordCount} 字</p></div><div class="knowledge-card-actions"><button class="secondary-button download-converter-skill large" data-doc="${escapeHtml(doc.name)}">下载</button><button class="secondary-button delete-doc large" data-doc="${escapeHtml(doc.name)}">删除</button></div></article></div>`;
    content.append(panel);
  });
}

function renderConverterSkillCards() {
  const container = $("converterSkillCardList");
  if (!container) return;
  const skills = state.documents.filter((doc) => doc.type === "converter-skill");
  container.innerHTML = skills.length ? skills.map((doc) => `<article class="knowledge-card preview-doc" data-preview-doc="${escapeHtml(doc.name)}"><div class="knowledge-card-icon">CV</div><div class="knowledge-card-body"><h3>${escapeHtml(doc.name)}</h3><p>资料转换 Skill · 已保存到本机 · 不参与面试回答</p></div><div class="knowledge-card-actions"><button class="secondary-button download-converter-skill large" data-doc="${escapeHtml(doc.name)}">下载</button><button class="secondary-button delete-doc large" data-doc="${escapeHtml(doc.name)}">删除</button></div></article>`).join("") : emptyUploadCard("converter-skills", "converterSkillFileInput", "拖入资料转换 Skill，或点击上传", "支持 Markdown；每个 Skill 会成为顶部独立标签");
}

function renderRulesSettings() {
  const container = $("rulesCardList");
  const rule = state.answerRules;
  if (!container || !rule) return;
  const lines = rule.markdown.split("\n").length;
  container.innerHTML = `<article class="knowledge-card preview-doc" data-preview-kind="rules"><div class="knowledge-card-icon">规则</div><div class="knowledge-card-body"><h3>${escapeHtml(rule.name)}</h3><p>回答规则 · ${lines} 行 · 已应用到下一次 LLM 回答</p></div><div class="knowledge-card-actions"><button class="secondary-button download-rules" type="button">下载</button><button class="secondary-button delete-rules" type="button">删除</button></div></article>`;
}

function downloadRules() {
  const rule = state.answerRules;
  if (!rule) return;
  downloadTextFile({ name: rule.name, text: rule.markdown });
}

async function deleteRules() {
  if (!window.confirm("确定删除当前回答规则并恢复内置默认规则吗？")) return;
  const response = await fetch("/api/rules", { method: "DELETE" });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "删除回答规则失败");
  state.answerRules = payload;
  renderRulesSettings();
}

function openDocumentPreview({ name, markdown, kind = "DOCUMENT" }) {
  if (!markdown?.trim()) return;
  $("documentPreviewKind").textContent = kind;
  $("documentPreviewTitle").textContent = name;
  $("documentPreviewContent").textContent = markdown;
  $("documentPreviewModal").classList.remove("hidden");
}

function closeDocumentPreview() {
  $("documentPreviewModal").classList.add("hidden");
}

function previewDocumentFromCard(card) {
  const documentName = card.dataset.previewDoc;
  if (documentName) {
    const documentItem = state.documents.find((item) => item.name === documentName);
    if (documentItem) openDocumentPreview({ name: documentItem.name, markdown: documentItem.markdown, kind: documentItem.type === "converter-skill" ? "DOCUMENT CONVERSION SKILL" : documentItem.type === "skill" ? "ANSWER SKILL" : "SOURCE FILE" });
    return;
  }
  if (card.dataset.previewKind === "rules" && state.answerRules) openDocumentPreview({ name: state.answerRules.name, markdown: state.answerRules.markdown, kind: "ANSWER RULES" });
  if (card.dataset.previewKind === "glossary" && state.glossaryMarkdown) openDocumentPreview({ name: state.glossaryFileName, markdown: state.glossaryMarkdown, kind: "TERM GLOSSARY" });
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
  container.innerHTML = isUploaded ? `<article class="knowledge-card preview-doc" data-preview-kind="glossary"><div class="knowledge-card-icon">术</div><div class="knowledge-card-body"><h3>${escapeHtml(state.glossaryFileName)}</h3><p>术语表 · ${state.glossary.length} 个术语 · 已自动应用</p></div><div class="knowledge-card-actions"><button class="secondary-button download-glossary large" type="button">下载</button><button class="secondary-button delete-glossary large" type="button">删除</button></div></article>` : emptyUploadCard("glossary", "glossaryFileInput", message || "拖入术语表，或点击上传", "支持 Markdown，上传后自动应用");
}

function downloadGlossary() {
  if (!state.glossaryMarkdown) return;
  downloadTextFile({ name: state.glossaryFileName, text: state.glossaryMarkdown });
}

function deleteGlossary() {
  state.glossary = defaultGlossary;
  state.glossaryFileName = "内置 AI 产品术语";
  state.glossaryMarkdown = "";
  persistGlossary();
  void syncQuestionCaptureHotwords();
  renderRetrievalSettings();
}

function formatDocumentExcerpt(content) {
  return escapeHtml(extractOriginalAnswer(content)).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\n{2,}/g, "<br /><br />").replace(/\n/g, "<br />");
}

function documentResultsHtml(query, sections = state.sections, route = routeAnswer(query, sections), retrieval = { semantic: { available: true } }) {
  const matches = route.matches;
  return matches.length ? matches.map((item) => `<article class="result-card"><div class="document-excerpt">${formatDocumentExcerpt(item.content)}</div></article>`).join("") : `<div class="empty-state compact"><span>⌕</span><p>文档库没有直接匹配</p><small>LLM 会明确标记为通用生成</small></div>`;
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
  return `<div class="previous-answer-modal-card" role="dialog" aria-modal="true" aria-label="上一个问题"><div class="previous-answer-modal-heading"><div><h2>上一个问题</h2><p>${escapeHtml(previous.question)}</p></div><button class="previous-answer-close" type="button" aria-label="关闭上一个问题">×</button></div><div class="previous-answer-grid"><section><h3>文档库参考</h3>${documentAnswer}</section><section><h3>LLM 生成回答</h3>${llmAnswer}</section></div></div>`;
}

function renderAnswerOverlay() {
  const overlay = $("answerOverlay");
  const expanded = state.answerOverlayExpanded && Boolean(answerState.current);
  overlay.classList.toggle("expanded", expanded);
  $("answerOverlayBackdrop").classList.toggle("hidden", !expanded);
  const toggle = $("answerOverlayToggle");
  toggle.innerHTML = `<i data-lucide="${expanded ? "chevron-down" : "chevron-up"}"></i>`;
  toggle.setAttribute("aria-label", expanded ? "收起回答" : "展开回答");
  toggle.title = expanded ? "收起回答" : "展开回答";
  const previousButton = $("previousAnswerButton");
  previousButton.disabled = !answerState.previous;
  previousButton.textContent = state.answerOverlayView === "previous" ? "返回当前题" : "上一题";
  window.lucide?.createIcons?.({ attrs: { "aria-hidden": "true" } });
  syncOverlayWindow();
}

function syncOverlayWindow() {
  const mode = document.querySelector('.app-view:not(.hidden)')?.id === "settingsView"
    ? "settings"
    : (state.answerOverlayExpanded ? "expanded" : "collapsed");
  const nextMode = nextOverlayWindowMode(syncedOverlayWindowMode, mode);
  if (nextMode) {
    syncedOverlayWindowMode = nextMode;
    void window.interviewApp?.setOverlayMode?.(nextMode);
  }
  window.requestAnimationFrame(() => {
    const toolbar = $("answerOverlay")?.querySelector(".question-toolbar");
    if (!toolbar) return;
    const rect = toolbar.getBoundingClientRect();
    void window.interviewApp?.setOverlayInteractiveRegions?.([{ x: rect.x, y: rect.y, width: rect.width, height: rect.height }]);
  });
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
  const displayQuery = normalizedQuery || cleanQuery;
  $("transcriptText").textContent = displayQuery || "点击“识别问题”后复述面试官的问题";
  if (!cleanQuery) return;
  if (!confirm || !isConfirmedQuestion(cleanQuery)) return;
  const searchId = (state.searchId || 0) + 1;
  state.searchId = searchId;
  const isFollowUp = classifyTranscript(cleanQuery).followUp;
  const scoped = getScopedSections(normalizedQuery);
  const scope = classifyAnswerScope(normalizedQuery, { isFollowUp, projectSource: scoped.resolved.source });
  const materials = selectAnswerMaterials({ scope, sections: scoped.sections, query: normalizedQuery });
  // 先把新题切到前台，绝不能在等待语义检索时继续展示上一题的资料和回答。
  const previousContext = scope === "followup" ? buildFollowUpContext([...(answerState.history || []), answerState.current]) : "";
  const current = beginQuestion(answerState, displayQuery, "", previousContext);
  state.answerOverlayView = "current";
  state.answerOverlayExpanded = true;
  renderAnswerState();
  const candidates = mergeHybridCandidates(normalizedQuery, materials, []);
  const route = routeAnswer(normalizedQuery, materials, { allowProjectOverview: scope === "project" || scope === "followup", candidates });
  const evidence = selectAnswerEvidence({ route });
  const llmMaterials = selectLlmAnswerMaterials({ route, materials });
  // 左侧只负责展示命中的原文；不能再用“可作为生成证据”的阈值过滤一次。
  // 右侧仍独立使用 llmMaterials 组织口述答案。
  const referenceRoute = route.matches?.length
    ? { ...route, matches: route.matches }
    : { mode: "fallback", matches: [], confidence: 0, reason: evidence.reason };
  setQuestionDocument(answerState, current.requestId, documentResultsHtml(normalizedQuery, materials, referenceRoute));
  setQuestionContext(answerState, current.requestId, buildLlmContext(llmMaterials, { maxItems: 3, maxItemChars: 1100 }));
  renderAnswerState();
  generateAnswer(normalizedQuery, current.requestId, current.context || "", llmMaterials, shouldUsePersonalContext(scope) ? selectPersonalContext(state.sections) : "", scope);

  void retrieveSemanticCandidates(normalizedQuery, materials).then((retrieval) => {
    if (state.searchId !== searchId || answerState.current?.requestId !== current.requestId) return;
    const semanticCandidates = mergeHybridCandidates(normalizedQuery, materials, retrieval.matches);
    const semanticRoute = routeAnswer(normalizedQuery, materials, {
      allowProjectOverview: scope === "project" || scope === "followup",
      candidates: semanticCandidates,
    });
    const semanticEvidence = selectAnswerEvidence({ route: semanticRoute });
    const semanticReferenceRoute = semanticRoute.matches?.length
      ? { ...semanticRoute, matches: semanticRoute.matches }
      : { mode: "fallback", matches: [], confidence: 0, reason: semanticEvidence.reason };
    setQuestionDocument(answerState, current.requestId, documentResultsHtml(normalizedQuery, materials, semanticReferenceRoute, retrieval));
    renderAnswerState();
  });
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

function escapeHtml(value) { return value.replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char])); }

function updateRepeatQuestionButton() {
  const button = $("voiceRepeatButton");
  button.disabled = !state.knowledgeReady;
  button.setAttribute("aria-busy", String(!state.knowledgeReady));
  button.querySelector("span").textContent = state.repeatListening ? "正在识别" : (state.knowledgeReady ? "识别问题" : "加载资料中");
  button.classList.toggle("active", state.repeatListening);
  $("waveform").classList.toggle("is-listening", state.repeatListening);
}

function setQuestionCaptureReady(ready) {
  state.knowledgeReady = Boolean(ready);
  updateRepeatQuestionButton();
  if (!state.knowledgeReady) {
    $("transcriptText").textContent = "正在加载本地资料与术语…";
    return;
  }
  if (!state.repeatListening) $("transcriptText").textContent = "待识别";
  // 主进程收到此确认后才投递全局快捷键，防止首题进入尚未建立的本地索引。
  void window.interviewApp?.markQuestionCaptureRendererReady?.();
}

function setupOverlayWindowDrag() {
  const card = $("transcriptCard");
  let dragStart = null;
  let moved = false;
  function finishDrag(event) {
    if (!dragStart) return;
    if (event?.pointerId != null && event.pointerId !== dragStart.pointerId) return;
    const pointerId = dragStart.pointerId;
    const didMove = moved;
    dragStart = null;
    moved = false;
    card.releasePointerCapture?.(pointerId);
    if (!didMove) return;
    event?.preventDefault?.();
    void window.interviewApp?.finishOverlayDrag?.(state.answerOverlayExpanded ? "expanded" : "collapsed");
  }
  // 文本只是状态展示和拖拽区域；识别只能由明确的按钮或全局快捷键触发。
  const stopTranscriptInteraction = (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  card.addEventListener("click", stopTranscriptInteraction, true);
  card.addEventListener("dblclick", stopTranscriptInteraction, true);
  card.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    window.getSelection?.()?.removeAllRanges?.();
    dragStart = { x: event.screenX, y: event.screenY, pointerId: event.pointerId };
    moved = false;
    card.setPointerCapture?.(event.pointerId);
  });
  card.addEventListener("pointermove", (event) => {
    if (!dragStart || event.pointerId !== dragStart.pointerId) return;
    if ((event.buttons & 1) === 0) {
      finishDrag(event);
      return;
    }
    const deltaX = event.screenX - dragStart.x;
    const deltaY = event.screenY - dragStart.y;
    if (Math.abs(deltaX) < 2 && Math.abs(deltaY) < 2) return;
    moved = true;
    card.dataset.dragged = "true";
    dragStart = { x: event.screenX, y: event.screenY, pointerId: event.pointerId };
    void window.interviewApp?.moveOverlayBy?.(deltaX, deltaY);
  });
  card.addEventListener("pointerup", finishDrag);
  card.addEventListener("pointercancel", finishDrag);
  window.addEventListener("pointerup", finishDrag, true);
  window.addEventListener("pointercancel", finishDrag, true);
  window.addEventListener("blur", finishDrag);
  card.addEventListener("selectstart", (event) => event.preventDefault());
}

function clearRepeatSilenceTimer() {
  clearInterval(state.repeatSilenceTimer);
  state.repeatSilenceTimer = null;
}

function clearRepeatFinalizeTimer() {
  clearTimeout(state.repeatFinalizeTimer);
  state.repeatFinalizeTimer = null;
}

function queueNextQuestionCapture() {
  state.pendingQuestionCaptureStart = true;
  clearTimeout(state.repeatRestartTimer);
  const waitMs = Math.max(0, state.repeatReadyAt - Date.now());
  state.repeatRestartTimer = setTimeout(() => {
    state.repeatRestartTimer = null;
    if (!state.pendingQuestionCaptureStart || state.repeatAwaitingFinal) return;
    state.pendingQuestionCaptureStart = false;
    void startRepeatQuestion({ source: "queued" });
  }, waitMs);
}

function submitRepeatedQuestion() {
  // 录音期间可能收到多个 ASR 分段；只在静音或用户再次确认时，将整段文本作为一个问题提交。
  const question = normalizeAsrQuestion(state.repeatText);
  if (!question || state.repeatSubmitted) return;
  state.repeatSubmitted = true;
  runSearch(question, true);
  return true;
}

async function stopRepeatQuestion(submit = true) {
  clearRepeatSilenceTimer();
  clearRepeatFinalizeTimer();
  state.repeatAudio?.stream.getTracks().forEach((track) => track.stop());
  await state.repeatAudio?.context.close();
  state.repeatAudio = null;
  state.repeatListening = false;
  state.repeatAwaitingFinal = false;
  state.pendingQuestionCaptureStart = false;
  clearTimeout(state.repeatRestartTimer);
  await window.interviewApp?.stopQuestionCapture?.();
  state.repeatReadyAt = Date.now() + questionCaptureRestartDelayMs;
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
  state.repeatReadyAt = Date.now() + questionCaptureRestartDelayMs;
  updateRepeatQuestionButton();
  $("transcriptText").textContent = state.repeatText || "正在整理完整问题…";
  clearRepeatFinalizeTimer();
  state.repeatFinalizeTimer = setTimeout(() => {
    state.repeatAwaitingFinal = false;
    submitRepeatedQuestion();
    if (state.pendingQuestionCaptureStart) {
      queueNextQuestionCapture();
    }
  }, questionCaptureFinalResultWaitMs);
}

async function abortRepeatQuestion(message) {
  clearRepeatSilenceTimer();
  clearRepeatFinalizeTimer();
  state.repeatAudio?.stream.getTracks().forEach((track) => track.stop());
  await state.repeatAudio?.context.close().catch(() => {});
  state.repeatAudio = null;
  state.repeatListening = false;
  state.repeatAwaitingFinal = false;
  state.pendingQuestionCaptureStart = false;
  clearTimeout(state.repeatRestartTimer);
  state.repeatSubmitted = true;
  await window.interviewApp?.stopQuestionCapture?.();
  updateRepeatQuestionButton();
  $("transcriptText").textContent = message;
}

async function resumeRepeatAudioContext() {
  const context = state.repeatAudio?.context;
  if (!state.repeatListening || !context || context.state !== "suspended") return;
  try { await context.resume(); }
  catch { await rebuildRepeatQuestionCapture(); }
}

async function ensureRepeatAudioHealthy() {
  const audio = state.repeatAudio;
  if (!state.repeatListening || !audio) return;
  const track = audio.stream.getAudioTracks()[0];
  const now = Date.now();
  const action = decideQuestionCaptureHealth({
    listening: state.repeatListening,
    trackLive: track?.readyState === "live",
    contextState: audio.context.state,
    hasRecentFrames: now - state.repeatLastAudioFrameAt <= 1600
  });
  if (action === "resume") return resumeRepeatAudioContext();
  if (action === "rebuild" && now - state.repeatLastRecoveryAt > 3000) await rebuildRepeatQuestionCapture();
}

async function rebuildRepeatQuestionCapture() {
  if (!state.repeatListening || state.repeatRecovering) return;
  state.repeatRecovering = true;
  const preservedText = state.repeatText;
  try {
    clearRepeatSilenceTimer();
    state.repeatAudio?.stream.getTracks().forEach((track) => track.stop());
    await state.repeatAudio?.context.close().catch(() => {});
    state.repeatAudio = null;
    state.repeatListening = false;
    state.repeatLastRecoveryAt = Date.now();
    await window.interviewApp?.stopQuestionCapture?.();
    await startRepeatQuestion({ preservedText, source: "recovery" });
  } finally {
    state.repeatRecovering = false;
  }
}

async function startRepeatQuestion({ preservedText = null, source = null } = {}) {
  if (!allowedQuestionCaptureSources.has(source)) return;
  if (!state.knowledgeReady) {
    $("transcriptText").textContent = "正在加载本地资料与术语，请稍候…";
    return;
  }
  const action = nextQuestionCaptureAction({ active: state.repeatListening, waitingFinal: state.repeatAwaitingFinal });
  if (action === "submit") return finalizeRepeatQuestion();
  if (action === "queue") {
    queueNextQuestionCapture();
    $("transcriptText").textContent = "已收到快捷键；正在提交上一题，马上开始识别下一题";
    return;
  }
  if (Date.now() < state.repeatReadyAt) {
    queueNextQuestionCapture();
    $("transcriptText").textContent = "已收到快捷键；上一题连接正在释放，马上开始识别下一题";
    return;
  }
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
    state.repeatText = preservedText ?? "";
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
      if (state.repeatListening && state.repeatHasVoice && Date.now() - state.repeatLastVoiceAt >= questionCaptureSilenceMs) void finalizeRepeatQuestion();
    }, 180);
    $("transcriptText").textContent = "待识别";
    updateRepeatQuestionButton();
  } catch (error) {
    await window.interviewApp?.stopQuestionCapture?.();
    updateRepeatQuestionButton();
    $("transcriptText").textContent = error.message || "无法启动问题识别";
  }
}

function handleRepeatAsrEvent(payload) {
  if (payload?.captureId && payload.captureId !== state.repeatCaptureId) return;
  if (payload?.type === "ready") {
    if (!state.repeatText) $("transcriptText").textContent = "待识别";
    return;
  }
  if (payload?.type === "audio") {
    // 音频帧仅用于后台健康检查，顶部始终只展示识别出的文字。
    return;
  }
  if (payload?.type === "error" || payload?.type === "closed") {
    const terminalAction = nextQuestionCaptureTerminalAction({
      listening: state.repeatListening,
      awaitingFinal: state.repeatAwaitingFinal,
    });
    // 主动停止后豆包会延迟关闭旧 WebSocket；这是预期行为，不能清空已排队的下一题。
    if (terminalAction === "ignore") return;
    if (terminalAction === "submit") {
      clearRepeatFinalizeTimer();
      state.repeatAwaitingFinal = false;
      submitRepeatedQuestion();
      if (state.pendingQuestionCaptureStart) queueNextQuestionCapture();
      return;
    }
    const message = payload.message || "语音识别连接已断开，请重新点击“识别问题”";
    void abortRepeatQuestion(message);
    return;
  }
  if (payload?.type !== "result") return;
  const text = payload.sentence?.sentence?.trim() || "";
  if (!text) return;
  // 豆包可能按分段返回，也可能返回累计文本。累计全文以最新事件覆盖，
  // 分段结果才拼接，避免服务端回改前文时把同一句显示两遍。
  state.repeatText = mergeAsrTranscript(state.repeatText, text, { isCumulative: payload.isCumulative });
    // 监听时先展示原始累计转写；提交后仍由 runSearch 展示归一化后的完整问题。
    $("transcriptText").textContent = nextVisibleTranscript({
      current: $("transcriptText").textContent,
      incomingText: state.repeatAwaitingFinal ? "" : text,
      mergedText: state.repeatText,
      sentenceType: payload.sentence?.sentence_type,
    });
  if (payload.sentence?.sentence_type === 1 && state.repeatAwaitingFinal) {
    clearRepeatFinalizeTimer();
    state.repeatAwaitingFinal = false;
    submitRepeatedQuestion();
    if (state.pendingQuestionCaptureStart) {
      queueNextQuestionCapture();
    }
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
    state.documents = await hydrateDocumentSections(nextDocuments);
    refreshSearchSections();
    await persistDocuments();
    renderDocuments();
  } catch {
    // 直接用 file:// 打开时浏览器会阻止 fetch；使用本地服务器即可自动加载。
  }
}

async function hydrateStartupData() {
  await Promise.all([loadPersistedDocuments(), loadPersistedGlossary()]);
  setQuestionCaptureReady(true);
  void loadBundledKnowledgeBase();
}

function setupModules() {
  document.body.classList.add("overlay-mode");
  $("alwaysOnTopButton").classList.add("active");
  updateSkillPreview();
  setupDropUploads();
  document.querySelectorAll(".nav-button").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll(".nav-button").forEach((item) => item.classList.toggle("active", item === button));
    document.querySelectorAll(".app-view").forEach((view) => view.classList.toggle("hidden", view.id !== button.dataset.view));
    document.body.classList.toggle("overlay-mode", button.dataset.view === "questionView");
    syncOverlayWindow();
  }));
  function closeSettings() {
    document.querySelector('.nav-button[data-view="questionView"]').click();
  }
  $("closeSettingsButton").addEventListener("click", closeSettings);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!$("settingsView").classList.contains("hidden")) {
      closeSettings();
      return;
    }
    if (!state.answerOverlayExpanded) return;
    state.answerOverlayExpanded = false;
    renderAnswerState();
  });
  const settingsTabs = document.querySelector(".settings-tabs");
  settingsTabs?.addEventListener("click", (event) => {
    const button = event.target.closest(".settings-tab");
    if (button) activateSettingsPanel(button.dataset.settings);
  });
  document.addEventListener("click", (event) => { const glossaryButton = event.target.closest(".delete-glossary"); if (glossaryButton && window.confirm("确定删除当前术语表吗？")) { deleteGlossary(); return; } const glossaryDownloadButton = event.target.closest(".download-glossary"); if (glossaryDownloadButton) { downloadGlossary(); return; } const rulesDeleteButton = event.target.closest(".delete-rules"); if (rulesDeleteButton) { void deleteRules().catch((error) => window.alert(error.message || "删除回答规则失败")); return; } const downloadButton = event.target.closest(".download-doc"); if (downloadButton) { downloadDocument(downloadButton.dataset.doc); return; } const converterDownloadButton = event.target.closest(".download-converter-skill"); if (converterDownloadButton) { downloadDocument(converterDownloadButton.dataset.doc); return; } const deleteButton = event.target.closest(".delete-doc"); if (deleteButton && window.confirm(`确定删除“${deleteButton.dataset.doc}”吗？`)) { deleteDocument(deleteButton.dataset.doc); return; } const previewCard = event.target.closest(".preview-doc"); if (previewCard) previewDocumentFromCard(previewCard); });
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
    button.classList.toggle("active", enabled);
    button.innerHTML = `<i data-lucide="${enabled ? "pin" : "pin-off"}"></i>`;
    button.setAttribute("aria-label", enabled ? "取消置顶" : "置顶显示");
    button.title = enabled ? "取消置顶" : "置顶显示";
    window.lucide?.createIcons?.({ attrs: { "aria-hidden": "true" } });
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
  $("closeDocumentPreviewButton").addEventListener("click", closeDocumentPreview);
  $("documentPreviewModal").addEventListener("click", (event) => { if (event.target === $("documentPreviewModal")) closeDocumentPreview(); });
  $("voiceRepeatButton").addEventListener("click", () => startRepeatQuestion({ source: "button" }));
  setupOverlayWindowDrag();
  if (window.interviewApp?.onQuestionCaptureEvent) window.interviewApp.onQuestionCaptureEvent(handleRepeatAsrEvent);
  if (window.interviewApp?.onQuestionCaptureHotkey) window.interviewApp.onQuestionCaptureHotkey(() => startRepeatQuestion({ source: "hotkey" }));
  // 首个快捷键到达前先同步内置术语，避免 GEO 等专名在冷启动时缺少热词上下文。
  void syncQuestionCaptureHotwords();
  // 窗口和拖拽先可用；资料完成解析后才开放识别按钮和全局快捷键。
  setQuestionCaptureReady(false);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) void resumeRepeatAudioContext(); });
  window.addEventListener("focus", () => { void resumeRepeatAudioContext(); });
  window.interviewApp?.onOverlayBlur?.(() => {
    if (!state.answerOverlayExpanded) return;
    state.answerOverlayExpanded = false;
    renderAnswerState();
  });
  $("skillFileInput").addEventListener("change", async (event) => { await importSkillFiles(event.target.files); event.target.value = ""; });
  $("converterSkillFileInput").addEventListener("change", async (event) => { await importConverterSkillFiles(event.target.files); event.target.value = ""; });
  $("rulesFileInput").addEventListener("change", async (event) => { try { await importRulesFile(event.target.files[0]); } catch (error) { window.alert(error.message || "规则文件上传失败"); } event.target.value = ""; });
  $("rulesCardList").addEventListener("click", (event) => { if (event.target.closest(".download-rules")) downloadRules(); });
}

function setupDropUploads() {
  const targets = [
    ["knowledgeGrid", importDocumentFiles],
    ["skillCardList", importSkillFiles],
    ["converterSkillCardList", importConverterSkillFiles],
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
async function importConverterSkillFiles(files) { for (const file of files) addDocument(file.name, await file.text(), "converter-skill"); }
async function importGlossaryFile(file) {
  if (!file) return;
  const markdown = await file.text();
  const glossary = parseGlossaryMarkdown(markdown);
  if (!glossary.length) { renderRetrievalSettings("文件未应用：未识别到有效术语"); return; }
  state.glossary = mergeGlossaryTerms(glossary);
  state.glossaryFileName = file.name;
  state.glossaryMarkdown = markdown;
  persistGlossary();
  void syncQuestionCaptureHotwords();
  renderRetrievalSettings();
}
$('fileInputModule').addEventListener("change", async (event) => { await importDocumentFiles(event.target.files); event.target.value = ""; });
// 示例资料仍可通过知识库文件导入；问题页不再放置上传控件。
setupModules();
renderAnswerState();
loadAsrConfig();
loadAnswerRules();
setTimeout(() => { void hydrateStartupData(); }, 0);
