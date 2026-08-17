# 完整 AI 术语识别词库 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立完整、分层、可测试的 AI 术语和语音误识别词库，并同步到桌面 APP，同时确保术语表不会污染本地项目资料检索。

**Architecture:** `AI产品经理术语表.md` 继续作为用户可阅读、可上传的词条来源；`src/glossary.js` 作为内置归一化底座并承载有语境边界的 ASR 修正。`app.js` 使用归一化后的问题显示、检索和保存当前题；`server.js` 约束未命中定义题不编造未知专名。

**Tech Stack:** Node.js ESM、Electron、原生 `node:test`、本地 HTTP API。

## Global Constraints

- 术语表只做问题归一化，不作为资料库检索或引用来源。
- 普通词和真实产品名不能被无条件纠错为术语。
- 每次生产代码或识别规则变化均先写失败测试，再做最小实现。
- 所有完成的本地术语表变更必须经 `/api/glossary` 同步至当前桌面 APP。

---

### Task 1: 盘点并扩充术语表词条

**Files:**
- Modify: `AI产品经理术语表.md`
- Test: `test/glossary.test.js`

**Interfaces:**
- Consumes: `parseGlossaryMarkdown(markdown)`
- Produces: 可被上传术语表解析的 `{ term, aliases }[]`。

- [ ] **Step 1: 写失败测试，断言每个分层存在代表性词条**

```js
const expectedTerms = [
  "Function Calling", "Memory", "MoE", "Multimodal",
  "Good Case", "Canary Release", "Shadow Mode", "Human Approval",
  "Cursor", "Claude Code", "Kimi", "Hailuo",
  "AI Overviews", "Visibility Score", "CDP", "动态购买意图识别",
];
for (const term of expectedTerms) assert.ok(entries.some((entry) => entry.term === term), `缺少术语：${term}`);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test test/glossary.test.js`

Expected: 新增词条缺失的断言失败。

- [ ] **Step 3: 用一致的标题、别名和结构补齐词条**

为可解释概念使用完整七段结构；为工具/模型保留标准名与常见口语/ASR 别名，避免写入未经证实的技术规格。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test test/glossary.test.js`

Expected: PASS。

### Task 2: 补齐内置词表和语境受限的 ASR 修正

**Files:**
- Modify: `src/glossary.js`
- Test: `test/glossary.test.js`

**Interfaces:**
- Consumes: `normalizeQuestion(question, glossary)`
- Produces: 标准化问题字符串。

- [ ] **Step 1: 写失败测试，分别覆盖低风险和歧义纠错**

```js
assert.equal(normalizeQuestion("什么是 Lope？", []), "什么是 Loop？");
assert.equal(normalizeQuestion("Lope 在 MoE 推理里怎么优化？", []), "Lope 在 MoE 推理里怎么优化？");
assert.equal(normalizeQuestion("function call 怎么设计", []), "Function Calling怎么设计");
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test test/glossary.test.js`

Expected: 新增别名或上下文分支失败。

- [ ] **Step 3: 实现最小分层别名与语境判断**

在 `defaultGlossary` 增加无歧义术语及其别名；新增独立小函数处理需上下文判断的 ASR 拼写，避免把真实品牌、普通词或技术专名覆盖。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test test/glossary.test.js`

Expected: PASS。

### Task 3: 保护术语题生成和界面一致性

**Files:**
- Modify: `app.js`
- Modify: `server.js`
- Test: `test/answer-context-policy.test.js`

**Interfaces:**
- Consumes: `normalizedQuery`、`answerScopePolicy`
- Produces: 显示、保存和生成均使用同一标准词；未知词定义题不虚构专名。

- [ ] **Step 1: 写失败测试**

```js
assert.match(app, /const displayQuery = normalizedQuery \|\| cleanQuery/);
assert.match(server, /不得编造它是某个模型、架构、产品或缩写/);
assert.match(server, /不得虚构英文全称/);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test test/answer-context-policy.test.js`

Expected: 新规则或界面使用点缺失。

- [ ] **Step 3: 实现最小安全策略**

把归一化后的问题赋给 `displayQuery` 并传入 `beginQuestion`；在 `answerScopePolicy` 中明确普通英语词按常用含义解释，未命中定义题不得虚构特殊专名。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test test/answer-context-policy.test.js`

Expected: PASS。

### Task 4: 同步 APP 并做端到端验证

**Files:**
- Modify: `AI产品经理术语表.md`（仅在 Task 1 有实际变更时）
- Test: 全量测试套件

**Interfaces:**
- Consumes: `/api/glossary`、`/api/generate`
- Produces: 当前 Electron 本机资料目录中的最新术语表。

- [ ] **Step 1: 重新启动桌面端以加载代码变更**

Run: `npm run desktop`

Expected: Electron 启动并监听一个本机随机端口。

- [ ] **Step 2: 上传术语表**

```js
const markdown = fs.readFileSync("AI产品经理术语表.md", "utf8");
await fetch(`http://127.0.0.1:${port}/api/glossary`, {
  method: "PUT",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ name: "AI产品经理术语表.md", markdown }),
});
```

Expected: `200` 与同名词表。

- [ ] **Step 3: 验证真实生成不虚构 Lope**

Run: POST `/api/generate` with `query: "什么是 Loop？"`, empty context, `answerScope: "general"`。

Expected: 回答含“循环”或“闭环”，不含 `Low-overhead`、`Parallel Expert` 或 `Lope 是`。

- [ ] **Step 4: 跑完整回归和差异检查**

Run: `npm test && git diff --check`

Expected: 全部 PASS，差异检查无输出。
