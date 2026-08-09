# 双来源回答与上一题保留 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将回答区拆为文档库和 LLM 两个来源，并稳定保留上一题的完整快照。

**Architecture:** 新建无 DOM 依赖的回答状态模块，负责问题确认、归档和 LLM 请求编号保护。`app.js` 只负责将该状态渲染进双栏页面，并由确认后的问题同时启动检索和异步生成。

**Tech Stack:** 原生 ES modules、Node 内置测试运行器、HTML/CSS。

## Global Constraints

- 不新增第三方依赖。
- LLM 对每个确认问题自动生成。
- Skill Markdown 只可从“回答 Skill”页上传。
- 上一题必须为页面真实内容，不可仅用提示文字替代。

---

### Task 1: 回答快照状态

**Files:**
- Create: `src/answer-state.js`
- Test: `test/answer-state.test.js`

**Interfaces:**
- Produces: `isConfirmedQuestion(question)`, `createAnswerState()`, `beginQuestion(state, question, documentHtml)`, `acceptLlmAnswer(state, requestId, llmHtml)`。

- [ ] **Step 1: Write the failing test**

```js
test("完整新问题会归档当前题，过时 LLM 回答不会覆盖新题", () => {
  const state = createAnswerState();
  const first = beginQuestion(state, "你做过什么项目", "文档一");
  const second = beginQuestion(state, "你如何处理困难", "文档二");
  assert.equal(state.previous.question, "你做过什么项目");
  assert.equal(acceptLlmAnswer(state, first.requestId, "过时"), false);
  assert.equal(acceptLlmAnswer(state, second.requestId, "当前"), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/answer-state.test.js`
Expected: FAIL because `src/answer-state.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

```js
export function isConfirmedQuestion(question) { return question.trim().length >= 4; }
export function createAnswerState() { return { current: null, previous: null, nextRequestId: 0 }; }
export function beginQuestion(state, question, documentHtml) { /* archive current and allocate request id */ }
export function acceptLlmAnswer(state, requestId, llmHtml) { /* only update matching current request */ }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/answer-state.test.js`
Expected: PASS.

### Task 2: 双来源回答渲染和自动生成

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`

**Interfaces:**
- Consumes: Task 1 answer-state exports.
- Produces: `confirmQuestion(query)` and the `previousAnswer`, `documentResults`, `llmResults` DOM regions.

- [ ] **Step 1: Replace the single result region with previous-answer and two source regions**

```html
<section class="previous-answer" id="previousAnswer"></section>
<div class="answer-source-grid">
  <section class="answer-source"><div id="documentResults"></div></section>
  <section class="answer-source"><div id="llmResults"></div></section>
</div>
```

- [ ] **Step 2: Render document hits immediately and request LLM automatically**

```js
function confirmQuestion(query) {
  if (!isConfirmedQuestion(query)) return;
  const documentHtml = renderDocumentResults(query);
  const current = beginQuestion(answerState, query, documentHtml);
  renderAnswerState();
  generateAnswer(query, current.requestId);
}
```

- [ ] **Step 3: Keep previous answer through partial speech and stale async responses**

```js
if (!acceptLlmAnswer(answerState, requestId, answerHtml)) return;
renderAnswerState();
```

- [ ] **Step 4: Add responsive styles for a two-column source layout**

```css
.answer-source-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
@media (max-width:700px) { .answer-source-grid { grid-template-columns:1fr; } }
```

### Task 3: 专属 Skill 上传入口

**Files:**
- Modify: `index.html`
- Modify: `app.js`

**Interfaces:**
- Produces: `skillFileInput` event handler that calls `addDocument(file.name, markdown, "skill")`.

- [ ] **Step 1: Remove the Skill option from source type**

```html
<select id="sourceType"><option value="transcript">逐字稿</option><option value="knowledge">知识库</option></select>
```

- [ ] **Step 2: Add a hidden Skill file input in the Answer Skill panel**

```html
<label class="primary-button" for="skillFileInput">＋ 上传 Skill 文档</label>
<input id="skillFileInput" type="file" accept=".md,.markdown,text/markdown" hidden />
```

- [ ] **Step 3: Bind the dedicated input**

```js
$("skillFileInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (file) addDocument(file.name, await file.text(), "skill");
  event.target.value = "";
});
```

### Task 4: Full verification

**Files:**
- Test: `test/*.test.js`

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`
Expected: PASS with zero failures.

- [ ] **Step 2: Run the app and visually inspect the answer region**

Run: `npm start`
Expected: server starts; the question page shows a previous-answer card and two answer sources.

### Task 5: 问题完成判定

**Files:**
- Modify: `src/speech.js`
- Modify: `app.js`
- Test: `test/speech.test.js`

- [ ] **Step 1: Test the completion delay**

```js
assert.equal(getQuestionConfirmationDelay("你怎么解决的？"), 0);
assert.equal(getQuestionConfirmationDelay("请介绍你的项目"), 1000);
assert.equal(getQuestionConfirmationDelay("好的"), null);
```

- [ ] **Step 2: Schedule only complete questions**

```js
const delay = getQuestionConfirmationDelay(state.speechFinal);
if (delay === null) return;
state.speechTimer = setTimeout(confirmQuestion, delay);
```
