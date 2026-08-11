# Voiceprint Filter Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure only a confirmed non-self, complete interviewer question can trigger retrieval and answer generation.

**Architecture:** Keep Tencent Cloud as the voiceprint authority and keep Doubao ASR unchanged. Extract pure decision and verification-state rules into testable modules, apply them in the Electron main process before forwarding a final ASR result, and let the renderer only reflect the resulting state.

**Tech Stack:** Electron, Node.js ESM, Tencent Cloud VoicePrint API, Node built-in test runner.

## Global Constraints

- Do not alter Doubao ASR framing or its successful audio streaming protocol.
- Do not persist raw enrollment or verification PCM locally.
- Treat `unknown`, timeout, error, and overlap as non-triggering states.
- Persist `voicePrintVerified` only after Tencent returns `Decision === 1` for an independent verification recording.

---

### Task 1: Make verification state truthful

**Files:**
- Create: `src/voiceprint-verification.js`
- Modify: `server.js:121-130`
- Test: `test/voiceprint-verification.test.js`

**Interfaces:**
- Produces `verificationSucceeded(result): boolean`.
- `server.js` uses it before updating `runtimeConfig.voicePrintVerified`.

- [ ] **Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { verificationSucceeded } from "../src/voiceprint-verification.js";

test("只有腾讯云明确通过才可启用声纹过滤", () => {
  assert.equal(verificationSucceeded({ Data: { Decision: 1 } }), true);
  assert.equal(verificationSucceeded({ Data: { Decision: 0 } }), false);
  assert.equal(verificationSucceeded({ Data: {} }), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/voiceprint-verification.test.js`

Expected: FAIL because `src/voiceprint-verification.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

```js
export function verificationSucceeded(result = {}) {
  return result.Data?.Decision === 1;
}
```

Update `verifyVoiceprint` so a non-passing result saves `voicePrintVerified = false`; only a passing result saves `true`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/voiceprint-verification.test.js`

Expected: PASS.

### Task 2: Enforce strict real-time speaker gating

**Files:**
- Modify: `src/speaker-gate.js`
- Modify: `app.js:421-434`
- Test: `test/speaker-gate.test.js`

**Interfaces:**
- `decideSpeakerGate({ verification, overlap, questionLike })` returns `ignore`, `allow`, or `hold`.
- Renderer calls `commitAsrQuestion` only for `allow`.

- [ ] **Step 1: Write failing tests**

```js
test("不确定的完整问题不应触发检索", () => {
  assert.equal(decideSpeakerGate({ verification: "unknown", overlap: false, questionLike: true }), "hold");
});

test("只有明确非本人且像问题的语句允许检索", () => {
  assert.equal(decideSpeakerGate({ verification: "other", overlap: false, questionLike: true }), "allow");
  assert.equal(decideSpeakerGate({ verification: "other", overlap: false, questionLike: false }), "hold");
});
```

- [ ] **Step 2: Run test to verify behavior is not covered**

Run: `node --test test/speaker-gate.test.js`

Expected: Existing code passes the pure gate tests but renderer still falls through from `hold`; add a renderer behavior test first.

- [ ] **Step 3: Add a pure renderer routing helper and implement it**

Create `src/voiceprint-routing.js` with `shouldCommitVoiceprintResult({ gate, final })`, returning true only when `gate === "allow" && final`. Use this helper in `app.js` to return for every `hold` state.

- [ ] **Step 4: Run focused tests**

Run: `node --test test/speaker-gate.test.js test/voiceprint-routing.test.js`

Expected: PASS; an unknown final sentence cannot call the commit path.

### Task 3: Require an independent verification recording

**Files:**
- Modify: `app.js:480-525`
- Test: `test/voiceprint-ui.test.js`

**Interfaces:**
- `recordAndEnrollVoiceprint()` creates a profile from a 6-second capture.
- `verifyVoiceprint()` captures a new 4-second recording immediately before calling `/api/voiceprint/verify`.

- [ ] **Step 1: Write the failing UI-source test**

```js
test("验证声纹时重新录制独立样本", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /state\.voiceVerificationPcm = await captureVoiceSample\(4000\)/);
  assert.match(app, /pcm16Base64: pcmToBase64\(state\.voiceVerificationPcm\)/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/voiceprint-ui.test.js`

Expected: FAIL because verification reuses `state.voiceSamplePcm`.

- [ ] **Step 3: Implement independent capture**

Add `voiceVerificationPcm` to state; display a recording status; capture 4 seconds in `verifyVoiceprint`; clear this in-memory value after either response.

- [ ] **Step 4: Run focused test**

Run: `node --test test/voiceprint-ui.test.js`

Expected: PASS.

### Task 4: Use bounded utterance-adjacent audio and expose accurate status

**Files:**
- Create: `src/voiceprint-audio-window.js`
- Modify: `electron/main.js:16-50`
- Modify: `app.js:405-434`
- Test: `test/voiceprint-audio-window.test.js`

**Interfaces:**
- `createVoiceprintAudioWindow(maxBytes)` exposes `push(chunk)`, `takeLatest(bytes)`, and `clear()`.
- Main process verifies at most 4 seconds (128000 bytes PCM16/16kHz mono) when a final utterance arrives.

- [ ] **Step 1: Write failing buffer-boundary test**

```js
test("声纹验证只取最近四秒音频", () => {
  const audio = createVoiceprintAudioWindow(128000);
  audio.push(Buffer.alloc(96000, 1));
  audio.push(Buffer.alloc(96000, 2));
  const sample = audio.takeLatest(128000);
  assert.equal(sample.length, 128000);
  assert.equal(sample.at(-1), 2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/voiceprint-audio-window.test.js`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the bounded buffer and replace global array bookkeeping**

Replace `recentAudio` and `recentAudioBytes` with the new window. On final ASR output request `takeLatest(128000)`. Preserve the 1.5-second service deadline, but forward timeout as `unknown`, which Task 2 blocks.

- [ ] **Step 4: Run focused tests**

Run: `node --test test/voiceprint-audio-window.test.js test/speaker-gate.test.js`

Expected: PASS.

### Task 5: Verify the integration and user-visible states

**Files:**
- Modify: `index.html:42`
- Modify: `app.js:405-434, 501-520, 706-716`
- Test: `test/voiceprint-ui.test.js`

**Interfaces:**
- Renderer status distinguishes `未验证`, `本人已忽略`, `非本人问题已检索`, and `不确定，未触发`.

- [ ] **Step 1: Write failing UI assertions**

```js
assert.match(app, /声纹不确定，未触发检索/);
assert.match(app, /本人声音，已忽略，不会检索或生成答案/);
assert.match(html, /验证时会重新录制独立语音样本/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/voiceprint-ui.test.js`

Expected: FAIL because the independent-sample and strict-hold status text are absent.

- [ ] **Step 3: Implement only the listed status copy**

Update the voiceprint instructions and renderer statuses without adding new controls.

- [ ] **Step 4: Run full verification**

Run: `npm test`

Expected: all tests pass. Then start `npm run desktop`, query `/api/config` without printing secrets, and confirm the desktop server reports the configured ASR provider.
