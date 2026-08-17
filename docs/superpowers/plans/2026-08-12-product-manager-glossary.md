# 产品经理术语表 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a separately managed local Markdown glossary for product-manager terminology without changing the existing AI glossary.

**Architecture:** Reuse the existing single-file document-store pattern with a separate `product-manager-glossary.json` endpoint. The renderer keeps its own product glossary state, merges its parsed aliases with the AI glossary before normalizing questions, and exposes a sibling settings Tab with the same upload/delete/download interaction.

**Tech Stack:** Electron, Node.js HTTP server, browser ES modules, Node test runner.

## Global Constraints

- Keep the existing `/api/glossary` contract and existing AI glossary data unchanged.
- Store only one product-manager glossary Markdown file in Electron `userData`.
- Do not include real user material, tokens, or credentials in code or tests.
- Use test-first development for every behavior change.

---

### Task 1: Add a dedicated local API store

**Files:**
- Modify: `server.js`
- Test: `test/product-manager-glossary.test.js`

**Interfaces:**
- Produces `GET`, `PUT`, and `DELETE /api/product-manager-glossary`.
- Returns `{ glossary: { name, markdown, type: "product-glossary" } | null }` from GET and PUT.

- [ ] **Step 1: Write the failing test**

```js
test("产品经理术语表独立保存且不影响 AI 术语表", async () => {
  const api = await createTestServer();
  await api.put("/api/product-manager-glossary", { name: "产品术语.md", markdown: "## 北极星指标\n别名：核心指标", });
  assert.equal((await api.get("/api/product-manager-glossary")).glossary.name, "产品术语.md");
  assert.equal((await api.get("/api/glossary")).glossary, null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/product-manager-glossary.test.js`

Expected: FAIL because `/api/product-manager-glossary` is not registered.

- [ ] **Step 3: Write minimal implementation**

```js
const productGlossaryStore = createDocumentStore(path.join(dataDirectory, "product-manager-glossary.json"));
// Reuse get/save/delete glossary helpers with productGlossaryStore and type "product-glossary".
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/product-manager-glossary.test.js`

Expected: PASS.

### Task 2: Merge product aliases into question normalization

**Files:**
- Modify: `app.js`
- Test: `test/product-manager-glossary-ui.test.js`

**Interfaces:**
- `state.productGlossary` holds parsed terms from the new file.
- `normalizeQuestion(cleanQuery, [...state.glossary, ...state.productGlossary])` uses both lists.

- [ ] **Step 1: Write the failing test**

```js
test("问题归一化合并 AI 术语表和产品经理术语表", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /normalizeQuestion\(cleanQuery, \[\.\.\.state\.glossary, \.\.\.state\.productGlossary\]\)/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/product-manager-glossary-ui.test.js`

Expected: FAIL because `state.productGlossary` does not exist.

- [ ] **Step 3: Write minimal implementation**

```js
productGlossary: [],
productGlossaryFileName: "未上传产品经理术语表",
productGlossaryMarkdown: "",
```

Add independent load, persist, import, delete and section conversion helpers following the existing glossary helpers. Keep their API path and browser-storage keys distinct.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/product-manager-glossary-ui.test.js`

Expected: PASS.

### Task 3: Add the settings Tab and verify regressions

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `test/settings-panels.test.js`
- Test: `test/product-manager-glossary-ui.test.js`

**Interfaces:**
- Provides `data-settings="productGlossarySettings"` and `id="productGlossarySettings"`.
- Provides `productGlossaryFileInput` and `productGlossaryCardList`.
- Every uploaded file card provides text actions in the fixed order `下载｜删除`; empty upload cards provide no actions.

- [ ] **Step 1: Write the failing test**

```js
test("设置页提供独立的产品经理术语表 Tab", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /data-settings="productGlossarySettings">产品经理术语表/);
  assert.match(html, /id="productGlossaryFileInput"/);
  assert.match(html, /id="productGlossaryCardList"/);
});

test("已上传文件卡片统一提供下载和删除文字按钮", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /下载<\/button><button class="delete-glossary/);
  assert.match(app, /下载<\/button><button class="delete-product-glossary/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/product-manager-glossary-ui.test.js test/settings-panels.test.js`

Expected: FAIL because the new Tab does not exist.

- [ ] **Step 3: Write minimal implementation**

Add the Tab next to “术语表”, use the existing card visual style, and wire change/drop/delete events only to the product glossary state and endpoints. Extract or reuse one card action convention so uploaded knowledge, Skill, answer-rule, AI glossary and product glossary cards all render text actions in the fixed order “下载｜删除”.

- [ ] **Step 4: Run focused and full verification**

Run: `node --test test/product-manager-glossary.test.js test/product-manager-glossary-ui.test.js test/glossary.test.js test/settings-panels.test.js && npm test`

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server.js app.js index.html test/product-manager-glossary.test.js test/product-manager-glossary-ui.test.js test/settings-panels.test.js docs/superpowers/specs/2026-08-12-product-manager-glossary-design.md docs/superpowers/plans/2026-08-12-product-manager-glossary.md
git commit -m "feat: add product manager glossary tab"
```
