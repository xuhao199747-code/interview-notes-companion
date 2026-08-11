# AI 产品经理 Skill 与术语表收尾 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让项目口述回答与 AI 通用术语在资料、规则、检索别名和应用默认行为中保持一致且可验证。

**Architecture:** 保留两份职责独立的 Markdown Skill。口述回答 Skill 只负责项目事实、完整首答与追问下钻；术语表维护 Skill 只负责通用概念与别名。术语表是检索数据源，`src/glossary.js` 提供未上传术语表时仍可用的默认别名与 ASR 纠错，回答规则保证通用题不被写成个人经历。

**Tech Stack:** Markdown、ES modules、Node.js 内置测试框架。

## Global Constraints

- 项目事实仅来自三份已列明飞书资料或其本地整理稿。
- 通用资料使用“可以 / 建议 / 我会”，不得伪造成候选人经历。
- 保留 `## 术语` 与 `别名：` 格式，兼容 `parseGlossaryMarkdown()`。
- 不修改无关的语音、快捷键、桌面端功能。

---

### Task 1: 固化两份 Skill 的职责与来源

**Files:**
- Modify: `assets/AI产品经理面试完整口述回答Skill.md`
- Modify: `assets/AI产品术语表维护Skill.md`
- Test: `test/answer-skill-asset.test.js`
- Test: `test/terminology-skill-asset.test.js`

- [ ] 写入并运行来源、首答、追问、通用表达和术语边界的断言。
- [ ] 保留三份飞书链接及本地整理稿的事实来源规则。
- [ ] 验证两份 Asset 测试通过。

### Task 2: 重写通用术语表并同步默认检索词表

**Files:**
- Modify: `AI产品经理术语表.md`
- Modify: `src/glossary.js`
- Test: `test/glossary.test.js`

- [ ] 先为 Coze、RAG、Agent、Workflow、Skill、Tool、评测和高风险别名写失败断言。
- [ ] 用统一条目结构重写核心术语；每项包含定义、业务问题、链路、适用/局限、口述回答与关系。
- [ ] 更新默认别名与 ASR 纠错；验证 Markdown 解析和归一化。

### Task 3: 对齐应用的通用回答规则

**Files:**
- Modify: `assets/AI产品经理回答规则.md`
- Test: `test/answer-context-policy.test.js`

- [ ] 为通用题的表达、评测和高风险边界写失败断言。
- [ ] 明确通用题使用“可以 / 建议 / 我会”，项目题才使用第一人称项目事实。
- [ ] 验证回答范围策略测试通过。

### Task 4: 回归验证

**Files:**
- Test: `test/answer-skill-asset.test.js`
- Test: `test/terminology-skill-asset.test.js`
- Test: `test/glossary.test.js`
- Test: `test/answer-context-policy.test.js`

- [ ] 运行四组定向测试与 `git diff --check`。
- [ ] 运行全量 `npm test`；若失败，区分本次变更与工作区既有失败。
