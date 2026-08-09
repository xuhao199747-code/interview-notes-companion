# Formal and Local Editions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Maintain a GitHub-backed formal edition and a separate local working edition with isolated application data.

**Architecture:** The current checkout becomes the formal `main` branch and updates from GitHub before launch. A linked `local` worktree is used for experiments and never pulls automatically. Electron derives its user-data directory from `INTERVIEW_EDITION` so credentials, files, and settings never mix.

**Tech Stack:** Git, GitHub CLI, Electron, zsh, Node.js test runner.

## Global Constraints

- Create a private GitHub repository.
- Formal edition uses `INTERVIEW_EDITION=release`; local edition uses `INTERVIEW_EDITION=local`.
- Formal updates use `git pull --ff-only origin main`; local launcher must not run Git commands.
- Never print API keys or stored configuration values.

---

### Task 1: Isolate Electron data by edition

**Files:**
- Create: `src/edition.js`, `test/edition.test.js`
- Modify: `electron/main.js`

- [ ] Write a test proving `release` and `local` resolve to different data-directory suffixes.
- [ ] Run the test and confirm it fails because the helper is missing.
- [ ] Add `getEditionStorageName(edition)` and call `app.setPath("userData", path.join(app.getPath("appData"), getEditionStorageName(process.env.INTERVIEW_EDITION)))` before `app.whenReady()`.
- [ ] Run the focused test.

### Task 2: Create edition launchers

**Files:**
- Modify: `启动面试资料伴侣.command`
- Create: `启动本地版.command` in the local worktree

- [ ] Formal launcher changes to the project directory, fast-forwards from `origin/main`, and runs the desktop app with `INTERVIEW_EDITION=release`.
- [ ] Local launcher changes to its own directory and runs the desktop app with `INTERVIEW_EDITION=local`, without Git updates.
- [ ] Check zsh syntax and executable permissions.

### Task 3: Establish and publish the formal baseline

**Files:**
- Stage all current application source, tests, and version-control files except local settings and `node_modules`.

- [ ] Commit the current app and edition support to `main`.
- [ ] Create private GitHub repository `xuhao199747-code/interview-notes-companion`, set `origin`, and push `main`.
- [ ] Create a `local` linked worktree at `/Users/mac/Documents/面试资料伴侣-本地版`.
- [ ] Add the local-only launcher and verify both launchers.
