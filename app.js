import { parseMarkdown, searchSections } from "./src/search.js";
import { cleanSpeechQuestion, getQuestionConfirmationDelay, mergeSpeechResults } from "./src/speech.js";
import { llmConfigChangedMessage, secretKeyPlaceholder } from "./src/config-ui.js";
import { acceptLlmAnswer, beginQuestion, buildFollowUpContext, createAnswerState, isConfirmedQuestion } from "./src/answer-state.js";
import { shouldDisplayAsrSentence, shouldRouteAsrSentence } from "./src/speaker-filter.js";
import { getDesktopStartRedirect, getListeningMode, shouldStopBrowserListening } from "./src/listening-mode.js";
import { shouldRestartAsrAfterSave } from "./src/asr-switch.js";
import { getPreferredAudioDeviceId } from "./src/audio-device.js";
import { getDesktopControlState } from "./src/desktop-ui.js";
import { downsampleToPcm16 } from "./src/audio-pcm.js";
import { classifyTranscript, shouldCommitAfterSilence } from "./src/turn-detector.js";
import { resolveProjectContext, shouldScopeToProject } from "./src/project-context.js";
import { routeAnswer } from "./src/answer-router.js";
import { decideSpeakerGate } from "./src/speaker-gate.js";
import { removeCommittedQuestionPrefix } from "./src/asr-turn-cleaner.js";
import { shouldRefreshPartialQuestion } from "./src/partial-question.js";
import { extractLatestQuestionTurn } from "./src/question-turn.js";
import { selectPersonalContext } from "./src/personal-context.js";
import { extractSseDeltas } from "./src/llm-stream.js";
import { getActiveSkillName } from "./src/skill-ui.js";

const defaultTemplate = "结论\n背景\n具体行动\n结果\n复盘";
function readStorage(key, fallback) { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }
function writeStorage(key, value) { try { localStorage.setItem(key, value); } catch {} }
function readJsonStorage(key, fallback) { try { const value = JSON.parse(readStorage(key, JSON.stringify(fallback))); return value ?? fallback; } catch { return fallback; } }
const savedDocuments = readJsonStorage("interview.documents", []);
const savedDeletedDocuments = readJsonStorage("interview.deletedDocuments", []);
const state = { sections: [], documents: Array.isArray(savedDocuments) ? savedDocuments.map((doc) => ({ type: "knowledge", ...doc, sections: parseMarkdown(doc.markdown || "", doc.name || "未命名资料") })) : [], recognition: null, listening: false, speechFinal: "", speechTimer: null, restartTimer: null, template: readStorage("interview.template", defaultTemplate), templateName: readStorage("interview.templateName", "面试口头回答模板"), deletedDocuments: Array.isArray(savedDeletedDocuments) ? savedDeletedDocuments : [], editingDocument: null, desktopAudio: null, desktopListening: false, desktopStarting: false, ownSpeakerId: readStorage("interview.ownSpeakerId", ""), asrProvider: "browser", savedAsrProvider: "browser", partialQuestionTimer: null, partialQuestionText: "", partialQuestionUpdatedAt: 0, committedAsrQuestion: "", committedAsrAt: 0, activeProjectId: readStorage("interview.activeProjectId", ""), voiceSamplePcm: null, voicePrintVerified: false };
const answerState = createAnswerState();
state.sections = state.documents.flatMap((doc) => doc.sections);
const $ = (id) => document.getElementById(id);
const demoMarkdown = `# 自我介绍\n我有五年产品经验，负责过从零到一的 SaaS 产品，擅长用户研究、产品规划和跨团队协作。\n\n## 项目挑战\n我通过用户访谈定位核心问题，和工程团队一起拆解方案并快速验证，最终让关键流程转化率提升了 28%。\n\n## 离职原因\n希望加入更重视用户价值和长期产品建设的团队，在更复杂的业务环境中持续成长。\n\n## 你为什么适合这个岗位\n我既能深入理解用户，也能把模糊的问题拆成清晰可执行的计划，并用数据验证结果。`;

function addDocument(name, markdown, type = "knowledge") {
  if (state.deletedDocuments.includes(name)) return;
  state.documents = state.documents.filter((doc) => doc.name !== name);
  state.sections = state.documents.flatMap((doc) => doc.sections);
  const sections = parseMarkdown(markdown, name);
  state.documents.push({ name, markdown, type, sections });
  state.sections.push(...sections);
  if (type === "skill") { state.template = markdown; state.templateName = name; writeStorage("interview.template", state.template); writeStorage("interview.templateName", state.templateName); updateSkillPreview(); }
  persistDocuments();
  renderDocuments();
}

function persistDocuments() {
  writeStorage("interview.documents", JSON.stringify(state.documents.map(({ name, markdown, type }) => ({ name, markdown, type }))));
}

function deleteDocument(name) {
  const deleted = state.documents.find((doc) => doc.name === name);
  state.documents = state.documents.filter((doc) => doc.name !== name);
  state.sections = state.documents.flatMap((doc) => doc.sections);
  if (deleted?.type === "skill") { const nextSkill = state.documents.find((doc) => doc.type === "skill"); state.template = nextSkill?.markdown || defaultTemplate; state.templateName = nextSkill?.name || "面试口头回答模板"; writeStorage("interview.template", state.template); writeStorage("interview.templateName", state.templateName); updateSkillPreview(); }
  if (name === "我的飞书面试知识库.md") state.deletedDocuments.push(name);
  writeStorage("interview.deletedDocuments", JSON.stringify(state.deletedDocuments));
  persistDocuments();
  renderDocuments();
  $("matchLabel").textContent = "等待问题";
}

function renderDocuments() {
  $("docCount").textContent = state.documents.length;
  if ($("knowledgeSummary")) $("knowledgeSummary").textContent = state.documents.length ? `${state.documents.length} 个资料文件已加载` : "知识库为空";
  if ($("documentList")) $("documentList").innerHTML = state.documents.map((doc) => `<div class="doc-item"><span>▤ &nbsp;${escapeHtml(doc.name)}</span><span>${doc.sections.length} 节 <button class="edit-doc" data-edit-doc="${escapeHtml(doc.name)}" title="编辑文档">✎</button><button class="delete-doc" data-doc="${escapeHtml(doc.name)}" title="删除文档">×</button></span></div>`).join("");
  $("knowledgeGrid").innerHTML = state.documents.length ? state.documents.map((doc) => `<article class="knowledge-card"><div class="knowledge-card-icon">${escapeHtml(doc.type === "transcript" ? "稿" : doc.type === "skill" ? "SK" : "KB")}</div><div class="knowledge-card-body"><h3>${escapeHtml(doc.name)}</h3><p>${escapeHtml({ transcript: "逐字稿", knowledge: "知识库", skill: "Skill 文档" }[doc.type] || "知识库")} · ${doc.sections.length} 个章节 · ${doc.sections.reduce((sum, section) => sum + section.content.length, 0)} 字</p></div><button class="edit-doc large" data-edit-doc="${escapeHtml(doc.name)}">编辑</button><button class="delete-doc large" data-doc="${escapeHtml(doc.name)}">删除</button></article>`).join("") : `<div class="empty-module"><span>＋</span><p>还没有知识库文件</p><small>上传 Markdown 后会自动建立检索索引</small></div>`;
}

function documentResultsHtml(query, sections = state.sections, route = routeAnswer(query, sections)) {
  const matches = route.matches;
  const routeLabels = {
    direct: "资料直答：已命中可直接作答的内容",
    compose: "资料整合：将多段资料组合回答",
    supplement: "资料补充：资料不完整，LLM 会补充组织",
    fallback: "通用生成：本地资料没有可靠答案",
  };
  const source = `<p class="answer-muted">${routeLabels[route.mode]} · ${route.reason}</p>`;
  return source + (matches.length ? matches.map((item, index) => `<article class="result-card"><div class="result-meta"><span>${item.matchType === "semantic" ? "SEMANTIC" : "MATCH"} ${String(index + 1).padStart(2, "0")}</span><span>${Math.min(98, 55 + item.score * 4)}% 相关</span></div>${item.project ? `<p class="answer-muted">所属项目：${escapeHtml(item.project)}</p>` : ""}<h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.content)}</p><div class="score-bar"><span style="width:${Math.min(98, 55 + item.score * 4)}%"></span></div></article>`).join("") : `<div class="empty-state compact"><span>⌕</span><p>文档库没有直接匹配</p><small>LLM 会明确标记为通用生成</small></div>`);
}

function getScopedSections(query) {
  const names = [...new Set(state.sections.map((section) => section.project).filter(Boolean))];
  const projects = names.map((name) => ({ id: name.toLowerCase(), name, aliases: [] }));
  const resolved = resolveProjectContext({ question: query, projects, activeProjectId: state.activeProjectId });
  if (!shouldScopeToProject(resolved, query)) return state.sections;
  if (resolved.source === "explicit") {
    state.activeProjectId = resolved.projectId;
    writeStorage("interview.activeProjectId", resolved.projectId);
  }
  return state.sections.filter((section) => section.project?.toLowerCase() === resolved.projectId);
}

function renderAnswerState() {
  const current = answerState.current;
  $("previousAnswer").innerHTML = "";
  $("documentResults").innerHTML = current?.documentHtml || `<div class="empty-state compact"><span>✧</span><p>等待完整问题</p></div>`;
  $("llmResults").innerHTML = !current ? `<div class="empty-state compact"><span>✦</span><p>等待完整问题</p></div>` : current.llmHtml || `<div class="empty-state compact"><span>✦</span><p>正在生成回答</p><small>会按当前 Skill 自动组织表达</small></div>`;
  $("matchLabel").textContent = current ? (current.llmStatus === "loading" ? "LLM 生成中" : "当前问题") : "等待问题";
}

function runSearch(query, confirm = false) {
  const cleanQuery = query.trim();
  $("transcriptText").textContent = cleanQuery || "点击“开始监听”，或在下方输入一个问题开始匹配";
  if (!cleanQuery) return;
  if (!confirm || !isConfirmedQuestion(cleanQuery)) return;
  const scopedSections = getScopedSections(cleanQuery);
  const route = routeAnswer(cleanQuery, scopedSections);
  const previousContext = classifyTranscript(cleanQuery).followUp ? buildFollowUpContext(answerState.current) : "";
  const current = beginQuestion(answerState, cleanQuery, documentResultsHtml(cleanQuery, scopedSections, route), previousContext);
  renderAnswerState();
  generateAnswer(cleanQuery, current.requestId, current.context || "", route.matches, selectPersonalContext(state.sections));
}

function clearPartialQuestionTimer() {
  clearTimeout(state.partialQuestionTimer);
  state.partialQuestionTimer = null;
}

function commitAsrQuestion(text) {
  const question = extractLatestQuestionTurn(text);
  clearPartialQuestionTimer();
  state.partialQuestionText = "";
  if (!question || (state.committedAsrQuestion === question && Date.now() - state.committedAsrAt < 2500)) return;
  state.committedAsrQuestion = question;
  state.committedAsrAt = Date.now();
  runSearch(question, true);
}

function schedulePartialQuestionCommit(text) {
  const question = text.trim();
  if (!question || (state.committedAsrQuestion === question && Date.now() - state.committedAsrAt < 2500)) return;
  if (!shouldRefreshPartialQuestion(state.partialQuestionText, question)) return;
  state.partialQuestionText = question;
  state.partialQuestionUpdatedAt = Date.now();
  clearPartialQuestionTimer();
  const { complete, delayMs } = classifyTranscript(question);
  const waitMs = complete ? delayMs : 3500;
  state.partialQuestionTimer = setTimeout(() => {
    if (state.partialQuestionText !== question) return;
    const silenceMs = Date.now() - state.partialQuestionUpdatedAt;
    if (shouldCommitAfterSilence({ text: question, silenceMs })) commitAsrQuestion(question);
  }, waitMs);
}

async function generateAnswer(query, requestId, previousContext = "", matches = [], personalContext = "") {
  try {
    const current = { context: previousContext };
    const requestBody = { query, context: matches, personalContext, previousContext: current.context || "", template: state.template };
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
      acceptLlmAnswer(answerState, requestId, `<article class="result-card ai-result"><div class="result-meta"><span>AI GENERATED</span><span>生成中</span></div><h3>参考回答</h3><p>${escapeHtml(answer).replace(/\n/g, "<br />")}</p></article>`, "loading");
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
    acceptLlmAnswer(answerState, requestId, `<article class="result-card ai-result"><div class="result-meta"><span>AI GENERATED</span><span>需要确认事实</span></div><h3>参考回答</h3><p>${escapeHtml(answer).replace(/\n/g, "<br />")}</p></article>`);
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
  const desktopMode = getListeningMode(state.asrProvider) === "desktop";
  const desktopControl = getDesktopControlState({ listening: state.desktopListening, starting: state.desktopStarting, isDesktop: Boolean(window.interviewApp?.isDesktop) });
  $("micLabel").textContent = desktopMode ? desktopControl.label : (state.listening ? "监听中" : "开始监听");
  $("micButton").disabled = desktopMode && desktopControl.disabled;
  $("micButton").classList.toggle("active", desktopMode ? desktopControl.active : state.listening);
}

function setDesktopStatus(message, ready = false) {
  $("desktopAsrStatus").innerHTML = `<span class="status-dot ${ready ? "" : "error-dot"}"></span>${escapeHtml(message)}`;
  if (!answerState.current) $("transcriptText").textContent = message;
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
  clearPartialQuestionTimer();
  setDesktopStatus("正在开启全程监听；之后会自动识别并检索每一个完整问题…");
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
    $("startDesktopAsrButton").disabled = true;
    $("stopDesktopAsrButton").disabled = false;
    const supportsSpeakerFilter = state.voicePrintVerified || state.asrProvider === "tencent";
    setDesktopStatus(supportsSpeakerFilter ? (state.voicePrintVerified ? "全程监听已开启；腾讯云声纹过滤已启用，会忽略本人回答" : (state.ownSpeakerId === "" ? "全程监听已开启；请先完成声纹验证或确认你的 Speaker 编号" : `全程监听已开启；自动过滤 Speaker ${state.ownSpeakerId}`)) : "全程监听已开启；每个完整语句会自动检索（尚未启用本人声纹过滤）", !supportsSpeakerFilter || state.voicePrintVerified || state.ownSpeakerId !== "");
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
  state.desktopAudio?.stream.getTracks().forEach((track) => track.stop());
  await state.desktopAudio?.context.close();
  state.desktopAudio = null;
  state.desktopListening = false;
  state.desktopStarting = false;
  await window.interviewApp?.stopAsr?.();
  $("startDesktopAsrButton").disabled = false;
  $("stopDesktopAsrButton").disabled = true;
  setDesktopStatus("已停止桌面监听");
  updatePrimaryListeningControl();
}

function handleAsrEvent(payload) {
  if (payload.type === "ready") return setDesktopStatus(state.voicePrintVerified ? "全程监听已开启；声纹过滤已启用，会自动忽略本人回答" : "全程监听已开启；每个完整语句会自动检索（声纹过滤尚未验证）", true);
  if (payload.type === "audio") return setDesktopStatus(`全程监听中：已收到 ${payload.count} 个音频包，等待识别完整问题…`, true);
  if (payload.type === "error") return setDesktopStatus(payload.message || "腾讯云识别失败");
  if (payload.type === "voiceprint") {
    const label = payload.decision === "self" ? "本人声音，已忽略" : payload.decision === "other" ? "非本人声音，可继续识别问题" : "声纹不确定，按问题完整度保守处理";
    $("speakerLive").textContent = `声纹：${label}${payload.score === null || payload.score === undefined ? "" : `（相似度 ${payload.score}）`}`;
    return;
  }
  if (payload.type !== "result") return;
  const sentence = payload.sentence;
  if (state.asrProvider === "doubao") sentence.sentence = removeCommittedQuestionPrefix(state.committedAsrQuestion, sentence.sentence);
  if (state.asrProvider === "doubao") sentence.sentence = extractLatestQuestionTurn(sentence.sentence);
  const ownSpeakerId = state.ownSpeakerId === "" ? null : Number(state.ownSpeakerId);
  $("speakerLive").textContent = `${state.asrProvider === "doubao" ? "豆包" : `Speaker ${sentence.speaker_id}`} · ${sentence.sentence_type === 1 ? "最终结果" : "识别中"}：${sentence.sentence || ""}`;
  if (shouldDisplayAsrSentence(sentence, state.asrProvider)) $("transcriptText").textContent = sentence.sentence;
  if (state.asrProvider === "doubao") {
    const gate = decideSpeakerGate({ verification: payload.voiceprint || "other", overlap: false, questionLike: classifyTranscript(sentence.sentence).complete });
    if (gate === "ignore") {
      $("speakerLive").textContent = "声纹：本人声音，已忽略，不会检索或生成答案";
      return;
    }
    if (gate === "hold") {
      $("speakerLive").textContent = "声纹：不确定，等待更完整的疑问句";
      if (gate === "hold" && sentence.sentence_type !== 1) return;
      if (sentence.sentence_type === 1 && !classifyTranscript(sentence.sentence).complete) return;
    }
    if (sentence.sentence_type === 1) commitAsrQuestion(sentence.sentence);
    else schedulePartialQuestionCommit(sentence.sentence);
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

async function captureVoiceSample(durationMs = 6000) {
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
  await new Promise((resolve) => setTimeout(resolve, durationMs));
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

async function recordAndEnrollVoiceprint() {
  const button = $("voiceSampleButton");
  button.disabled = true;
  try {
    $("voiceSampleStatus").textContent = "正在录入 6 秒本人样本，请以正常面试音量连续说话…";
    state.voiceSamplePcm = await captureVoiceSample();
    $("voiceSampleStatus").textContent = "样本已采集，正在提交腾讯云声纹注册…";
    const response = await fetch("/api/voiceprint/enroll", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pcm16Base64: pcmToBase64(state.voiceSamplePcm) }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "声纹注册失败");
    $("voicePrintId").value = payload.voicePrintId;
    $("verifyVoiceprintButton").disabled = false;
    state.voicePrintVerified = false;
    setVoiceprintStatus("样本已注册，尚未验证：请点击“验证当前样本”", false);
    $("voiceSampleStatus").textContent = payload.message;
  } catch (error) {
    setVoiceprintStatus(error.message || "无法录入声纹样本", false);
    $("voiceSampleStatus").textContent = "录入失败：请检查麦克风权限、腾讯云服务开通状态和密钥。";
  } finally { button.disabled = false; }
}

async function verifyVoiceprint() {
  if (!state.voiceSamplePcm) return setVoiceprintStatus("请先重新录入一段本人声音样本", false);
  const button = $("verifyVoiceprintButton");
  button.disabled = true;
  try {
    const response = await fetch("/api/voiceprint/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pcm16Base64: pcmToBase64(state.voiceSamplePcm) }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "声纹验证失败");
    state.voicePrintVerified = true;
    setVoiceprintStatus(`${payload.message}${payload.score === null ? "" : `（相似度 ${payload.score}）`}`, true);
    $("voiceSampleStatus").textContent = "验证成功。实时声纹门控正在接入桌面端音频切片。";
  } catch (error) { setVoiceprintStatus(error.message || "声纹验证失败", false); }
  button.disabled = false;
}

async function deleteVoiceprint() {
  try {
    const response = await fetch("/api/voiceprint/profile", { method: "DELETE" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "删除失败");
    state.voiceSamplePcm = null;
    state.voicePrintVerified = false;
    $("voicePrintId").value = "";
    $("verifyVoiceprintButton").disabled = true;
    setVoiceprintStatus("未连接声纹服务：本地绑定已删除", false);
    $("voiceSampleStatus").textContent = payload.message;
  } catch (error) { setVoiceprintStatus(error.message || "删除失败", false); }
}

function escapeHtml(value) { return value.replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char])); }

async function loadBundledKnowledgeBase() {
  try {
    const response = await fetch("interview-knowledge-base.md");
    if (!response.ok) return;
    addDocument("我的飞书面试知识库.md", await response.text());
  } catch {
    // 直接用 file:// 打开时浏览器会阻止 fetch；使用本地服务器即可自动加载。
  }
}

function setupModules() {
  updateSkillPreview();
  document.querySelectorAll(".nav-button").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll(".nav-button").forEach((item) => item.classList.toggle("active", item === button));
    document.querySelectorAll(".app-view").forEach((view) => view.classList.toggle("hidden", view.id !== button.dataset.view));
  }));
  document.querySelectorAll(".settings-tab").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll(".settings-tab").forEach((item) => item.classList.toggle("active", item === button));
    document.querySelectorAll(".settings-panel").forEach((panel) => panel.classList.toggle("hidden", panel.id !== button.dataset.settings));
  }));
  document.addEventListener("click", (event) => { const deleteButton = event.target.closest(".delete-doc"); if (deleteButton && window.confirm(`确定删除“${deleteButton.dataset.doc}”吗？`)) deleteDocument(deleteButton.dataset.doc); const editButton = event.target.closest(".edit-doc"); if (editButton) openEditor(editButton.dataset.editDoc); });
  $("saveAsrConfigButton").addEventListener("click", saveAsrConfig);
  $("testAsrConfigButton").addEventListener("click", testAsrConnection);
  $("saveLlmConfigButton").addEventListener("click", saveLlmConfig);
  $("testLlmConfigButton").addEventListener("click", testLlmConnection);
  $("refreshAudioDevicesButton").addEventListener("click", refreshAudioDevices);
  $("startDesktopAsrButton").addEventListener("click", startDesktopAsr);
  $("stopDesktopAsrButton").addEventListener("click", stopDesktopAsr);
  if (window.interviewApp?.onAsrEvent) window.interviewApp.onAsrEvent(handleAsrEvent);
  $("asrProvider").addEventListener("change", updateAsrProviderUi);
  ["aiApiUrl", "aiModel", "aiApiKey"].forEach((id) => $(id).addEventListener("input", () => {
    $("llmConfigStatus").innerHTML = `<span class="status-dot"></span>${llmConfigChangedMessage()}`;
  }));
  $("useDeepSeekPresetButton").addEventListener("click", () => {
    $("aiApiUrl").value = "https://api.deepseek.com/chat/completions";
    $("aiModel").value = "deepseek-v4-flash";
    $("llmConfigStatus").innerHTML = '<span class="status-dot"></span>已填入 DeepSeek 示例，请填写 API Key 后保存并测试';
  });
  $("voiceSampleButton").addEventListener("click", recordAndEnrollVoiceprint);
  $("verifyVoiceprintButton").addEventListener("click", verifyVoiceprint);
  $("deleteVoiceprintButton").addEventListener("click", deleteVoiceprint);
  $("closeEditorButton").addEventListener("click", closeEditor);
  $("cancelEditorButton").addEventListener("click", closeEditor);
  $("saveEditorButton").addEventListener("click", saveEditor);
  $("skillFileInput").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (file) addDocument(file.name, await file.text(), "skill");
    event.target.value = "";
  });
}

function updateSkillPreview() {
  const activeSkillName = getActiveSkillName(state.documents, state.templateName);
  if ($("activeSkillName")) $("activeSkillName").textContent = activeSkillName;
  if ($("activeSkillStatus")) $("activeSkillStatus").textContent = `已应用：${activeSkillName}。下一次生成回答会按下方规则组织。`;
  if ($("templatePreview")) $("templatePreview").innerHTML = (state.template || defaultTemplate).split(/\r?\n/).map((line, index) => `<div class="preview-row"><span>${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(line || "未命名段落")}</strong></div>`).join("");
}

function openView(viewId, settingsId = null) {
  document.querySelectorAll(".nav-button").forEach((button) => button.classList.toggle("active", button.dataset.view === viewId));
  document.querySelectorAll(".app-view").forEach((view) => view.classList.toggle("hidden", view.id !== viewId));
  if (settingsId) {
    document.querySelectorAll(".settings-tab").forEach((button) => button.classList.toggle("active", button.dataset.settings === settingsId));
    document.querySelectorAll(".settings-panel").forEach((panel) => panel.classList.toggle("hidden", panel.id !== settingsId));
  }
}

async function saveAsrConfig() {
  const button = $("saveAsrConfigButton");
  const status = $("asrConfigStatus");
  button.disabled = true;
  status.innerHTML = '<span class="status-dot"></span>正在保存到本机服务…';
  try {
    const response = await fetch("/api/config", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ asrProvider: $("asrProvider").value, tencentRegion: $("tencentRegion").value, tencentAppId: $("tencentAppId").value, tencentSecretId: $("tencentSecretId").value, tencentSecretKey: $("tencentSecretKey").value, doubaoAppId: $("doubaoAppId").value, doubaoAccessToken: $("doubaoAccessToken").value, doubaoResourceId: $("doubaoResourceId").value, doubaoEndpoint: $("doubaoEndpoint").value }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "保存失败");
    status.innerHTML = `<span class="status-dot"></span>${payload.configured ? `${payload.provider === "doubao" ? "豆包" : "腾讯云"}配置已保存到本机，刷新后仍保留` : "默认使用浏览器语音识别"}`;
    $("tencentSecretId").value = "";
    $("tencentSecretId").placeholder = secretKeyPlaceholder(payload.secretId || "未配置");
    $("tencentSecretKey").value = "";
    $("tencentSecretKey").placeholder = secretKeyPlaceholder(payload.secretKey || "未配置");
    $("doubaoAccessToken").value = "";
    $("doubaoAccessToken").placeholder = secretKeyPlaceholder(payload.doubaoAccessToken || "未配置");
    const shouldRestart = shouldRestartAsrAfterSave(state.desktopListening, state.savedAsrProvider, payload.provider);
    state.savedAsrProvider = payload.provider;
    state.asrProvider = payload.provider;
    updateAsrProviderUi();
    if (shouldRestart) {
      setDesktopStatus(`已切换到${payload.provider === "doubao" ? "豆包" : "腾讯云"}，正在重新连接…`);
      await stopDesktopAsr();
      await startDesktopAsr();
    }
  } catch (error) { status.innerHTML = `<span class="status-dot error-dot"></span>${escapeHtml(error.message)}`; }
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
    $("voicePrintId").value = config.voicePrintId || "";
    state.voicePrintVerified = Boolean(config.voicePrintVerified);
    $("verifyVoiceprintButton").disabled = !config.voicePrintId;
    setVoiceprintStatus(
      config.voicePrintVerified ? "声纹档案已验证：实时门控需要在桌面监听中启用" : config.voicePrintId ? "声纹档案已注册，尚未验证：请重新录入样本并点击验证" : config.voicePrintConfigured ? "腾讯云密钥已保存，请录入本人声纹样本" : "未连接声纹服务：请先在语音识别页保存腾讯云密钥",
      Boolean(config.voicePrintVerified)
    );
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
  if (shouldStopBrowserListening(state.listening, provider)) {
    state.listening = false;
    clearTimeout(state.restartTimer);
    clearTimeout(state.speechTimer);
    state.speechFinal = "";
    try { state.recognition?.stop(); } catch {}
    $("transcriptCard").classList.remove("listening");
  }
  state.asrProvider = provider;
  $("tencentConfigFields").classList.toggle("hidden", provider !== "tencent");
  $("doubaoConfigFields").classList.toggle("hidden", provider !== "doubao");
  $("testAsrConfigButton").textContent = provider === "browser" ? "浏览器模式无需测试" : "测试当前语音服务";
  $("testAsrConfigButton").disabled = provider === "browser";
  $("asrProviderHelp").textContent = provider === "doubao" ? "豆包使用 App ID、Access Token 和资源 ID。保存后请测试连接；Access Token 仅保存在本机。" : provider === "tencent" ? "腾讯云 V2 需要 AppID、SecretID、SecretKey。保存后请测试连接。" : "浏览器模式不需要密钥，但不支持桌面会议音频转写。";
  const voiceProviderHint = $("voiceProviderHint");
  if (voiceProviderHint) voiceProviderHint.textContent = provider === "doubao" ? "当前选择豆包：负责实时转文字；本人过滤由下方腾讯云声纹档案完成。" : "当前选择腾讯云：实时转写和本人过滤可分别配置。";
  updatePrimaryListeningControl();
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
  state.sections = state.documents.flatMap((doc) => doc.sections);
  persistDocuments();
  renderDocuments();
  closeEditor();
}

async function importFiles(event) { for (const file of event.target.files) { state.deletedDocuments = state.deletedDocuments.filter((name) => name !== file.name); addDocument(file.name, await file.text(), $("sourceType").value); } writeStorage("interview.deletedDocuments", JSON.stringify(state.deletedDocuments)); event.target.value = ""; }
$("fileInputModule").addEventListener("change", importFiles);
// 示例资料仍可通过知识库文件导入；问题页不再放置上传控件。
$("micButton").addEventListener("click", toggleListening);
setupSpeech();
setupModules();
renderAnswerState();
loadAsrConfig();
loadBundledKnowledgeBase();
