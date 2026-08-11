# One-shot Question Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace unreliable continuous interview listening with a one-shot question capture control that starts on click or a configurable global shortcut, then auto-submits after silence or immediately on a second trigger.

**Architecture:** Keep the existing independent `repeatAsrSession` and its microphone capture path because it already has isolated audio and does not rely on voiceprint gating. Rename it around a `questionCapture` concept, use one persisted shortcut to trigger start/submit, and remove continuous ASR, speaker filtering, and their settings/UI.

**Tech Stack:** Electron, vanilla browser JavaScript, local HTTP server, Node test runner.

## Global Constraints

- Do not delete persisted documents, Skills, glossary, LLM configuration, or ASR provider credentials.
- The only audio flow is an explicit one-shot microphone capture initiated by a click or configured global shortcut.
- One-shot capture auto-submits after 1.2 seconds of silence and submits immediately on a second click/shortcut.
- Existing user worktree changes remain untouched unless directly required by this feature.

---

### Task 1: Establish one-shot capture state and behavior

**Files:**
- Create: `src/question-capture.js`
- Test: `test/question-capture.test.js`

**Interfaces:**
- Produces: `nextQuestionCaptureAction({ active }) -> "start" | "submit"`.
- Produces: `shouldAutoSubmitQuestionCapture({ hasVoice, silenceMs }) -> boolean`.

- [ ] **Step 1: Write failing tests**

```js
assert.equal(nextQuestionCaptureAction({ active: false }), "start");
assert.equal(nextQuestionCaptureAction({ active: true }), "submit");
assert.equal(shouldAutoSubmitQuestionCapture({ hasVoice: true, silenceMs: 1200 }), true);
assert.equal(shouldAutoSubmitQuestionCapture({ hasVoice: true, silenceMs: 1199 }), false);
```

- [ ] **Step 2: Run the test and verify failure**

Run: `node --test test/question-capture.test.js`

Expected: FAIL because `src/question-capture.js` does not exist.

- [ ] **Step 3: Implement the minimal pure helpers**

```js
export function nextQuestionCaptureAction({ active = false } = {}) {
  return active ? "submit" : "start";
}

export function shouldAutoSubmitQuestionCapture({ hasVoice = false, silenceMs = 0 } = {}) {
  return hasVoice && silenceMs >= 1200;
}
```

- [ ] **Step 4: Run the test and verify pass**

Run: `node --test test/question-capture.test.js`

Expected: PASS.

### Task 2: Replace Electron continuous ASR IPC with one-shot capture IPC and shortcut

**Files:**
- Modify: `electron/main.js`
- Modify: `electron/preload.cjs`
- Test: `test/electron-question-capture.test.js`

**Interfaces:**
- Consumes: `questionHotkey` stored in runtime config.
- Produces preload methods: `startQuestionCapture`, `stopQuestionCapture`, `sendQuestionCaptureAudio`, `onQuestionCaptureEvent`, `onQuestionCaptureHotkey`.

- [ ] **Step 1: Write failing source-level test**

```js
assert.match(main, /ipcMain\.handle\("question-capture:start"/);
assert.match(main, /questionCaptureHotkey/);
assert.doesNotMatch(main, /ipcMain\.handle\("asr:start"/);
assert.match(preload, /startQuestionCapture/);
```

- [ ] **Step 2: Run the test and verify failure**

Run: `node --test test/electron-question-capture.test.js`

Expected: FAIL because the new IPC bridge is absent.

- [ ] **Step 3: Implement only the one-shot session**

```js
ipcMain.handle("question-capture:start", async () => { /* create session and register shortcut */ });
ipcMain.handle("question-capture:stop", async () => { /* stop one session */ });
ipcMain.on("question-capture:audio", (_event, chunk) => { /* forward PCM */ });
```

Remove `asr:start`, `asr:stop`, `asr:audio`, voiceprint processing, and continuous listener hotkey handlers. Register one global shortcut that sends `question-capture:hotkey`; pressing it starts an idle capture or submits an active capture.

- [ ] **Step 4: Run targeted test and syntax check**

Run: `node --test test/electron-question-capture.test.js && node --check electron/main.js`

Expected: PASS.

### Task 3: Replace the top-level continuous listener UI with “识别问题”

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `config.css`
- Test: `test/manual-question-ui.test.js`
- Test: `test/repeat-question-bridge.test.js`

**Interfaces:**
- Consumes preload one-shot capture methods.
- Produces one top button `#questionCaptureButton` with labels `识别问题` and `识别中 · 点击提交`.

- [ ] **Step 1: Update failing UI tests**

```js
assert.match(html, /id="questionCaptureButton"[^>]*>识别问题/);
assert.doesNotMatch(html, /全程监听/);
assert.doesNotMatch(html, /id="micButton"/);
assert.match(app, /startQuestionCapture/);
assert.doesNotMatch(app, /startDesktopAsr/);
```

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test test/manual-question-ui.test.js test/repeat-question-bridge.test.js`

Expected: FAIL because the old controls still exist.

- [ ] **Step 3: Rename and bind the independent capture flow**

Use the existing repeat microphone processing and `1.2s` silence condition. The first button/shortcut triggers capture, the second triggers immediate submit, final ASR results submit immediately, and the transcript only shows this capture’s recognized question. Keep `runSearch(question, true)` unchanged.

- [ ] **Step 4: Run targeted UI tests**

Run: `node --test test/manual-question-ui.test.js test/repeat-question-bridge.test.js`

Expected: PASS.

### Task 4: Remove voiceprint and continuous-listening settings while preserving ASR configuration

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `server.js`
- Modify: `src/desktop-config.js`
- Test: `test/config-store.test.js`
- Test: `test/rules-ui.test.js`

**Interfaces:**
- Persists only `questionHotkey` for question capture.
- Leaves ASR service credentials and LLM credentials unchanged.

- [ ] **Step 1: Write failing tests**

```js
assert.doesNotMatch(html, /声纹识别/);
assert.doesNotMatch(html, /监听方式/);
assert.match(html, /识别快捷键/);
assert.match(server, /questionHotkey/);
```

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test test/config-store.test.js test/rules-ui.test.js`

Expected: FAIL because legacy settings remain in the page.

- [ ] **Step 3: Remove only dead UI/config paths**

Remove the voiceprint and listener settings panels and their event wiring. Retain old config keys on disk harmlessly for backwards compatibility, but stop returning or consuming them in the question capture path. Rename the existing hotkey setting copy to “识别快捷键”.

- [ ] **Step 4: Run targeted tests**

Run: `node --test test/config-store.test.js test/rules-ui.test.js`

Expected: PASS.

### Task 5: Full regression and desktop startup verification

**Files:**
- Test: all `test/*.test.js`

- [ ] **Step 1: Run full tests and static checks**

Run: `npm test && node --check app.js && node --check server.js && node --check electron/main.js && git diff --check`

Expected: all tests pass and no syntax or whitespace errors.

- [ ] **Step 2: Start desktop app for 20 seconds**

Run: `npm run desktop`

Expected: app stays open, no `SIGTRAP`, and no continuous-listener UI is present.
