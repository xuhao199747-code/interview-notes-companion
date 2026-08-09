import test from "node:test";
import assert from "node:assert/strict";
import { resolveProjectContext, shouldScopeToProject } from "../src/project-context.js";

const projects = [
  { id: "marketing", name: "营销项目", aliases: ["增长项目", "营销自动化"] },
  { id: "ceo", name: "CEO 项目", aliases: ["CEO 助手", "管理层项目"] },
];

test("问题明确提到项目名称时优先切换项目", () => {
  assert.deepEqual(resolveProjectContext({ question: "营销项目里 RAG 怎么做的", projects, activeProjectId: "ceo" }), { projectId: "marketing", source: "explicit", confidence: 1 });
});

test("模糊追问沿用最近确认的项目", () => {
  assert.deepEqual(resolveProjectContext({ question: "RAG 怎么做的", projects, activeProjectId: "marketing" }), { projectId: "marketing", source: "context", confidence: 0.7 });
});

test("手动锁定优先于最近上下文", () => {
  assert.deepEqual(resolveProjectContext({ question: "RAG 怎么做的", projects, activeProjectId: "marketing", lockedProjectId: "ceo" }), { projectId: "ceo", source: "locked", confidence: 1 });
});

test("普通新问题不能被上一项目限制检索范围", () => {
  assert.equal(shouldScopeToProject({ projectId: "marketing", source: "context" }, "你具体做过什么项目"), false);
});

test("短追问才沿用上一项目检索范围", () => {
  assert.equal(shouldScopeToProject({ projectId: "marketing", source: "context" }, "具体怎么做"), true);
});

test("指标和计算口径追问沿用最近确认的项目", () => {
  assert.equal(shouldScopeToProject({ projectId: "marketing", source: "context" }, "你们有什么指标，指标是怎么算的"), true);
});
