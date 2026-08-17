# Desktop Startup and Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the local desktop product open as one macOS app, show feedback immediately during startup, and keep spacing consistent without changing recognition, retrieval, or answer behavior.

**Architecture:** Electron creates a minimal local boot document before importing and starting the HTTP server. The packaged application reuses the existing unified `userData` directory, and the command launcher opens the packaged application instead of a Terminal-hosted development process.

**Tech Stack:** Electron 37, electron-builder, Node.js built-in test runner, CSS custom properties.

## Global Constraints

- Do not alter ASR, retrieval, LLM, question capture, or local-data behavior.
- Packaged and development launches must use `interview-notes-companion-local` as the local-data directory.
- A normal launch must not run `git pull` or leave Terminal running.
- Do not modify unrelated dirty files.

---

### Task 1: Guard desktop startup and package behavior

**Files:**
- Create: `test/desktop-packaging.test.js`
- Modify: `electron/main.js`
- Modify: `package.json`
- Modify: `启动面试资料伴侣.command`

- [ ] Write assertions for the boot document, removed Dock forcing, package command, and app launcher.
- [ ] Run `node --test test/desktop-packaging.test.js` and confirm it fails on the previous setup.
- [ ] Add the minimal Electron boot path, builder configuration, and packaged-app launcher.
- [ ] Run the focused test again and confirm it passes.

### Task 2: Consolidate compact layout tokens

**Files:**
- Modify: `config.css`
- Modify: `test/ui-component-guidelines.test.js`

- [ ] Add a failing assertion for shared desktop spacing tokens.
- [ ] Add one final token block that applies the same outer gutter, panel gap, and settings padding.
- [ ] Run the focused UI test and confirm it passes.

### Task 3: Build verification

**Files:**
- Modify: `.gitignore`

- [ ] Ignore the local `release/` application output.
- [ ] Run `npm test`.
- [ ] Run `npm run package:mac` and verify `release/mac-arm64/面试资料伴侣.app` exists.
