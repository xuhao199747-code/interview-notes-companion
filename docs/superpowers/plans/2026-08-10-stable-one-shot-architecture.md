# Stable One-Shot Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Remove continuous listening and voiceprint, leaving one persistent one-shot question-capture flow.

**Architecture:** The renderer has one state machine: idle, recording, submitted. Electron owns one ASR session and one global hotkey. The local server owns documents, glossary, rules, ASR/LLM config, retrieval, and generation.

**Tech Stack:** Electron 37, browser modules, Node HTTP server, Node test runner, Web Audio, OpenAI-compatible streaming API.

## Global Constraints

- Preserve documents, Skills, glossary, rules, ASR settings, LLM settings, and current capture hotkey.
- Delete voiceprint and continuous-listening settings only.
- Do not add a new model, vector database, or test dependency.
- Every key workflow needs executable coverage; source-string tests alone are insufficient.
- Do not stage unrelated worktree changes.

---

## Locked File Structure

~~~
src/question-capture/config.js      Canonical hotkey configuration
src/question-capture/controller.js  Pure idle/recording/submitted state machine
src/answer/*                        Answer routing and context policy
src/retrieval/*                     Markdown parsing, retrieval, project context
renderer/*                          Bootstrap, capture view, settings view
desktop/main.js                     One ASR session plus global hotkey
desktop/preload.cjs                 Minimum IPC bridge
server/*                            Config, documents, retrieval, answer handlers
~~~

The first migration keeps compatibility entry files where needed. It removes old flows before moving pure retrieval and answer modules.

### Task 1: Normalize Capture Hotkey Configuration

**Files:**
- Create: src/question-capture/config.js
- Modify: src/config-store.js
- Modify: server.js
- Test: test/question-capture-config.test.js

**Interfaces:**
- Produces: normalizeQuestionCaptureConfig(input) returning { questionCaptureHotkey }.
- Consumes: old questionHotkey only when questionCaptureHotkey is absent.

- [ ] **Step 1: Write the failing test**

~~~js
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeQuestionCaptureConfig } from "../src/question-capture/config.js";

test("旧快捷键只迁移一次", () => {
  assert.deepEqual(normalizeQuestionCaptureConfig({ questionHotkey: "Alt+Q" }), {
    questionCaptureHotkey: "Alt+Q"
  });
  assert.deepEqual(normalizeQuestionCaptureConfig({
    questionCaptureHotkey: "Command+Q", questionHotkey: "Alt+Q"
  }), { questionCaptureHotkey: "Command+Q" });
});
~~~

- [ ] **Step 2: Run it and confirm it fails**

Run: node --test test/question-capture-config.test.js

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the normalizer**

~~~js
import { isSafeGlobalHotkey } from "../global-hotkey.js";

export const defaultQuestionCaptureHotkey = "Alt+Space";

export function normalizeQuestionCaptureConfig(input = {}) {
  const value = input.questionCaptureHotkey || input.questionHotkey;
  return {
    questionCaptureHotkey: isSafeGlobalHotkey(value)
      ? value.trim()
      : defaultQuestionCaptureHotkey,
  };
}
~~~

Update config-store and server responses to return only questionCaptureHotkey. Saving it replaces the old field in the local config file.

- [ ] **Step 4: Verify configuration persistence**

Run: node --test test/question-capture-config.test.js test/config-store.test.js test/question-capture-hotkey-bridge.test.js

Expected: PASS.

### Task 2: Reduce Electron to One ASR Session

**Files:**
- Modify: electron/main.js
- Modify: electron/preload.cjs
- Modify: electron/ipc-smoke.cjs
- Delete: electron/preload.js
- Test: test/electron-one-shot-capture.test.js

**Interfaces:**
- question-capture:start opens one ASR session.
- question-capture:stop stops it.
- question-capture:audio forwards PCM only to that session.
- question-capture:configure-hotkey registers one global shortcut.

- [ ] **Step 1: Write the failing desktop contract test**

~~~js
test("主进程只有一次性识别 IPC", async () => {
  const [main, preload] = await Promise.all([
    fs.readFile(new URL("../electron/main.js", import.meta.url), "utf8"),
    fs.readFile(new URL("../electron/preload.cjs", import.meta.url), "utf8"),
  ]);
  assert.match(main, /question-capture:start/);
  assert.doesNotMatch(main, /"asr:start"|voiceprint/);
  assert.match(preload, /startQuestionCapture/);
  assert.doesNotMatch(preload, /startAsr|onAsrEvent|voiceprint/);
});
~~~

- [ ] **Step 2: Run it and confirm it fails**

Run: node --test test/electron-one-shot-capture.test.js

Expected: FAIL because old IPC and voiceprint code remain.

- [ ] **Step 3: Implement the single session**

Replace all asr:start, asr:stop, asr:audio, repeat ASR and voiceprint code with:

~~~js
ipcMain.handle("question-capture:start", async () => {
  const config = getRuntimeConfig();
  const validation = validateAsrProviderConfig(config);
  if (!validation.valid) return { ok: false, error: validation.message };
  questionCaptureSession?.stop();
  questionCaptureSession = createAsrSession(config, (payload) => {
    windowRef?.webContents.send("question-capture:event", payload);
  });
  questionCaptureSession.start();
  return { ok: true };
});

ipcMain.handle("question-capture:stop", async () => {
  questionCaptureSession?.stop();
  questionCaptureSession = null;
  return { ok: true };
});

ipcMain.on("question-capture:audio", (_event, chunk) => {
  if (!questionCaptureSession || !chunk) return;
  const audio = Buffer.from(chunk);
  if (audio.length) questionCaptureSession.sendAudio(audio);
});
~~~

Expose matching startQuestionCapture, stopQuestionCapture, sendQuestionCaptureAudio and onQuestionCaptureEvent methods in preload.cjs. Keep existing lifecycle guards.

- [ ] **Step 4: Verify Electron**

Run: node --test test/electron-one-shot-capture.test.js && npx electron electron/ipc-smoke.cjs

Expected: PASS and smoke output contains "matches":true.

### Task 3: Remove Server Voiceprint and Continuous-Listening Surface

**Files:**
- Modify: server.js
- Modify: src/config-store.js
- Delete: src/tencent-voiceprint.js
- Delete: src/voiceprint-verification.js
- Delete: src/local-voiceprint.js
- Delete: src/local-voiceprint-model.js
- Delete: src/local-voiceprint-profiles.js
- Delete: src/voiceprint-audio-window.js
- Delete: src/voiceprint-guide.js
- Delete: src/voiceprint-routing.js
- Delete: src/voiceprint-status.js
- Delete: src/speaker-filter.js
- Delete: src/speaker-gate.js
- Delete: src/asr-question-flow.js
- Test: test/server-one-shot-surface.test.js

**Interfaces:**
- Public config contains ASR, LLM and questionCaptureHotkey only.
- No API path begins with /api/voiceprint or /api/local-voiceprint.

- [ ] **Step 1: Write the failing surface test**

~~~js
test("服务端没有声纹路由或公开声纹状态", async () => {
  const server = await fs.readFile(new URL("../server.js", import.meta.url), "utf8");
  assert.doesNotMatch(server, /\/api\/(local-)?voiceprint/);
  assert.doesNotMatch(server, /voicePrintId|voiceprintEnabled|localVoiceprint/);
  assert.match(server, /questionCaptureHotkey/);
});
~~~

- [ ] **Step 2: Run it and confirm it fails**

Run: node --test test/server-one-shot-surface.test.js

Expected: FAIL because the current server has voiceprint routes and config.

- [ ] **Step 3: Delete the old surface**

Remove voiceprint imports, handlers, API routes, config fields and tests. Persist the retained ASR and LLM settings plus questionCaptureHotkey only. Remove a source file only after this command reports no runtime import:

~~~bash
rg -n "<module-basename>" app.js server.js electron src index.html -g '!node_modules'
~~~

- [ ] **Step 4: Verify server**

Run: node --test test/server-one-shot-surface.test.js test/config-store.test.js test/llm-config.test.js test/doubao-config.test.js

Expected: PASS.

### Task 4: Create a Pure One-Shot Renderer Controller

**Files:**
- Create: src/question-capture/controller.js
- Modify: app.js
- Test: test/question-capture-controller.test.js
- Test: test/repeat-question-bridge.test.js

**Interfaces:**
- createQuestionCaptureState returns { status, transcript, submitted }.
- reduceQuestionCapture(state, event) handles START, ASR_TEXT, SILENCE, SUBMIT and RESET.

- [ ] **Step 1: Write the failing controller test**

~~~js
test("首次开始、再次提交和静默提交共用同一状态机", () => {
  let state = createQuestionCaptureState();
  state = reduceQuestionCapture(state, { type: "START" });
  assert.equal(state.status, "recording");
  state = reduceQuestionCapture(state, { type: "ASR_TEXT", text: "介绍一下你的 GEO 项目" });
  state = reduceQuestionCapture(state, { type: "SUBMIT" });
  assert.deepEqual(state, {
    status: "submitted",
    transcript: "介绍一下你的 GEO 项目",
    submitted: true
  });
});
~~~

- [ ] **Step 2: Run it and confirm it fails**

Run: node --test test/question-capture-controller.test.js

Expected: FAIL because the controller module does not exist.

- [ ] **Step 3: Implement the state machine**

~~~js
export function createQuestionCaptureState() {
  return { status: "idle", transcript: "", submitted: false };
}

export function reduceQuestionCapture(state, event) {
  if (event.type === "START") return { status: "recording", transcript: "", submitted: false };
  if (event.type === "ASR_TEXT" && state.status === "recording") return { ...state, transcript: event.text };
  if ((event.type === "SUBMIT" || event.type === "SILENCE") && state.status === "recording" && state.transcript.trim()) {
    return { status: "submitted", transcript: state.transcript.trim(), submitted: true };
  }
  if (event.type === "RESET") return createQuestionCaptureState();
  return state;
}
~~~

Refactor app.js to use one Web Audio recorder and only the new preload bridge. Remove browser SpeechRecognition, continuous ASR state, speaker state and old desktop listener functions.

- [ ] **Step 4: Verify capture behavior**

Run: node --test test/question-capture-controller.test.js test/repeat-question-bridge.test.js test/question-turn.test.js

Expected: PASS.

### Task 5: Make Settings Static and Single-Source

**Files:**
- Modify: index.html
- Modify: app.js
- Modify: config.css
- Test: test/settings-one-shot-ui.test.js

**Interfaces:**
- Exactly one questionCaptureHotkey input exists.
- No voice settings, listening settings, questionCommitMode or questionHotkey DOM control exists.

- [ ] **Step 1: Write the failing DOM contract**

~~~js
test("设置页只保留识别问题快捷键", async () => {
  const [html, app] = await Promise.all([
    fs.readFile(new URL("../index.html", import.meta.url), "utf8"),
    fs.readFile(new URL("../app.js", import.meta.url), "utf8"),
  ]);
  assert.match(html, /id="questionCaptureHotkey"/);
  assert.doesNotMatch(html, /voiceSettings|listeningSettings|questionCommitMode|questionHotkey/);
  assert.doesNotMatch(app, /insertAdjacentHTML\("beforeend"/);
});
~~~

- [ ] **Step 2: Run it and confirm it fails**

Run: node --test test/settings-one-shot-ui.test.js

Expected: FAIL because the page currently contains duplicate old settings and dynamic markup.

- [ ] **Step 3: Move capture settings into static markup**

Put this section in the ASR settings panel:

~~~html
<section class="settings-guide question-capture-hotkey-config">
  <strong>识别问题快捷键</strong>
  <p>按一次开始录题；录入中再按一次立即提交。停顿 1.2 秒也会自动提交。</p>
  <label for="questionCaptureHotkey">全局组合快捷键</label>
  <input id="questionCaptureHotkey" readonly value="Alt+Space" />
  <small>点击输入框后按“修饰键 + 普通键”，例如 Alt + Q。</small>
  <div class="api-status" id="questionCaptureHotkeyStatus"><span class="status-dot"></span>修改后自动保存到本机。</div>
</section>
~~~

Remove all voiceprint/listening panels, old hotkey fields, old CSS and dynamic insertAdjacentHTML. The capture handler saves immediately and registers the hotkey.

- [ ] **Step 4: Verify the settings page**

Run: node --test test/settings-one-shot-ui.test.js test/manual-question-ui.test.js test/question-capture-hotkey-bridge.test.js

Expected: PASS.

### Task 6: Add Real Desktop Smoke Coverage and Final Audit

**Files:**
- Create: electron/one-shot-capture-smoke.cjs
- Create: test/one-shot-capture-smoke.test.js
- Modify: package.json
- Modify: README.md

- [ ] **Step 1: Write the failing smoke wrapper test**

~~~js
test("桌面冒烟脚本检查一次性识别界面", async () => {
  const smoke = await fs.readFile(new URL("../electron/one-shot-capture-smoke.cjs", import.meta.url), "utf8");
  assert.match(smoke, /voiceRepeatButton/);
  assert.match(smoke, /questionCaptureHotkey/);
  assert.match(smoke, /noVoiceprint/);
});
~~~

- [ ] **Step 2: Run it and confirm it fails**

Run: node --test test/one-shot-capture-smoke.test.js

Expected: FAIL because the smoke script does not exist.

- [ ] **Step 3: Implement the smoke script**

The script creates an Electron BrowserWindow, loads the local server and evaluates:

~~~js
({
  capture: Boolean(document.getElementById("voiceRepeatButton")),
  hotkey: Boolean(document.getElementById("questionCaptureHotkey")),
  noVoiceprint: !document.getElementById("voiceSettings"),
  noListeningSettings: !document.getElementById("listeningSettings")
})
~~~

Exit nonzero unless all four values are true. Add the package script:

~~~json
"smoke:desktop": "electron electron/one-shot-capture-smoke.cjs"
~~~

- [ ] **Step 4: Document the actual operation**

Document exactly:

~~~markdown
1. 在“设置 → 语音识别”保存豆包或腾讯云 ASR。
2. 在同一页设置“识别问题”全局快捷键，修改后自动保存。
3. 面试官提问后，按快捷键开始复述；停顿 1.2 秒自动提交，或再次按快捷键立即提交。
4. 程序将按术语表纠错、检索资料并生成回答。
~~~

- [ ] **Step 5: Run final verification**

Run: npm test && npm run smoke:desktop && npx electron electron/ipc-smoke.cjs && git diff --check

Expected: all tests PASS, both Electron commands exit 0, no runtime file contains voiceprint, full-listening, SpeechRecognition, asr:start, questionCommitMode or questionHotkey.
