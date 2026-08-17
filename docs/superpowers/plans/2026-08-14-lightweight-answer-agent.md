# Lightweight Answer Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local, deterministic evidence gate around the existing answer flow so reliable local facts are cited and weak matches fall back to the configured LLM without fabricated local context.

**Architecture:** A new pure module evaluates the already-ranked hybrid candidates and returns a small evidence set plus a mode. `app.js` uses it after the existing router, leaving recording and LLM transport unchanged. The server excludes non-knowledge Skill documents when building semantic sections.

**Tech Stack:** Electron renderer JavaScript, Node HTTP server, Node test runner.

## Global Constraints

- Keep the current manual-start and manual/timeout question submission behavior unchanged.
- Do not add a new network request or provider.
- Do not save or fabricate a local generic answer.
- Exclude `skill` and `converter-skill` from semantic indexing.

---

### Task 1: Evidence gate

**Files:**
- Create: `src/answer-evidence.js`
- Create: `test/answer-evidence.test.js`

**Interfaces:**
- Produces: `selectAnswerEvidence({ query, scope, candidates, limit })` returning `{ mode, evidence, reason }`.

- [ ] Write a failing test proving low-confidence semantic-only candidates produce `llm-only` and no evidence.
- [ ] Run `node --test test/answer-evidence.test.js` and confirm it fails because the module is absent.
- [ ] Implement the smallest deterministic candidate gate and a three-item limit.
- [ ] Re-run `node --test test/answer-evidence.test.js` and confirm it passes.

### Task 2: Integrate the existing answer flow

**Files:**
- Modify: `app.js`
- Modify: `test/semantic-retrieval-ui.test.js`

**Interfaces:**
- Consumes: `selectAnswerEvidence()` from Task 1.
- Produces: LLM context containing only evidence for `grounded` mode.

- [ ] Write a failing UI-source test requiring the evidence gate after `routeAnswer()`.
- [ ] Run `node --test test/semantic-retrieval-ui.test.js` and confirm it fails.
- [ ] Use evidence for document display and LLM context; preserve the current route, retrieval deadline and answer generation path.
- [ ] Re-run the focused test and the related answer-routing tests.

### Task 3: Keep all Skill files out of semantic retrieval

**Files:**
- Modify: `server.js`
- Modify: `test/semantic-retrieval-api.test.js`

**Interfaces:**
- Changes: `sectionsFromDocuments(documents)` accepts only knowledge documents.

- [ ] Write a failing source test that requires both `skill` and `converter-skill` to be excluded.
- [ ] Run `node --test test/semantic-retrieval-api.test.js` and confirm it fails.
- [ ] Apply the minimal filter change.
- [ ] Re-run semantic retrieval tests and the full focused suite.
