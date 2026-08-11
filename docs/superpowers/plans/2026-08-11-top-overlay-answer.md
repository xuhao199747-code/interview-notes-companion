# 顶部半透明答题浮层 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将答题界面改为顶部半透明浮层，并保持实时转写、即时答案、历史回看和中断切题。

**Architecture:** 使用现有 `answerState.current` 与 `answerState.previous` 保存题目数据；在 `app.js` 新增仅管理浮层显示状态的渲染函数。`index.html` 提供浮层控制、主体和历史入口；`config.css` 定义遮罩、折叠及窄屏布局。

**Tech Stack:** 原生 HTML、CSS、JavaScript、Node test。

## Global Constraints

- 仅改 UI 与既有 UI 状态，不改检索、语音、LLM 服务逻辑。
- 两列标题只显示中文。
- 最近一题仍复用 `answerState.previous`。
- 每项 UI 行为先写失败测试再实现。

---

### Task 1: 浮层结构与折叠状态

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Test: `test/top-overlay-ui.test.js`

- [ ] **Step 1: 写失败测试**

验证页面含 `answerOverlay`、`answerOverlayBackdrop`、`answerOverlayToggle` 和 `previousAnswerButton`，并验证 `renderAnswerOverlay` 切换 `expanded` 类。

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test test/top-overlay-ui.test.js`

- [ ] **Step 3: 最小实现**

将控制条、回答区和历史入口纳入 `answerOverlay`；在 `state` 保存 `answerOverlayExpanded` 与 `answerOverlayView`，并让外部点击和按钮切换折叠。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test test/top-overlay-ui.test.js`

### Task 2: 当前题与上一题切换

**Files:**
- Modify: `app.js`
- Test: `test/top-overlay-ui.test.js`

- [ ] **Step 1: 写失败测试**

验证点击历史入口使用 `answerState.previous` 替换浮层主体；开始新识别时关闭历史视图；确认新题时历史入口仍指向原当前题。

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test test/top-overlay-ui.test.js`

- [ ] **Step 3: 最小实现**

新增 `showPreviousAnswer` 与 `showCurrentAnswer`；复用既有 `beginQuestion` 的题目替换时机，避免中途转写覆盖历史。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test test/top-overlay-ui.test.js`

### Task 3: 半透明视觉与卡片内滚动

**Files:**
- Modify: `config.css`
- Test: `test/top-overlay-ui.test.js`

- [ ] **Step 1: 写失败测试**

验证浮层固定在顶部中间、具有半透明背景及 backdrop，回答主体展开时可见遮罩，LLM 卡片维持内部滚动。

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test test/top-overlay-ui.test.js`

- [ ] **Step 3: 最小实现**

为 `answerOverlay` 设置 `position:fixed` 和顶部居中；为背景与主体添加独立层级；窄屏下改为安全的单列浮层。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test test/top-overlay-ui.test.js test/live-panel-ui.test.js`
