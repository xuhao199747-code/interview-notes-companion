# 顶部答题浮层视觉统一 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将顶部答题浮层收敛成一个 Cursor 风格的统一工作面板，避免遮罩、嵌套卡片和不一致的左右列样式。

**Architecture:** 不改 `index.html` 中现有的答题状态和控制入口。只在 `config.css` 的浮层规则中移除全屏遮罩的视觉占位，并以同一组 CSS 变量和选择器控制工具栏、按钮、文档列及 LLM 列。

**Tech Stack:** Electron、HTML、CSS、Node 内置 `node:test`。

## Global Constraints

- 仅修改 UI；不改变语音识别、LLM、检索、历史题、置顶或收起行为。
- 展开后点击答题区域空白仍收起答案主体。
- 工具栏始终位于展开内容顶部；两列正文保持各自滚动。

---

### Task 1: 锁定统一视觉层级

**Files:**
- Modify: `test/top-overlay-ui.test.js`
- Modify: `config.css:172-197`

**Interfaces:**
- Consumes: `#answerOverlay`、`.answer-overlay-backdrop`、`.answer-source`、`.overlay-action`。
- Produces: 单面板浮层样式；两个同级回答列；统一按钮规则。

- [ ] **Step 1: Write the failing test**

```js
test("展开浮层不使用全屏暗色遮罩，左右答案列使用同一视觉容器", async () => {
  const css = await fs.readFile(new URL("../config.css", import.meta.url), "utf8");
  assert.match(css, /\.answer-overlay-backdrop\s*\{[^}]*background:\s*transparent/s);
  assert.match(css, /#answerOverlay\.expanded\s+\.answer-source\s*\{[^}]*background:rgba\(21,30,48,.72\)[^}]*backdrop-filter:blur\(16px\)/s);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/top-overlay-ui.test.js`

Expected: FAIL because the backdrop is still dark and answer source uses its old background token.

- [ ] **Step 3: Write minimal implementation**

```css
.answer-overlay-backdrop { background:transparent; pointer-events:auto; }
#answerOverlay.expanded .answer-source { background:rgba(21,30,48,.72); backdrop-filter:blur(16px); }
```

Then normalize toolbar, controls, sources and internal result containers with the same border, radius, spacing and neutral colour rules.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/top-overlay-ui.test.js`

Expected: PASS.

- [ ] **Step 5: Run focused regression suite**

Run: `node --test test/top-overlay-ui.test.js test/live-panel-ui.test.js test/question-answer-ui.test.js`

Expected: all tests PASS.
