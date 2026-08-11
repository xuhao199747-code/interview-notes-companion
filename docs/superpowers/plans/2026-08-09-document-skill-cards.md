# 文档与 Skill 管理卡片 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将设置页的资料和回答 Skill 改为统一、可编辑和可删除的管理卡片。

**Architecture:** 复用 `state.documents` 作为唯一数据来源。`renderDocuments` 继续渲染资料卡片；新增 `renderSkillCards` 只渲染 `type === "skill"` 的文档，并复用已有事件委托、编辑器和 `deleteDocument` 状态回退逻辑。

**Tech Stack:** 原生 HTML、CSS、JavaScript、Node.js 内置测试运行器。

## Global Constraints

- 保持已有本地保存格式和文件解析流程。
- 删除当前 Skill 后必须回退到其他 Skill 或内置默认规则。
- Skill 内容不得在设置页全文展示。

---

### Task 1: 描述 Skill 卡片的页面契约

**Files:**
- Modify: `test/settings-panels.test.js`
- Modify: `index.html`

**Interfaces:**
- Produces: `#skillCardList`，供 `renderSkillCards()` 写入。

- [ ] **Step 1: Write the failing test**

```js
assert.match(html, /id="skillCardList"/);
assert.doesNotMatch(html, /id="templatePreview"/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/settings-panels.test.js`

Expected: FAIL because `skillCardList` is absent.

- [ ] **Step 3: Add the card list container and verify it passes**

Add `<div class="knowledge-grid" id="skillCardList"></div>` to the Skill settings panel, then run `node --test test/settings-panels.test.js`.

### Task 2: 渲染和管理 Skill 卡片

**Files:**
- Modify: `app.js`
- Modify: `styles.css`
- Test: `test/skill-ui.test.js`

**Interfaces:**
- Consumes: `state.documents`, `state.templateName`, `deleteDocument(name)`, `openEditor(name)`。
- Produces: `renderSkillCards()`，每次 Skill 上传、删除或初始化后更新 `#skillCardList`。

- [ ] **Step 1: Write the failing test**

```js
assert.match(app, /function renderSkillCards\(\)/);
assert.match(app, /skillCardList/);
assert.match(app, /当前应用中/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/skill-ui.test.js`

Expected: FAIL because the renderer does not exist.

- [ ] **Step 3: Implement and verify the renderer**

Render only `type === "skill"` documents with the same card layout as documents. Use existing `edit-doc` and `delete-doc` action classes. Mark the card whose name is `state.templateName` as “当前应用中”, then run `node --test test/settings-panels.test.js test/skill-ui.test.js`.

### Task 3: 验证并发布

**Files:**
- Modify: `app.js`, `index.html`, `styles.css`, `test/settings-panels.test.js`, `test/skill-ui.test.js`

- [ ] **Step 1: Run the full suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Check the patch**

Run: `git diff --check`

Expected: no output and exit code 0.
