# 面试资料伴侣第一期 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变现有豆包采音与实时转写链路的前提下，完成自动断句、连续多题、低延迟回答路由、腾讯云声纹验证和全链路状态。

**Architecture:** 豆包 ASR 产生临时和最终文字；独立的断句状态机把临时结果在静默后确认成问题；本地检索先给出资料答案，LLM 仅异步补充。腾讯云声纹模块独立管理注册和验证，并在问题状态机前输出本人、非本人或不确定。

**Tech Stack:** 原生 HTML/CSS/JavaScript、Electron、Node.js、WebSocket、腾讯云 API、现有本地配置存储。

## Global Constraints

- 不改动 `app.js` 中已验证可用的 PCM 采集格式、`Uint8Array` IPC 传输或豆包 WebSocket 鉴权字段。
- 所有密钥仅经本地 Node/Electron 服务保存；页面和测试不得返回明文。
- 监听一旦启动，单题提交、LLM 生成和声纹验证均不能停止监听。
- 不确定与混合语音默认保守，不将普通陈述自动变成问题。
- 回归验证命令为 `npm test`；Electron IPC smoke 必须以 `./node_modules/.bin/electron` 运行。

---

### Task 1: 断句状态机和追问判定

**Files:**
- Create: `src/turn-detector.js`
- Modify: `app.js`
- Test: `test/turn-detector.test.js`

**Interfaces:**
- Produces `classifyTranscript(text)` returning `{ complete, followUp, delayMs }`.
- Produces `shouldCommitAfterSilence({ text, silenceMs })` returning a boolean.

- [ ] **Step 1: Write failing tests**

```js
assert.deepEqual(classifyTranscript("你的项目有几个 Agent"), { complete: true, followUp: false, delayMs: 1200 });
assert.equal(shouldCommitAfterSilence({ text: "你这个项目当时", silenceMs: 2200 }), false);
assert.equal(shouldCommitAfterSilence({ text: "你这个项目当时", silenceMs: 3500 }), true);
assert.equal(classifyTranscript("具体怎么做").followUp, true);
```

- [ ] **Step 2: Run red test**

Run: `node --test test/turn-detector.test.js`

Expected: FAIL because `src/turn-detector.js` does not exist.

- [ ] **Step 3: Implement the pure state helpers**

```js
const incompleteEndings = ["然后", "比如", "因为", "我想问一下"];
const followUpPattern = /^(为什么|然后呢|结果呢|展开讲讲|详细讲一下|具体怎么做)[？?。！!]?$/;
export function shouldCommitAfterSilence({ text, silenceMs }) {
  const { complete, delayMs } = classifyTranscript(text);
  return text.trim().length >= 4 && (silenceMs >= 3500 || (complete && silenceMs >= delayMs));
}
```

- [ ] **Step 4: Connect timer management in `app.js`**

Replace the current “豆包只等最终句” path with a timer reset for each temporary result. Final sentences commit immediately. Store the last partial sentence, timer start time and committed sentence ID in `state` so repeated partial messages cannot create duplicate questions.

- [ ] **Step 5: Run focused and full tests**

Run: `node --test test/turn-detector.test.js && npm test`

Expected: all tests pass.

### Task 2: 连续多题和上下文安全状态

**Files:**
- Modify: `src/answer-state.js`
- Modify: `app.js`
- Test: `test/answer-state.test.js`

**Interfaces:**
- Extends `beginQuestion(state, question, documentHtml, context)`.
- Produces `buildFollowUpContext(previous)` for short follow-up prompts.

- [ ] **Step 1: Write failing tests**

```js
const first = beginQuestion(state, "项目有几个 Agent", "资料一");
acceptLlmAnswer(state, first.requestId, "答案一");
const second = beginQuestion(state, "具体怎么做", "资料二", buildFollowUpContext(state.previous));
assert.match(second.context, /项目有几个 Agent/);
assert.equal(acceptLlmAnswer(state, first.requestId, "晚到答案"), false);
```

- [ ] **Step 2: Run red test**

Run: `node --test test/answer-state.test.js`

Expected: FAIL because `buildFollowUpContext` is missing.

- [ ] **Step 3: Implement context snapshots**

```js
export function buildFollowUpContext(previous) {
  return previous ? `上一题：${previous.question}\n上一题资料：${previous.documentHtml}` : "";
}
```

- [ ] **Step 4: Update `generateAnswer` request**

Send `{ query, context, previousContext, template }`; preserve request IDs so old LLM output remains archived and cannot replace the current question.

- [ ] **Step 5: Run focused and full tests**

Run: `node --test test/answer-state.test.js && npm test`

Expected: all tests pass.

### Task 3: 低延迟回答路由与来源标签

**Files:**
- Create: `src/answer-router.js`
- Modify: `src/search.js`
- Modify: `app.js`
- Test: `test/answer-router.test.js`

**Interfaces:**
- Produces `routeAnswer(query, sections)` returning `{ mode, matches, confidence, reason }`.
- Modes are `direct`, `compose`, `supplement`, and `fallback`.

- [ ] **Step 1: Write failing tests**

```js
assert.equal(routeAnswer("项目有几个 Agent", [{ title: "Agent 架构", content: "项目共有 3 个 Agent" }]).mode, "direct");
assert.equal(routeAnswer("项目有几个 Agent", [{ title: "Agent 职责", content: "负责规划" }]).mode, "supplement");
assert.equal(routeAnswer("薪资期望", []).mode, "fallback");
```

- [ ] **Step 2: Run red test**

Run: `node --test test/answer-router.test.js`

Expected: FAIL because `src/answer-router.js` does not exist.

- [ ] **Step 3: Implement deterministic fast routing**

Use existing `searchSections` for candidate retrieval. Detect required number evidence for count questions, direct title/body coverage for high confidence, and at least two complementary matches for `compose`. Do not call an LLM to decide the first display.

- [ ] **Step 4: Update answer rendering**

Render a visible source label: `直接命中 · 问题资料`, `资料整合 · N 段`, `LLM 补充 · 资料不足`, or `通用生成 · 资料未命中`. Display the direct document answer before calling LLM.

- [ ] **Step 5: Run focused and full tests**

Run: `node --test test/answer-router.test.js && npm test`

Expected: all tests pass.

### Task 4: 腾讯云声纹配置、注册和验证服务

**Files:**
- Create: `src/tencent-voiceprint.js`
- Modify: `src/config-store.js`
- Modify: `src/desktop-config.js`
- Modify: `server.js`
- Modify: `index.html`
- Modify: `app.js`
- Test: `test/tencent-voiceprint.test.js`

**Interfaces:**
- Produces `validateVoiceprintConfig(config)`.
- Produces `createVoiceprintClient(config)` with `enroll({ voicePrintId, pcm16 })`, `verify({ voicePrintId, pcm16 })`, and `delete({ voicePrintId })`.
- HTTP endpoints are `POST /api/voiceprint/enroll`, `POST /api/voiceprint/verify`, `DELETE /api/voiceprint/profile`.

- [ ] **Step 1: Write failing tests**

```js
assert.equal(validateVoiceprintConfig({ tencentSecretId: "id", tencentSecretKey: "key" }).valid, true);
assert.equal(validateVoiceprintConfig({ tencentSecretId: "id" }).valid, false);
assert.equal(toRendererConfig({ voicePrintId: "mine", tencentSecretKey: "secret" }).voicePrintId, "mine");
assert.equal(toRendererConfig({ tencentSecretKey: "secret" }).tencentSecretKey, undefined);
```

- [ ] **Step 2: Run red test**

Run: `node --test test/tencent-voiceprint.test.js`

Expected: FAIL because `src/tencent-voiceprint.js` does not exist.

- [ ] **Step 3: Implement provider boundary and local profile state**

Use Tencent Cloud API signing in Node only. Register 16 kHz PCM samples as the configured profile ID; persist only profile metadata and ID. Return service errors as safe UI messages without credential values.

- [ ] **Step 4: Implement settings UI**

Replace the current placeholder voice sample controls with service status, sample recording/upload, enrollment, test verification, profile deletion and explicit `未连接声纹服务` state. Do not show enabled until a real verify call succeeds.

- [ ] **Step 5: Run focused and full tests**

Run: `node --test test/tencent-voiceprint.test.js && npm test`

Expected: all tests pass.

### Task 5: 实时声纹门控与诊断状态

**Files:**
- Create: `src/speaker-gate.js`
- Modify: `electron/main.js`
- Modify: `app.js`
- Modify: `index.html`
- Test: `test/speaker-gate.test.js`
- Test: `test/electron-preload.test.js`

**Interfaces:**
- Produces `decideSpeakerGate({ verification, overlap, questionLike })` returning `ignore`, `allow`, or `hold`.
- Main process emits `{ type: 'voiceprint', status, score }` and `{ type: 'diagnostic', stage, detail }`.

- [ ] **Step 1: Write failing tests**

```js
assert.equal(decideSpeakerGate({ verification: "self", overlap: false, questionLike: true }), "ignore");
assert.equal(decideSpeakerGate({ verification: "other", overlap: false, questionLike: true }), "allow");
assert.equal(decideSpeakerGate({ verification: "unknown", overlap: false, questionLike: false }), "hold");
assert.equal(decideSpeakerGate({ verification: "other", overlap: true, questionLike: true }), "hold");
```

- [ ] **Step 2: Run red test**

Run: `node --test test/speaker-gate.test.js`

Expected: FAIL because `src/speaker-gate.js` does not exist.

- [ ] **Step 3: Buffer active audio and verify asynchronously**

In Electron main, retain short PCM segments, call Tencent verification after a speech segment, and publish a `voiceprint` event. Do not stop or alter the existing ASR audio forwarding. If verification is late, bind it to the segment ID and do not apply it to a newer question.

- [ ] **Step 4: Gate question submission and render diagnostics**

Question confirmation must consult the latest matching segment decision. Render audio packet count, ASR temporary/final status, voiceprint status, retrieval mode and LLM timing in the main page.

- [ ] **Step 5: Run full verification**

Run: `npm test && ./node_modules/.bin/electron electron/ipc-smoke.cjs && ./node_modules/.bin/electron electron/audio-capture-smoke.cjs`

Expected: all Node tests pass and smoke outputs report matching IPC bytes and received audio bytes.
