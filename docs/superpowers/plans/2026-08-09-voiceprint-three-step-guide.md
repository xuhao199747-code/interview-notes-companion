# 声纹识别三步引导 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把声纹识别页面改为清晰的密钥、录入、验证三步引导，并且一次只突出当前可执行的主操作。

**Architecture:** 新增一个纯状态解析模块，将服务端配置转换为 UI 的当前步骤、三张状态卡和按钮文案。`app.js` 使用该模块渲染声纹页，并把主按钮路由到现有的配置跳转、录入和验证操作；现有 API、声纹档案与本机密钥存储不变。

**Tech Stack:** 原生 ES Modules、Electron、Node.js 内置测试运行器、HTML/CSS。

## Global Constraints

- 腾讯云 SecretId 和 SecretKey 只保存在本机，任何界面都不得显示原文。
- 不修改声纹录入、验证和桌面监听的现有 API 协议。
- 不提交 API 密钥、声纹档案或个人上传资料到 GitHub。
- 此次改动只保留在本地，未经用户明确要求不得推送 GitHub。

---

### Task 1: 声纹引导状态解析

**Files:**
- Create: `src/voiceprint-guide.js`
- Create: `test/voiceprint-guide.test.js`

**Interfaces:**
- Consumes: 配置对象 `{ voicePrintConfigured: boolean, voicePrintId: string, voicePrintVerified: boolean }`。
- Produces: `getVoiceprintGuide(config)`，返回 `{ step, primaryAction, cards }`。

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { getVoiceprintGuide } from "../src/voiceprint-guide.js";

test("未配置密钥时引导去配置腾讯云密钥", () => {
  assert.deepEqual(getVoiceprintGuide({ voicePrintConfigured: false, voicePrintId: "", voicePrintVerified: false }).primaryAction, {
    id: "configure", label: "去配置腾讯云密钥",
  });
});

test("已配置密钥但未录入时引导录入样本", () => {
  assert.deepEqual(getVoiceprintGuide({ voicePrintConfigured: true, voicePrintId: "", voicePrintVerified: false }).primaryAction, {
    id: "enroll", label: "录入 6 秒本人声音",
  });
});

test("已录入但未验证时引导验证样本", () => {
  assert.deepEqual(getVoiceprintGuide({ voicePrintConfigured: true, voicePrintId: "voice-id", voicePrintVerified: false }).primaryAction, {
    id: "verify", label: "验证声纹（重新录 4 秒）",
  });
});

test("验证成功后展示已启用状态", () => {
  const guide = getVoiceprintGuide({ voicePrintConfigured: true, voicePrintId: "voice-id", voicePrintVerified: true });
  assert.equal(guide.step, "enabled");
  assert.equal(guide.primaryAction, null);
  assert.equal(guide.cards[2].label, "已启用");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/voiceprint-guide.test.js`  
Expected: FAIL because `src/voiceprint-guide.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

```js
const actionByStep = {
  configure: { id: "configure", label: "去配置腾讯云密钥" },
  enroll: { id: "enroll", label: "录入 6 秒本人声音" },
  verify: { id: "verify", label: "验证声纹（重新录 4 秒）" },
};

export function getVoiceprintGuide({ voicePrintConfigured, voicePrintId, voicePrintVerified }) {
  const step = !voicePrintConfigured ? "configure" : !voicePrintId ? "enroll" : !voicePrintVerified ? "verify" : "enabled";
  return {
    step,
    primaryAction: actionByStep[step] || null,
    cards: [
      { title: "腾讯云密钥", label: voicePrintConfigured ? "已保存到本机" : "未配置", complete: voicePrintConfigured },
      { title: "声纹档案", label: voicePrintId ? "已录入" : "尚未录入", complete: Boolean(voicePrintId) },
      { title: "声纹过滤", label: voicePrintVerified ? "已启用" : "等待验证", complete: voicePrintVerified },
    ],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/voiceprint-guide.test.js`  
Expected: PASS with 4 tests.

- [ ] **Step 5: Commit**

Do not commit in the current dirty worktree. Keep these local changes unstaged unless the user explicitly requests a commit.

### Task 2: 三步状态卡与主操作界面

**Files:**
- Modify: `index.html:42`
- Modify: `styles.css`
- Modify: `app.js:525-580, 754-770`
- Test: `test/voiceprint-ui.test.js`

**Interfaces:**
- Consumes: `getVoiceprintGuide(config)` from `src/voiceprint-guide.js` and existing `recordAndEnrollVoiceprint()`, `verifyVoiceprint()`, `deleteVoiceprint()`.
- Produces: `renderVoiceprintGuide(config)` and a `#voiceprintPrimaryAction` button carrying the guide action in `data-action`.

- [ ] **Step 1: Write the failing test**

```js
test("声纹页展示三步状态卡和单一主操作", async () => {
  const { readFile } = await import("node:fs/promises");
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(html, /id="voiceprintGuide"/);
  assert.match(html, /id="voiceprintPrimaryAction"/);
  assert.match(app, /function renderVoiceprintGuide\(config\)/);
  assert.match(app, /voiceprintPrimaryAction/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/voiceprint-ui.test.js`  
Expected: FAIL because the guide container and renderer do not exist.

- [ ] **Step 3: Write minimal implementation**

Add this guide container above the current `voiceprintStatus` element in the voice settings panel:

```html
<div class="voiceprint-guide" id="voiceprintGuide"></div>
<button class="primary-button voiceprint-primary-action" id="voiceprintPrimaryAction" type="button" hidden></button>
```

Add `renderVoiceprintGuide(config)` in `app.js`. It calls `getVoiceprintGuide(config)`, renders three cards from `guide.cards`, places `guide.primaryAction.label` into `#voiceprintPrimaryAction`, and hides the button when `guide.primaryAction` is null. Preserve the existing buttons as secondary controls; hide the enrollment and verification buttons when they are not the current step.

Route button clicks by `data-action`:

```js
$("voiceprintPrimaryAction").addEventListener("click", () => {
  const action = $("voiceprintPrimaryAction").dataset.action;
  if (action === "configure") return openVoiceprintCredentials();
  if (action === "enroll") return recordAndEnrollVoiceprint();
  if (action === "verify") return verifyVoiceprint();
});
```

Implement `openVoiceprintCredentials()` by clicking the `apiSettings` tab and focusing `#tencentSecretId`; do not read or expose saved secret values.

Add styles so complete cards use the existing green accent and incomplete cards use muted text and a bordered dark background.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/voiceprint-ui.test.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

Do not commit in the current dirty worktree. Keep these local changes unstaged unless the user explicitly requests a commit.

### Task 3: 操作后的状态刷新与回归验证

**Files:**
- Modify: `app.js:529-580, 754-770`
- Test: `test/voiceprint-ui.test.js`

**Interfaces:**
- Consumes: the API responses returned by `/api/voiceprint/enroll`, `/api/voiceprint/verify`, `/api/voiceprint/profile`, and `/api/config`.
- Produces: every successful or failed action rerenders the guide with the latest local configuration state.

- [ ] **Step 1: Write the failing test**

```js
test("声纹操作完成后会重新渲染三步引导", async () => {
  const { readFile } = await import("node:fs/promises");
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /renderVoiceprintGuide\(/);
  assert.match(app, /await loadAsrConfig\(\)/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/voiceprint-ui.test.js`  
Expected: FAIL until each operation refreshes the current configuration and calls the guide renderer.

- [ ] **Step 3: Write minimal implementation**

After successful enrollment, verification, and deletion, call `await loadAsrConfig()` so the state cards come from the same persisted configuration as the next application start. On failure, retain the existing error message and leave the guide on its current step. Ensure `loadAsrConfig()` calls `renderVoiceprintGuide(config)` after setting `state.voicePrintVerified`.

- [ ] **Step 4: Run targeted and full tests**

Run: `node --test test/voiceprint-guide.test.js test/voiceprint-ui.test.js && npm test`  
Expected: all targeted tests and the full suite pass.

- [ ] **Step 5: Launch local validation**

Run: `INTERVIEW_EDITION=local npm run desktop`  
Expected: voice settings shows the three cards and only the correct primary action for the saved configuration.

- [ ] **Step 6: Commit**

Do not commit or push in the current dirty worktree unless the user explicitly asks.
