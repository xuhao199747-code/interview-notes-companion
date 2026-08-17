# Offline Knowledge Card Index Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert mixed Markdown into internal metadata-rich knowledge cards and use hybrid retrieval with fast local reranking.

**Architecture:** Keep raw documents as the source of truth. Enrich parsed sections with card metadata at upload/load time, index their retrieval text offline, and merge lexical plus semantic retrieval at query time with RRF before a deterministic local rerank.

**Tech Stack:** Electron, Node.js, local Transformers embeddings, node:test.

## Global Constraints

- Preserve existing documents and configuration.
- Do not invoke LLM during document parsing or reranking.
- Keep query-time candidate processing bounded to 12 items.
- Write a failing node:test before each behavior change.

---

### Task 1: Knowledge-card metadata

**Files:**
- Create: `src/knowledge-cards.js`
- Modify: `src/search.js`
- Test: `test/knowledge-cards.test.js`

**Interfaces:**
- Produces `enrichKnowledgeCard(section): section` with `cardId`, `aliases`, `retrievalText`, and `cardScope`.

- [ ] Write tests for a GEO RAG section and a general RAG section.
- [ ] Verify tests fail before the module exists.
- [ ] Implement deterministic card metadata without changing raw content.
- [ ] Run `node --test test/knowledge-cards.test.js`.

### Task 2: Retrieval text indexing

**Files:**
- Modify: `src/local-semantic-index.js`, `src/search.js`
- Test: `test/local-semantic-index.test.js`, `test/search.test.js`

**Interfaces:**
- Consumes card `retrievalText`.
- Produces lexical and semantic candidates that both use title aliases.

- [ ] Write failing tests for alias retrieval.
- [ ] Verify tests fail.
- [ ] Use enriched retrieval text for both index and lexical tokenization.
- [ ] Run focused tests.

### Task 3: RRF and bounded local reranking

**Files:**
- Create: `src/retrieval-rerank.js`
- Modify: `src/hybrid-retrieval.js`
- Test: `test/hybrid-retrieval.test.js`, `test/retrieval-rerank.test.js`

**Interfaces:**
- Produces `mergeHybridCandidates(query, sections, semanticMatches, limit)` with a max-12 candidate pool.

- [ ] Write failing test showing a semantic-only relevant card survives a weak lexical result.
- [ ] Verify test fails.
- [ ] Implement RRF fusion and deterministic title/project/intent reranking.
- [ ] Run focused tests and full `npm test`.

### Task 4: Regression verification

**Files:**
- Test: `test/search.test.js`, `test/answer-router.test.js`, `test/semantic-retrieval-api.test.js`

- [ ] Run retrieval and routing regression tests.
- [ ] Run `npm test`.
- [ ] Manually inspect the existing document import path without modifying stored files.
