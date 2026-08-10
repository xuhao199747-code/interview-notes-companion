# Interview Knowledge Base Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce three fact-grounded, interview-ready Markdown knowledge bases from the approved GEO, tourism, and interview-draft source materials.

**Architecture:** Create one focused Markdown document per knowledge domain. GEO and tourism documents each have one project-level H1 and independent Q&A sections; the common document covers non-project AI product questions. Each question follows the approved six-field template and includes only facts supported by source material.

**Tech Stack:** Markdown, local source Markdown exports, Feishu document exports.

## Global Constraints

- Use the six-field template exactly: keywords, applicable scenario, answer, background, concrete approach, results, and follow-up prompts.
- Preserve only verified numbers and project status from source material; label proposals and unknowns clearly.
- Use first-person, concise, interview-ready language.
- Do not retain Feishu XML tags, draft reminders, duplicated long tables, or unsupported claims.

---

### Task 1: Create GEO interview knowledge base

**Files:**
- Create: `面试知识库-GEO品牌增长平台.md`
- Read: `GEO项目梳理-大王版.md`, [现有面试问答](https://my.feishu.cn/docx/FnRedLabHoVSQ4xBINyccElJnIf)

**Interfaces:**
- Consumes: GEO facts, metrics, cases, technical architecture, and existing interview questions.
- Produces: A standalone interview Q&A document headed `# GEO 品牌增长平台`.

- [ ] **Step 1: Select the source-backed GEO question set**

Include questions for project introduction, user problems, monitoring/collection, metrics, prompt construction, RAG and LightRAG, Agent orchestration, attribution, content optimization, evaluation/Bad Case, cases, and commercial model.

- [ ] **Step 2: Write the document using the required template**

For every question, use:

```markdown
## 问题（问法 A / 问法 B）

**关键词：** …
**适用场景：** …
**回答：** …

**背景：** …
**具体做法：**
1. …

**结果：** …

**追问补充：**
- …
```

- [ ] **Step 3: Validate GEO output**

Run:

```bash
rg -n '<(title|sheet|bitable|whiteboard|callout)' '面试知识库-GEO品牌增长平台.md'
rg -n '^## |^\*\*(关键词|适用场景|回答|背景|具体做法|结果|追问补充)' '面试知识库-GEO品牌增长平台.md'
```

Expected: no Feishu tags; every Q&A section has all required labels.

### Task 2: Create tourism intelligent-marketing interview knowledge base

**Files:**
- Create: `面试知识库-旅游智能营销.md`
- Read: `旅游场景.md`, [现有面试问答](https://my.feishu.cn/docx/FnRedLabHoVSQ4xBINyccElJnIf)

**Interfaces:**
- Consumes: tourism user journey, product boundaries, workflow, risk controls, evaluations, and existing intelligent-marketing interview prompts.
- Produces: A standalone interview Q&A document headed `# 旅游智能营销`.

- [ ] **Step 1: Select the source-backed tourism question set**

Include questions for project introduction, journey and priority choice, first-phase scope, lead handling, intent recognition, demand slots, package matching, RAG, Agent/tool boundaries, handoff and guardrails, evaluation, rollout, and iteration.

- [ ] **Step 2: Write the document using the required template**

For each answer, distinguish implemented capability from planned capability; retain the source’s stated first-phase limitations, including PRODUCT-only scope and mandatory human confirmation for high-risk commitments.

- [ ] **Step 3: Validate tourism output**

Run:

```bash
rg -n '<(title|sheet|bitable|whiteboard|callout)' '面试知识库-旅游智能营销.md'
rg -n '^## |^\*\*(关键词|适用场景|回答|背景|具体做法|结果|追问补充)' '面试知识库-旅游智能营销.md'
```

Expected: no Feishu tags; every Q&A section has all required labels.

### Task 3: Create common AI-product interview knowledge base

**Files:**
- Create: `面试知识库-AI产品通用能力.md`
- Read: [现有面试问答](https://my.feishu.cn/docx/FnRedLabHoVSQ4xBINyccElJnIf)

**Interfaces:**
- Consumes: self-introduction and common AI product questions from the interview draft.
- Produces: A standalone Q&A document headed `# AI 产品通用能力`.

- [ ] **Step 1: Select non-project questions only**

Include self-introduction, AI product manager responsibilities, RAG, Agent, MCP, Skill, evaluation, cost/stability, and project-review framework. Keep project-specific examples in the corresponding project documents.

- [ ] **Step 2: Write the document using the required template**

Use neutral explanations first, then concise personal examples only when they are supported by the source material.

- [ ] **Step 3: Validate common output**

Run:

```bash
rg -n '<(title|sheet|bitable|whiteboard|callout)' '面试知识库-AI产品通用能力.md'
rg -n '^## |^\*\*(关键词|适用场景|回答|背景|具体做法|结果|追问补充)' '面试知识库-AI产品通用能力.md'
```

Expected: no Feishu tags; every Q&A section has all required labels.

### Task 4: Cross-document consistency review

**Files:**
- Modify: `面试知识库-GEO品牌增长平台.md`
- Modify: `面试知识库-旅游智能营销.md`
- Modify: `面试知识库-AI产品通用能力.md`

**Interfaces:**
- Consumes: all three generated knowledge bases.
- Produces: non-contradictory terminology, source-grounded metrics, and readable interview narratives.

- [ ] **Step 1: Review repeated concepts and numbers**

Check that GEO metrics preserve their source definitions, that tourism phases are described as planning or verified status exactly as sourced, and that common questions do not introduce separate project claims.

- [ ] **Step 2: Run final structural validation**

Run:

```bash
for doc in '面试知识库-GEO品牌增长平台.md' '面试知识库-旅游智能营销.md' '面试知识库-AI产品通用能力.md'; do
  test "$(rg -c '^## ' "$doc")" -gt 0 || exit 1
  test "$(rg -c '^\*\*关键词：\*\*' "$doc")" -eq "$(rg -c '^## ' "$doc")" || exit 1
  test "$(rg -c '^\*\*追问补充：\*\*' "$doc")" -eq "$(rg -c '^## ' "$doc")" || exit 1
done
```

Expected: exit code 0.

- [ ] **Step 3: Commit the completed knowledge bases**

```bash
git add -- '面试知识库-GEO品牌增长平台.md' '面试知识库-旅游智能营销.md' '面试知识库-AI产品通用能力.md'
git commit -m 'docs: add interview knowledge bases'
```
