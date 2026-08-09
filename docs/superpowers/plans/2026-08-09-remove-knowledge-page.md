# Remove Knowledge Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the duplicate standalone knowledge-base navigation page while retaining settings-based source management and search.

**Architecture:** The standalone page is static HTML and one click handler in `app.js`. Remove both. The settings panel continues to own the existing upload grid and file input.

**Tech Stack:** HTML, browser JavaScript, Node.js built-in test runner.

## Global Constraints

- Do not change localStorage keys or document search behavior.
- Keep the `knowledgeSettings` panel and its `knowledgeGrid` intact.

---

### Task 1: Remove the duplicate navigation surface

**Files:**
- Create: `test/navigation.test.js`
- Modify: `index.html:16-40`
- Modify: `app.js:452-464`

**Interfaces:**
- Consumes: `data-view` navigation buttons and `knowledgeSettings` settings panel.
- Produces: A UI with only Question and Settings primary navigation.

- [x] **Step 1: Write the failing test**

```js
test("独立知识库入口已移除，设置资料管理仍存在", async () => {
  const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, /data-view="knowledgeView"/);
  assert.doesNotMatch(html, /id="knowledgeView"/);
  assert.match(html, /id="knowledgeSettings"/);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test test/navigation.test.js`

Expected: FAIL because the standalone navigation button and page are still present.

- [x] **Step 3: Write minimal implementation**

Remove the `knowledgeView` navigation button and section from `index.html`, and remove the `openSettingsFromKnowledge` event listener from `app.js`.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test test/navigation.test.js test/search.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html app.js test/navigation.test.js docs/superpowers/plans/2026-08-09-remove-knowledge-page.md
git commit -m "feat: remove duplicate knowledge page"
```
