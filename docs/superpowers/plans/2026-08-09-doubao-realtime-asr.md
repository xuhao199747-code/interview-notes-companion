# 豆包实时语音识别接入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 Mac Electron 客户端中增加可配置、可测试的豆包实时语音识别，并让最终文字进入已有检索与回答流程。

**Architecture:** 将提供商无关的配置校验与结果规范化放在 `src/`，将豆包 WebSocket 的鉴权、首帧和二进制音频传输封装在独立会话类。Electron 主进程根据已保存的提供商创建腾讯或豆包会话；渲染进程只处理掩码后的配置和标准化识别事件。

**Tech Stack:** Electron 37、Node.js ESM、WebSocket、Web Audio API、Node test runner。

## Global Constraints

- 仅将凭据保存在 `.local/asr-config.json`；渲染进程、日志和测试输出不可含 Access Token 明文。
- 豆包实时识别使用 16 kHz 单声道 PCM，复用 `src/audio-worklet.js` 的输出。
- 豆包没有可验证说话人编号时，结果使用 `speaker_id: -1`，不启用“忽略本人”过滤。
- 不修改现有腾讯云会话签名和 LLM 接入。
- 真实服务测试只能在用户自行开通豆包资源并保存有效凭据后执行。

---

### Task 1: 豆包配置校验与安全展示

**Files:**
- Create: `src/doubao-config.js`
- Modify: `src/config-store.js`
- Modify: `test/config-store.test.js`
- Test: `test/doubao-config.test.js`

**Interfaces:**
- Produces: `validateDoubaoConfig(config) -> { valid: boolean, message: string }`。
- Produces: `toPublicDoubaoConfig(config) -> { appId: string, accessToken: string, resourceId: string, endpoint: string }`，机密字段仅返回“已保存”。

- [ ] **Step 1: Write the failing validation test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { validateDoubaoConfig } from "../src/doubao-config.js";

test("豆包配置要求 App ID、Access Token 和资源 ID", () => {
  assert.deepEqual(validateDoubaoConfig({}), { valid: false, message: "请填写豆包 App ID、Access Token 和资源 ID" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/doubao-config.test.js`

Expected: FAIL with `Cannot find module '../src/doubao-config.js'`.

- [ ] **Step 3: Implement the minimal validator and public projection**

```js
export function validateDoubaoConfig(config = {}) {
  return config.doubaoAppId?.trim() && config.doubaoAccessToken?.trim() && config.doubaoResourceId?.trim()
    ? { valid: true, message: "配置格式正确" }
    : { valid: false, message: "请填写豆包 App ID、Access Token 和资源 ID" };
}

export function toPublicDoubaoConfig(config = {}) {
  return {
    appId: config.doubaoAppId || "",
    accessToken: config.doubaoAccessToken ? "已保存" : "",
    resourceId: config.doubaoResourceId || "",
    endpoint: config.doubaoEndpoint || "wss://openspeech.bytedance.com/api/v2/asr"
  };
}
```

- [ ] **Step 4: Run focused tests**

Run: `node --test test/doubao-config.test.js test/config-store.test.js`

Expected: PASS.

### Task 2: 豆包流式会话及响应规范化

**Files:**
- Create: `src/doubao-asr.js`
- Test: `test/doubao-asr.test.js`

**Interfaces:**
- Produces: `createDoubaoRequest(config) -> { url, headers, firstFrame }`。
- Produces: `normalizeDoubaoResult(payload) -> Array<{ type: 'result', sentence: { sentence: string, sentence_type: number, speaker_id: -1 } }>`。
- Produces: `DoubaoAsrSession(config, onEvent)` with `start()`, `sendAudio(chunk)`, and `stop()`.

- [ ] **Step 1: Write failing request/normalization tests**

```js
test("豆包请求把 Access Token 放在请求头而不放进 URL", () => {
  const request = createDoubaoRequest({ doubaoAppId: "app", doubaoAccessToken: "token", doubaoResourceId: "cluster" });
  assert.equal(request.url.includes("token"), false);
  assert.equal(request.headers.Authorization, "Bearer;token");
});

test("豆包最终文本标准化为无说话人编号的最终结果", () => {
  assert.deepEqual(normalizeDoubaoResult({ result: { text: "请介绍项目", is_final: true } }), [{ type: "result", sentence: { sentence: "请介绍项目", sentence_type: 1, speaker_id: -1 } }]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/doubao-asr.test.js`

Expected: FAIL because `src/doubao-asr.js` does not exist.

- [ ] **Step 3: Implement minimal protocol adapter**

Implement an adapter that:

```js
export class DoubaoAsrSession {
  constructor(config, onEvent) { this.config = config; this.onEvent = onEvent; }
  start() { /* connect, send the required configuration frame, emit ready/error */ }
  sendAudio(chunk) { /* send 16 kHz PCM only once websocket is open */ }
  stop() { /* send terminal frame then close */ }
}
```

The exact endpoint, headers and binary framing must match the currently selected official Doubao streaming ASR API before implementation. The adapter must use the real protocol, not a placeholder JSON-over-WebSocket format.

- [ ] **Step 4: Run focused tests**

Run: `node --test test/doubao-asr.test.js`

Expected: PASS.

### Task 3: 配置 API、桌面 IPC 和连接测试

**Files:**
- Modify: `server.js`
- Modify: `electron/main.js`
- Modify: `electron/preload.js`
- Modify: `src/desktop-config.js`
- Modify: `test/electron-config.test.js`
- Test: `test/doubao-config.test.js`

**Interfaces:**
- Consumes: `DoubaoAsrSession` and `validateDoubaoConfig`.
- Produces: `POST /api/asr/test` supporting current provider, and existing `window.interviewApp.startTencentAsr()` renamed to provider-neutral `startAsr()`.

- [ ] **Step 1: Write a failing desktop-config test**

```js
test("公开配置保留豆包状态但不泄露 Access Token", () => {
  const config = publicDesktopConfig({ asrProvider: "doubao", doubaoAppId: "app", doubaoAccessToken: "secret", doubaoResourceId: "cluster" });
  assert.equal(config.doubaoAccessToken, "已保存");
  assert.equal(JSON.stringify(config).includes("secret"), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/electron-config.test.js`

Expected: FAIL because the current public configuration has no Doubao projection.

- [ ] **Step 3: Implement provider switch**

Use a provider factory in Electron:

```js
function createAsrSession(config, onEvent) {
  if (config.asrProvider === "doubao") return new DoubaoAsrSession(config, onEvent);
  return new TencentAsrSession(config, onEvent);
}
```

Make `/api/asr/test` and `asr:start` validate the selected provider before creating its session. Keep secrets server-side and return only `{ ok, error }` / `{ usable, error }` to the UI.

- [ ] **Step 4: Run focused tests and syntax checks**

Run: `node --test test/electron-config.test.js test/doubao-config.test.js && node --check server.js && node --check electron/main.js`

Expected: PASS with no syntax errors.

### Task 4: 设置页、状态文案与结果路由

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `config.css`
- Test: `test/speaker-filter.test.js`

**Interfaces:**
- Consumes: masked public config and provider-neutral IPC methods `startAsr`, `stopAsr`, `onAsrEvent`.
- Produces: selectable “豆包流式识别” provider, save/test controls, and unambiguous status for unavailable speaker filtering.

- [ ] **Step 1: Write a failing speaker behavior test**

```js
test("未知说话人编号的豆包最终文本可以进入检索", () => {
  assert.equal(shouldRouteAsrSentence({ sentence: "项目有几个 Agent？", sentence_type: 1, speaker_id: -1 }, "doubao", null), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/speaker-filter.test.js`

Expected: FAIL because `shouldRouteAsrSentence` is not exported.

- [ ] **Step 3: Implement minimal UI behavior**

- Add “豆包流式识别” to the existing provider select.
- Show App ID, Access Token, 资源 ID and endpoint only when this provider is selected.
- Store only masked token state in form fields after reload.
- Rename desktop actions to provider-neutral wording: “开始桌面监听” and “测试当前语音服务”.
- For `speaker_id: -1`, route final text to `runSearch` and show “豆包当前未提供可用于过滤本人的 Speaker 编号”.

- [ ] **Step 4: Run focused tests**

Run: `node --test test/speaker-filter.test.js`

Expected: PASS.

### Task 5: End-to-end verification and documentation

**Files:**
- Modify: `README.md`
- Test: all `test/*.test.js`

- [ ] **Step 1: Update runbook**

Document the exact local startup command, required Mac microphone/virtual-audio permission, the four required Doubao configuration values, the test-connection workflow, and the fact that speaker filtering is unavailable for results without a speaker ID.

- [ ] **Step 2: Run complete automated verification**

Run: `npm test && node --check server.js && node --check app.js && node --check electron/main.js`

Expected: all tests PASS and no syntax errors.

- [ ] **Step 3: Run local integration checks**

Run: `npm start` and `npm run desktop`.

Expected: web page and Electron window start; configuration API returns masked values; “测试当前语音服务” produces a success or a provider-returned actionable error without exposing credentials.

- [ ] **Step 4: Commit**

```bash
git add README.md app.js config.css electron/main.js electron/preload.js index.html server.js src/doubao-asr.js src/doubao-config.js src/desktop-config.js test docs/superpowers
git commit -m "feat: add Doubao realtime ASR provider"
```
