# UI 组件规范落地 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 UI 组件规范收敛桌面端界面，统一深灰紫色主题、卡片、Tab、按钮、双列回答区与空状态，同时不修改语音、检索、生成和本地数据逻辑。

**Architecture:** `styles.css` 成为唯一的视觉 Token 和通用组件来源；`config.css` 只承载问题页、设置页和浮层布局；`modal.css` 只承载编辑弹窗。HTML 只移除重复装饰标签并补齐可复用 class，不改 DOM id、事件绑定或业务数据属性。

**Tech Stack:** 原生 HTML、CSS、JavaScript、Node.js `node:test`。

## Global Constraints

- 不改 `app.js` 中语音识别、检索、LLM、文件上传、下载、删除、本地持久化逻辑。
- 保留现有 DOM id 和事件类名，避免破坏已有事件绑定。
- 新增视觉颜色必须使用紫色 Token，不新增绿色主交互状态或橙色装饰框。
- 页面滚动仅发生在设置内容区、左侧文档结果区、右侧 LLM 结果区和必要弹窗正文。
- 现有未提交的悬浮窗拖拽相关改动不纳入此 UI 任务的业务逻辑修改范围。

---

### Task 1: 建立唯一 Token 与基础组件层

**Files:**
- Modify: `styles.css`
- Modify: `config.css`
- Test: `test/ui-component-guidelines.test.js`

**Interfaces:**
- Consumes: `index.html` 既有 `.primary-button`、`.secondary-button`、`.settings-tab`、`.knowledge-card`、`.answer-source` class。
- Produces: 统一的 `--ui-*`、`--space-*`、`--radius-*` Token，供页面布局 CSS 使用。

- [ ] **Step 1: 写失败测试**

```js
test("UI 基础 Token 只由 styles.css 定义", () => {
  assert.match(styles, /--space-1:6px/);
  assert.match(styles, /--radius-panel:12px/);
  assert.doesNotMatch(config, /:root\s*\{[^}]*--ui-surface/s);
});
```

- [ ] **Step 2: 运行失败测试**

Run: `node --test test/ui-component-guidelines.test.js`

Expected: FAIL，因为当前 `config.css` 重复声明 `--ui-*` Token，且没有完整的 spacing/radius Token。

- [ ] **Step 3: 最小实现**

```css
/* styles.css */
:root {
  --ui-surface:#252526;
  --ui-surface-raised:#2b2d31;
  --ui-control:#1e1f22;
  --ui-border:#3c3f41;
  --ui-text:#f0f0f0;
  --ui-muted:#a0a0a0;
  --ui-accent:#a78bfa;
  --ui-accent-soft:rgba(167,139,250,.14);
  --space-1:6px;
  --space-2:10px;
  --space-3:16px;
  --space-4:24px;
  --radius-control:6px;
  --radius-card:8px;
  --radius-panel:12px;
}
```

移除 `config.css` 中对同名颜色 Token 的重复声明；保留其布局选择器。

- [ ] **Step 4: 运行测试**

Run: `node --test test/ui-component-guidelines.test.js`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add styles.css config.css test/ui-component-guidelines.test.js
git commit -m "style: establish shared UI component tokens"
```

### Task 2: 统一文件卡片与设置导航

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `config.css`
- Test: `test/ui-component-guidelines.test.js`

**Interfaces:**
- Consumes: 既有 `#knowledgeGrid`、`#skillCardList`、`#rulesCardList`、`#glossaryCardList`，及 app.js 输出的文件卡片 class。
- Produces: 统一的 `.knowledge-card`、`.knowledge-card-actions`、`.settings-tabs` 视觉规则；不改下载/删除事件 class。

- [ ] **Step 1: 写失败测试**

```js
test("文件卡片操作与设置 Tab 使用统一组件规则", () => {
  assert.match(styles, /\.knowledge-card-actions[^}]*gap:var\(--space-2\)/);
  assert.match(styles, /\.settings-tab[^}]*height:40px/);
  assert.match(styles, /\.text-action/);
});
```

- [ ] **Step 2: 运行失败测试**

Run: `node --test test/ui-component-guidelines.test.js`

Expected: FAIL，因为目前文件操作没有统一文字操作类，Tab 高度没有固定规则。

- [ ] **Step 3: 最小实现**

```css
.settings-tab { min-height:40px; padding:0 14px; }
.knowledge-card { border-radius:var(--radius-card); }
.knowledge-card-actions { gap:var(--space-2); }
.text-action { border:0; background:transparent; color:var(--ui-muted); }
.text-action:hover { color:var(--ui-accent); }
.text-action.danger:hover { color:var(--ui-danger); }
```

仅为已存在的下载、删除、编辑按钮增加 `.text-action` 类；不更改 `data-doc`、`download-doc`、`delete-doc` 或事件处理逻辑。

- [ ] **Step 4: 运行测试**

Run: `node --test test/ui-component-guidelines.test.js test/skill-ui.test.js test/settings-panels.test.js`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add index.html styles.css config.css test/ui-component-guidelines.test.js
git commit -m "style: unify settings tabs and file cards"
```

### Task 3: 统一回答双列与空状态

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `config.css`
- Test: `test/ui-component-guidelines.test.js`

**Interfaces:**
- Consumes: `#documentResults`、`#llmResults`、`.answer-source`、`.empty-state`。
- Produces: 两列共享标题与内容层级，独立滚动正文，无重复英文装饰或橙色内框。

- [ ] **Step 1: 写失败测试**

```js
test("回答双列只保留中文标题且正文区域独立滚动", () => {
  assert.doesNotMatch(html, /LLM GENERATED|AI GENERATED/);
  assert.match(config, /#documentResults[^}]*overflow-y:auto/);
  assert.match(config, /#llmResults[^}]*overflow:hidden/);
});
```

- [ ] **Step 2: 运行失败测试**

Run: `node --test test/ui-component-guidelines.test.js`

Expected: FAIL，因为页面与渲染内容仍存在英文装饰标签或不一致层级。

- [ ] **Step 3: 最小实现**

移除 `index.html` 中不再展示的英文装饰节点；将回答列与文档列均限制为“中文标题 + 内容区”；保留 `documentResults` 和 `llmResults` id，并确保仅其内容区域发生滚动。删除 `.ai-result` 的橙色边框和内层卡片视觉，不更改答案文字、生成时机或结果渲染数据。

- [ ] **Step 4: 运行测试**

Run: `node --test test/ui-component-guidelines.test.js test/top-overlay-ui.test.js test/renderer-one-shot-only.test.js`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add index.html styles.css config.css test/ui-component-guidelines.test.js
git commit -m "style: normalize answer columns and empty states"
```

### Task 4: 收敛浮层、设置滚动与弹窗样式

**Files:**
- Modify: `config.css`
- Modify: `modal.css`
- Test: `test/ui-component-guidelines.test.js`
- Test: `test/top-overlay-ui.test.js`
- Test: `test/settings-scroll-ui.test.js`

**Interfaces:**
- Consumes: `#answerOverlay`、`.settings-sticky-header`、`.settings-scroll-content`、`.editor-modal`。
- Produces: 固定的浮层层级与圆角，设置页单一滚动容器，弹窗统一面板风格。

- [ ] **Step 1: 写失败测试**

```js
test("浮层、设置页与弹窗使用统一的圆角和表面色", () => {
  assert.match(config, /#answerOverlay[^}]*--radius-panel/);
  assert.match(config, /\.settings-scroll-content[^}]*overflow-y:auto/);
  assert.match(modal, /border-radius:var\(--radius-panel\)/);
});
```

- [ ] **Step 2: 运行失败测试**

Run: `node --test test/ui-component-guidelines.test.js`

Expected: FAIL，因为浮层和弹窗仍使用分散的硬编码圆角。

- [ ] **Step 3: 最小实现**

替换浮层、设置页、弹窗的硬编码核心圆角/表面色为通用 Token；合并相同选择器的重复视觉声明，保留桌面覆盖层拖拽、防选中、置顶等必要行为规则。

- [ ] **Step 4: 运行测试**

Run: `node --test test/ui-component-guidelines.test.js test/top-overlay-ui.test.js test/settings-scroll-ui.test.js`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add config.css modal.css test/ui-component-guidelines.test.js test/top-overlay-ui.test.js test/settings-scroll-ui.test.js
git commit -m "style: consolidate overlay and modal surfaces"
```

### Task 5: 完整回归与视觉核对

**Files:**
- Modify: `docs/superpowers/specs/2026-08-12-ui-component-guidelines-design.md`

**Interfaces:**
- Consumes: 前四项 UI 变更与现有测试集。
- Produces: 已勾选的规范验收清单和可复核的测试记录。

- [ ] **Step 1: 运行完整测试**

Run: `npm test`

Expected: exit code 0，所有既有测试及新增 UI 规范测试通过。

- [ ] **Step 2: 运行静态检查**

Run: `git diff --check && rg -n "LLM GENERATED|AI GENERATED|#907545|--ui-surface" index.html styles.css config.css modal.css`

Expected: 无空白错误；不再有需移除的英文装饰或橙色内框色；颜色 Token 只由 `styles.css` 定义。

- [ ] **Step 3: 更新验收清单**

将设计文档中的 UI 验收项逐项标记为完成，并记录保留的业务约束。

- [ ] **Step 4: 提交**

```bash
git add docs/superpowers/specs/2026-08-12-ui-component-guidelines-design.md
git commit -m "docs: record UI component guideline verification"
```
