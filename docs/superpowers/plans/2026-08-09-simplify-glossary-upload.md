# Simplify Glossary Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the glossary settings page show only Markdown upload and the active file name while applying valid uploads automatically.

**Architecture:** Keep glossary parsing and localStorage persistence unchanged. Replace the retrieval-settings markup with a small upload card, and render its status from existing glossary state.

**Tech Stack:** HTML, CSS, vanilla JavaScript, Node.js built-in test runner.

## Global Constraints

- A valid Markdown upload immediately replaces the active glossary and persists it locally.
- The page must not expose project selection, format examples, or parsed term entries.
- Invalid uploads must not replace the active glossary.

---

### Task 1: Render a minimal glossary upload state

**Files:**
- Modify: `index.html:41`
- Modify: `app.js:79-85,534-549`
- Modify: `test/glossary.test.js`

**Interfaces:**
- Consumes: `parseGlossaryMarkdown(markdown)` from `src/glossary.js`.
- Produces: `renderGlossaryUploadState(fileName)` to return the file-name status copy used by the retrieval settings renderer.

- [x] **Step 1: Write the failing test**

```js
import { renderGlossaryUploadState } from "../src/glossary.js";

test("术语表上传状态只显示文件名和自动应用状态", () => {
  assert.equal(
    renderGlossaryUploadState("AI产品经理术语表.md"),
    "AI产品经理术语表.md（已自动应用）",
  );
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- test/glossary.test.js`

Expected: FAIL because `renderGlossaryUploadState` is not exported.

- [x] **Step 3: Write minimal implementation**

```js
export function renderGlossaryUploadState(fileName = "") {
  return fileName ? `${fileName}（已自动应用）` : "尚未上传术语表";
}
```

Use the function in `renderRetrievalSettings()`. Replace the current retrieval-settings HTML with a title, one upload label/input, and a status element. Keep the current change handler; on invalid Markdown, set the status text without saving or replacing `state.glossary`.

- [x] **Step 4: Run tests to verify they pass**

Run: `npm test -- test/glossary.test.js`

Expected: PASS with all glossary tests passing.

- [x] **Step 5: Run full verification**

Run: `npm test`

Expected: PASS with no test failures.
