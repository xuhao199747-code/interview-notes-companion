# 快捷键问题确认 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为连续会议转写提供可配置的快捷键确认提交模式，同时保留可开关的自动声纹过滤与原自动链路。

**Architecture:** 配置层保存 `questionCommitMode`、`questionHotkey`、`voiceprintEnabled`。Electron 在监听期间注册 `Alt+Space` 全局快捷键并向渲染层发送提交事件；渲染层在手动模式只缓存最新转写，收到快捷键才提取最后问句、检索和生成。

**Tech Stack:** Electron IPC/globalShortcut、原有 Node 配置存储、浏览器渲染层与 node:test。

## Global Constraints

- 默认模式为 `auto`，保留旧行为。
- 默认快捷键为 `Alt+Space`；快捷键模式下不依据声纹自动提交。
- 声纹过滤独立开关；关闭后不得调用声纹判定链路。
- 用户资料、Skill 和 API 配置不可删除或覆盖。

---

### Task 1: 保存与展示监听策略

**Files:** `src/config-store.js`、`server.js`、`index.html`、`app.js`、`test/config-store.test.js`

- [ ] 新增默认配置：`questionCommitMode: "auto"`、`questionHotkey: "Alt+Space"`、`voiceprintEnabled: true`。
- [ ] 通过 `/api/config` 保存并通过配置读取接口返回这三个字段。
- [ ] 设置页提供“自动提交 / 快捷键确认”选择与声纹过滤开关。

### Task 2: 绑定桌面全局快捷键

**Files:** `electron/main.js`、`electron/preload.cjs`、`app.js`、`test/electron-preload.test.js`

- [ ] 桌面 ASR 启动时，若为快捷键模式，注册 `Alt+Space`；停止时注销。
- [ ] 快捷键事件经 preload 转给渲染层；注册失败回传可读错误。
- [ ] 渲染层快捷键事件只提交最后一个稳定问句并清空当前待确认缓冲。

### Task 3: 保留自动模式和声纹开关

**Files:** `app.js`、`electron/main.js`、`test/*`

- [ ] `auto` 模式保持现有静默提交与可选声纹过滤。
- [ ] `hotkey` 模式不自动检索；声纹仅保留配置，不阻断手动提交。
- [ ] 添加模式切换、声纹关闭、快捷键提交与去重回归测试。
