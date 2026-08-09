# Retrieval and Turn Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure each confirmed interview question replaces stale UI state, retrieves only relevant personal materials, and uses an explicit empty state when evidence is insufficient.

**Architecture:** Normalize an ASR payload into its latest question turn before answer routing. Retrieve document chunks with semantic vectors plus lexical scoring, reject low-confidence candidates, then send only the current high-confidence evidence and a separately selected personal-background context to the LLM.

**Tech Stack:** Electron, Node.js, native JavaScript, local Markdown, local embedding runtime, cosine similarity.

## Global Constraints

- Preserve the existing verified PCM capture and Doubao WebSocket protocol.
- Do not display or log secret values.
- A new question clears document and LLM panels synchronously before any asynchronous LLM response.
- A document is supplied to the LLM only after passing the retrieval confidence threshold.
- `npm test` must pass before desktop restart.

### Task 1: Normalize ASR turns

**Files:** `src/question-turn.js`, `test/question-turn.test.js`, `app.js`

- [ ] Write failing examples for cumulative ASR text containing earlier and later questions.
- [ ] Return the last standalone question for an utterance such as `介绍一下你自己。你的项目有什么优势`.
- [ ] Use the normalized text in `commitAsrQuestion` before creating a request ID.
- [ ] Verify focused and full tests.

### Task 2: Reset answer state and enforce empty state

**Files:** `src/answer-state.js`, `src/answer-router.js`, `test/answer-state.test.js`, `test/answer-router.test.js`, `app.js`

- [ ] Write failing tests for a new question replacing stale document and LLM content.
- [ ] Reject generic matches such as `自我介绍` for `如果让你重新做一个项目，你会怎么做`.
- [ ] Render the explicit empty state and pass no document chunks to the LLM on rejection.
- [ ] Verify focused and full tests.

### Task 3: Add semantic retrieval

**Files:** `src/semantic-search.js`, `src/search.js`, `test/semantic-search.test.js`, `package.json`

- [ ] Add local Chinese embedding generation and persisted per-section vector cache.
- [ ] Score cosine similarity with lexical retrieval; merge and rerank candidates.
- [ ] Add synonyms cases: `说说你的情况` and `简单介绍你的经历` retrieve `自我介绍`.
- [ ] Reject non-semantic generic project overlap below the confidence threshold.
- [ ] Verify retrieval cases against `interview-knowledge-base.md`.

### Task 4: Ground LLM answers

**Files:** `src/llm-context.js`, `server.js`, `app.js`, `test/llm-context.test.js`

- [ ] Separate personal background chunks from current-answer evidence.
- [ ] Require generated facts to be backed by supplied chunks.
- [ ] When there is no evidence, return only a clearly labelled generic framework, never stale personal project facts.
- [ ] Verify generated request payloads and run full tests.
