# Fast First Token Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变检索和回答范围的前提下，缩短 LLM 流式回答的首字等待。

**Architecture:** 后端使用独立的首读上下文预算构建模型输入，保留命中排序但缩短发送文本。前端维持同一篇答案逐 delta 追加，首个文本 delta 即渲染。

**Tech Stack:** Node.js、HTTP SSE、Electron renderer、node:test。

## Global Constraints

- 不修改知识库检索、项目路由、术语纠错和本地资料。
- 保持 DeepSeek 深度思考关闭和 `stream: true`。
- 不替换已显示的回答文字。

---

### Task 1: 首读上下文预算

**Files:**
- Modify: `src/llm-context.js`
- Test: `test/llm-context.test.js`

**Interfaces:**
- Produces: `buildFastFirstTokenContext(matches)`，返回前两条命中、每条最多 900 字的上下文。

- [ ] **Step 1: Write the failing test**

```js
test("首读上下文只保留两条最强资料并裁剪每条长度", () => {
  const context = buildFastFirstTokenContext([
    { title: "第一条", content: "甲".repeat(1200) },
    { title: "第二条", content: "乙".repeat(1200) },
    { title: "第三条", content: "丙".repeat(1200) },
  ]);
  assert.match(context, /第一条/);
  assert.match(context, /第二条/);
  assert.doesNotMatch(context, /第三条/);
  assert.ok(context.length < 1900);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/llm-context.test.js`

- [ ] **Step 3: Write minimal implementation**

```js
export function buildFastFirstTokenContext(matches = []) {
  return buildLlmContext(matches, { maxItems: 2, maxItemChars: 900 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/llm-context.test.js`

### Task 2: API uses the smaller budget while retaining SSE forwarding

**Files:**
- Modify: `server.js`
- Test: `test/llm-context.test.js`

**Interfaces:**
- Consumes: `buildFastFirstTokenContext(matches)`.
- Produces: `/api/generate` prompt whose material context is compact.

- [ ] **Step 1: Write failing source-contract test**

```js
assert.match(server, /buildFastFirstTokenContext\(input\.context \|\| \[\]\)/);
assert.match(server, /stream: true/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/llm-context.test.js`

- [ ] **Step 3: Import and call `buildFastFirstTokenContext`; clip personal context to 700, prior context to 400, and Skill to 1800 characters.**

- [ ] **Step 4: Run full verification**

Run: `npm test && node --check server.js && node --check app.js`
