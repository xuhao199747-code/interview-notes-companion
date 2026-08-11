# AI 产品经理面试答题助手 Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the pasted AI 产品经理完整口述回答规则 uploadable and ensure the app can produce a 1–2 minute evidence-bound answer with it.

**Architecture:** The renderer stores the most recently uploaded answer-Skill Markdown as `interview.template` and sends it with each generated answer. The server combines that template with retrieved project evidence and candidate context. Preserve the existing full-answer runtime changes; add a distributable Skill Markdown and verify the template/request path.

**Tech Stack:** Electron renderer, Node.js HTTP server, Node built-in test runner, Markdown.

## Global Constraints

- Treat only knowledge-base, transcript, and candidate-background facts as facts.
- Do not fabricate projects, numbers, company information, or results; explicitly mark missing facts as requiring confirmation.
- Generate a spoken 1–2 minute response, not an outline or a 180-character scan answer.
- Keep one current active Skill; a newly uploaded Skill replaces the prior generation rule.
- Do not restart a running interview session without the user's explicit confirmation.

---

### Task 1: Verify full-answer request behavior

**Files:**
- Verify: `server.js:33-42`
- Verify: `src/llm-request.js:8-18`
- Test: `test/llm-request.test.js`

**Interfaces:**
- Consumes: `buildAnswerRequest({ apiUrl, model, system, user, stream })`.
- Produces: an upstream request with `max_tokens: 650` and the user-provided answer Skill in the user prompt.

- [ ] **Step 1: Run the focused request test**

Run: `node --test test/llm-request.test.js`

Expected: PASS for a DeepSeek request with `thinking.type === "disabled"` and `max_tokens === 650`.

- [ ] **Step 2: Inspect the generated-answer prompt boundary**

Run: `rg -n '1–2 分钟|完整口述回答|请按以下回答 Skill' server.js`

Expected: the server asks for a conclusion followed by background/problem, actions and trade-offs, results, and reflection; it does not contain an 180-character limit.

### Task 2: Add the uploadable answer Skill

**Files:**
- Create: `assets/AI产品经理面试完整口述回答Skill.md`
- Test: `test/answer-skill-asset.test.js`

**Interfaces:**
- Consumes: the application's existing `skillFileInput`, which accepts Markdown files.
- Produces: a Markdown template a user can upload through “回答 Skill”.

- [ ] **Step 1: Write the failing asset-contract test**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const skillUrl = new URL("../assets/AI产品经理面试完整口述回答Skill.md", import.meta.url);

test("完整口述回答 Skill 包含事实边界和五段口述结构", async () => {
  const skill = await readFile(skillUrl, "utf8");
  for (const heading of ["## 目标", "## 回答原则", "### 结论", "### 背景与问题", "### 具体做法", "### 结果", "### 复盘"]) {
    assert.match(skill, new RegExp(heading));
  }
  assert.match(skill, /资料不足时明确说“这部分需要本人确认”/);
  assert.match(skill, /业务目标、产品设计、技术取舍、评估指标、迭代闭环/);
});
```

- [ ] **Step 2: Run the test to verify it fails before the asset exists**

Run: `node --test test/answer-skill-asset.test.js`

Expected: FAIL with `ENOENT` for `assets/AI产品经理面试完整口述回答Skill.md`.

- [ ] **Step 3: Create the Skill Markdown**

Create the file with the exact user-approved content: goal, evidence-only rules, five answer sections (结论、背景与问题、具体做法、结果、复盘), and the five AI-product perspectives.

- [ ] **Step 4: Run the asset-contract test**

Run: `node --test test/answer-skill-asset.test.js`

Expected: PASS.

### Task 3: Verify application upload and retrieval integration

**Files:**
- Verify: `app.js:37-44, 160-164, 556-559`
- Test: `test/skill-ui.test.js`, `test/upload-types.test.js`, `test/answer-router.test.js`

**Interfaces:**
- Consumes: uploaded Markdown and matching source sections.
- Produces: the uploaded Markdown as `template` in `POST /api/generate`, with up to five relevant document sections as `context`.

- [ ] **Step 1: Run the focused integration tests**

Run: `node --test test/skill-ui.test.js test/upload-types.test.js test/answer-router.test.js`

Expected: PASS; the latest uploaded Skill is active, Markdown upload is accepted, and retrieved material is routed into the generated answer flow.

- [ ] **Step 2: Confirm the live runtime needs a restart**

Run: `stat -f 'server.js modified: %Sm' server.js && ps -p 35932 -o pid=,lstart=,command=`

Expected: if the server start time predates the source modification time, report that the running process must be restarted before it can use the new prompt.

- [ ] **Step 3: Restart only after user confirmation**

Close and relaunch the local server and Electron app after the user confirms no interview/recording is in progress. Then upload `assets/AI产品经理面试完整口述回答Skill.md` from “回答 Skill” and ask one project question to verify the generated response uses the five sections.
