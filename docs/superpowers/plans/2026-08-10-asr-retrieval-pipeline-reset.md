# ASR and Answer Pipeline Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each completed interview question produce one accurate transcript, one correctly scoped retrieval result, and one fast answer that follows the user's Skill.

**Architecture:** Separate the UI status, raw ASR hypothesis, stable ASR utterance, and submitted question into four different state values. Replace the current score-only keyword fallback with a persisted semantic index plus strict intent/project routing; a document is passed to the LLM only when it clears the route's evidence threshold.

**Tech Stack:** Electron, browser Web Audio PCM capture, Node WebSocket ASR client, local JSON persistence, JavaScript tests, local embedding index.

## Global Constraints

- Never use a UI status string as ASR text or a query.
- Never submit an ASR partial result; submit only a provider-final utterance, silence-confirmed stable utterance, or explicit hotkey capture.
- Keep `thinking: { type: "disabled" }` for DeepSeek-compatible requests and keep output streaming enabled.
- A general AI product-manager question must not receive personal/project context unless the question explicitly requests experience, names a project, or is a confirmed follow-up.
- If no evidence clears the threshold, the document panel is an empty state and the LLM receives no unrelated document or personal context.
- Persist documents and indexes locally; deletion must remove both the source document and its index records.

---

## Verified causes to eliminate

1. `setDesktopStatus()` writes operational status into `#transcriptText`; hotkey submission falls back to that DOM text.
2. `decodeDoubaoResponse()` sets `isCumulative` whenever `result.text` exists. The UI consequently replaces a longer hypothesis with a later short ASR partial, such as `如果`.
3. `extractLatestQuestionTurn()` cuts inside `我说自我介绍一下`, yielding `介绍一下`.
4. `src/search.js` is lexical/rule scoring; `src/semantic-search.js` is unused by runtime retrieval. A generic query therefore ranks unrelated GEO/RAG sections.

### Task 1: Make ASR data boundaries explicit

**Files:**

- Create: `src/asr-turn-state.js`
- Modify: `src/doubao-asr.js`
- Modify: `app.js`
- Test: `test/asr-turn-state.test.js`
- Test: `test/doubao-asr.test.js`

**Interfaces:**

- `applyAsrEvent(state, event) -> { rawText, stableText, submitText, changed }`
- `normalizeDoubaoResult(payload, frameFlags) -> { text, final, revision }[]`
- `commitQuestion(text)` accepts only `submitText`, never DOM text.

- [ ] **Step 1: Write failing state-boundary tests**

```js
test("audio progress never becomes a submitted question", () => {
  const state = createAsrTurnState();
  applyAsrEvent(state, { type: "status", message: "已收到 175 个音频包" });
  assert.equal(state.submitText, "");
});

test("a shorter ASR revision does not erase the stable long question", () => {
  const state = createAsrTurnState();
  applyAsrEvent(state, { type: "partial", text: "如果让我从零到一做一个项目" });
  applyAsrEvent(state, { type: "partial", text: "如果" });
  assert.equal(state.rawText, "如果让我从零到一做一个项目");
});

test("final ASR result submits the full sentence once", () => {
  const state = createAsrTurnState();
  applyAsrEvent(state, { type: "final", text: "请做一下自我介绍" });
  assert.equal(state.submitText, "请做一下自我介绍");
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `node --test test/asr-turn-state.test.js`

Expected: FAIL because `src/asr-turn-state.js` does not exist.

- [ ] **Step 3: Implement one state reducer**

```js
export function createAsrTurnState() {
  return { rawText: "", stableText: "", submitText: "", lastFinalText: "" };
}

export function applyAsrEvent(state, event) {
  if (event.type === "status") return { ...state, changed: false };
  const next = chooseLongestCompatibleTranscript(state.rawText, event.text);
  if (event.type !== "final") return { ...state, rawText: next, changed: next !== state.rawText };
  if (!event.text || event.text === state.lastFinalText) return { ...state, changed: false };
  return { rawText: "", stableText: event.text, submitText: event.text, lastFinalText: event.text, changed: true };
}
```

- [ ] **Step 4: Route the UI through the reducer**

`setDesktopStatus()` updates only `#desktopAsrStatus`. `handleAsrEvent()` renders `state.rawText`, and `commitHotkeyQuestion()` reads `state.rawText` only. Remove `#transcriptText` as a source of truth.

- [ ] **Step 5: Run focused and full tests**

Run: `node --test test/asr-turn-state.test.js test/doubao-asr.test.js && npm test`

Expected: all tests pass.

### Task 2: Correct question extraction and ASR completion

**Files:**

- Modify: `src/question-turn.js`
- Modify: `src/turn-detector.js`
- Test: `test/question-turn.test.js`
- Test: `test/turn-detector.test.js`

**Interfaces:**

- `extractLatestQuestionTurn(text)` may split only at punctuation or a verified complete-turn boundary; it must not split a phrase internally.
- `isCompleteQuestion(text)` returns false for ASR statuses, partial clauses, and strings shorter than four meaningful characters.

- [ ] **Step 1: Add failing regression cases**

```js
assert.equal(extractLatestQuestionTurn("我说自我介绍一下"), "我说自我介绍一下");
assert.equal(extractLatestQuestionTurn("如果让我从零到一做一个项目，你会怎么做"), "如果让我从零到一做一个项目，你会怎么做");
assert.equal(isCompleteQuestion("全程监听中：已收到 175 个音频包"), false);
```

- [ ] **Step 2: Run focused tests and observe the first case fail**

Run: `node --test test/question-turn.test.js test/turn-detector.test.js`

Expected: FAIL because the current starter matching returns `介绍一下`.

- [ ] **Step 3: Remove phrase-internal starter slicing**

Only accept a later question starter after a punctuation boundary or when the prefix is independently a confirmed sentence. Preserve full input when the phrase contains `自我介绍`.

- [ ] **Step 4: Run focused and full tests**

Run: `node --test test/question-turn.test.js test/turn-detector.test.js && npm test`

Expected: all tests pass.

### Task 3: Build a real persisted semantic retrieval index

**Files:**

- Create: `src/knowledge-index.js`
- Create: `src/embedding-provider.js`
- Modify: `src/document-store.js`
- Modify: `src/search.js`
- Modify: `src/answer-router.js`
- Modify: `server.js`
- Test: `test/knowledge-index.test.js`
- Test: `test/search.test.js`

**Interfaces:**

- `buildKnowledgeIndex(documents) -> { version, sections, vectors }`
- `searchKnowledgeIndex(index, query, { scope, limit }) -> SearchMatch[]`
- `SearchMatch` includes `semanticScore`, `lexicalScore`, `evidenceScore`, and `eligible`.

- [ ] **Step 1: Write failing semantic-routing tests**

```js
test("自我介绍的同义问法命中个人介绍而非 GEO", async () => {
  const index = await buildKnowledgeIndex([profileDocument, geoDocument]);
  const [match] = await searchKnowledgeIndex(index, "说说你的情况", { scope: "experience", limit: 1 });
  assert.equal(match.title, "自我介绍");
});

test("通用从零到一问题不召回项目资料", async () => {
  const index = await buildKnowledgeIndex([geoDocument]);
  assert.deepEqual(await searchKnowledgeIndex(index, "从零到一做 AI 产品怎么做", { scope: "general", limit: 3 }), []);
});
```

- [ ] **Step 2: Run focused test and confirm failure**

Run: `node --test test/knowledge-index.test.js`

Expected: FAIL because runtime search has no persisted semantic index.

- [ ] **Step 3: Implement persisted indexing on upload/update**

Parse Markdown into chunks with document ID, heading hierarchy, project, and section text. Build embeddings in a background job after upload, store them with an index version next to `documents.json`, and retain the previous usable index until replacement succeeds.

- [ ] **Step 4: Implement strict route gates**

General mode returns no project/personal sections. Experience mode searches profile sections. Project mode searches only the named or confirmed active project. A candidate is eligible only if semantic score, lexical anchor score, and intent compatibility all pass their thresholds.

- [ ] **Step 5: Run exact local regression corpus**

Run: `node --test test/knowledge-index.test.js test/search.test.js test/answer-router.test.js && npm test`

Expected: `自我介绍一下` maps to `自我介绍`; generic zero-to-one has zero document matches; `RAG 怎么设计` maps to the RAG section only.

### Task 4: Constrain and speed up generation

**Files:**

- Modify: `src/llm-request.js`
- Modify: `server.js`
- Modify: `src/llm-stream.js`
- Test: `test/llm-request.test.js`
- Test: `test/llm-stream.test.js`

**Interfaces:**

- `buildAnswerRequest()` uses an explicit non-reasoning model profile.
- `buildGenerationContext(route)` contains only route-eligible chunks and at most 3,600 Chinese characters.

- [ ] **Step 1: Add failing payload tests**

```js
assert.deepEqual(request.thinking, { type: "disabled" });
assert.equal(request.max_tokens, 420);
assert.equal(Object.hasOwn(request, "stream"), true);
```

- [ ] **Step 2: Run focused test**

Run: `node --test test/llm-request.test.js test/llm-stream.test.js`

Expected: FAIL until the request profile and context budget are updated.

- [ ] **Step 3: Implement fast-answer profile**

Use the configured non-thinking model, streaming response, `max_tokens: 420`, hard context caps, and a system instruction that returns a direct interview answer—not a generic tutorial—while refusing unrelated project claims.

- [ ] **Step 4: Verify real local LLM connectivity without exposing a key**

Run:

```bash
INTERVIEW_DATA_DIR="$HOME/Library/Application Support/interview-notes-companion" node --input-type=module <<'NODE'
import { startServer } from "./server.js";
const server = await startServer(0);
const { port } = server.address();
const response = await fetch(`http://127.0.0.1:${port}/api/llm/test`, { method: "POST" });
const result = await response.json();
console.log(JSON.stringify({ status: response.status, usable: result.usable, message: result.message, error: result.error }));
await new Promise((resolve) => server.close(resolve));
NODE
```

Expected: `{ "usable": true }` and no secret in output.

### Task 5: Add an in-app diagnostic panel and end-to-end regression harness

**Files:**

- Create: `src/pipeline-diagnostics.js`
- Modify: `app.js`
- Modify: `index.html`
- Test: `test/pipeline-diagnostics.test.js`
- Test: `test/interview-pipeline.test.js`

**Interfaces:**

- `recordPipelineEvent({ stage, textLength, final, requestId, matchCount, scope })`
- Diagnostics show only timestamps, lengths, state transitions, and selected titles—not API keys or raw audio.

- [ ] **Step 1: Write failing end-to-end fixture**

```js
test("one long ASR question creates exactly one correctly scoped answer", async () => {
  const result = await runInterviewPipeline(fixture("请做一下自我介绍"));
  assert.equal(result.submittedQuestions.length, 1);
  assert.equal(result.submittedQuestions[0], "请做一下自我介绍");
  assert.equal(result.matches[0].title, "自我介绍");
});
```

- [ ] **Step 2: Run it and confirm failure against the old pipeline**

Run: `node --test test/interview-pipeline.test.js`

Expected: FAIL before Tasks 1–4 are integrated.

- [ ] **Step 3: Implement the redacted diagnostics panel**

Expose `captured → ASR partial → ASR final → submitted → routed → generated` with timestamps and query length. Keep it in Settings so the interview view remains compact.

- [ ] **Step 4: Run the full suite and manual desktop smoke test**

Run: `npm test && node --check app.js && node --check server.js && node --check electron/main.js && git diff --check`

Expected: all checks pass. Then in the desktop app test: a long self-introduction, a generic zero-to-one question, a project RAG question, and a second consecutive question.

## Coverage Review

- Long ASR text no longer collapses to a partial: Tasks 1–2.
- Status text cannot become a question: Task 1.
- Self-introduction and project questions have distinct routes: Task 3.
- Large Markdown corpus remains fast after upload: Task 3.
- Non-thinking, short-latency LLM output: Task 4.
- Future regressions are visible and reproducible: Task 5.
