import test from "node:test";
import assert from "node:assert/strict";
import { resolveProjectContext, shouldScopeToProject } from "../src/project-context.js";
import { classifyAnswerScope } from "../src/answer-context-policy.js";
import { classifyTranscript } from "../src/turn-detector.js";
import { readFile } from "node:fs/promises";

const projects = [
  { id: "marketing", name: "营销项目", aliases: ["增长项目", "营销自动化"] },
  { id: "ceo", name: "CEO 项目", aliases: ["CEO 助手", "管理层项目"] },
];

test("问题明确提到项目名称时优先切换项目", () => {
  assert.deepEqual(resolveProjectContext({ question: "营销项目里 RAG 怎么做的", projects, activeProjectId: "ceo" }), { projectId: "marketing", source: "explicit", confidence: 1 });
});

test("营销智能回答和 Attrip 作为旅游智能营销项目别名锁定项目范围", () => {
  const tourism = { id: "tourism", name: "旅游智能营销", aliases: ["营销智能回答", "Attrip", "at trip", "旅游智能营消", "旅游获客", "旅游获客项目"] };
  assert.equal(resolveProjectContext({ question: "那我给您讲一下营销智能回答，也就是 Attrip", projects: [tourism] }).projectId, "tourism");
  assert.equal(resolveProjectContext({ question: "那我给您讲一下营销智能回答，也就是 Attrip", projects: [tourism] }).source, "explicit");
  assert.equal(resolveProjectContext({ question: "旅游智能营消项目里 RAG 怎么做", projects: [tourism] }).projectId, "tourism");
  assert.deepEqual(resolveProjectContext({ question: "如果给你一个旅游获客场景，从 0 到 1 怎么做", projects: [tourism] }), { projectId: "tourism", source: "explicit", confidence: 1 });
});

test("页面将营销智能回答和 Attrip 传给项目范围解析", async () => {
  const aliases = await readFile(new URL("../src/project-aliases.js", import.meta.url), "utf8");
  assert.match(aliases, /旅游智能营销/);
  assert.match(aliases, /营销智能回答/);
  assert.match(aliases, /Attrip/);
});

test("模糊追问沿用最近确认的项目", () => {
  assert.deepEqual(resolveProjectContext({ question: "RAG 怎么做的", projects, activeProjectId: "marketing" }), { projectId: "marketing", source: "context", confidence: 0.7 });
});

test("显式提到新项目后，后续未点名追问应跟随新项目而不是旧项目", () => {
  const first = resolveProjectContext({ question: "营销项目里 RAG 怎么做", projects, activeProjectId: "ceo" });
  const followUp = resolveProjectContext({ question: "它的指标怎么计算", projects, activeProjectId: first.projectId });
  const switched = resolveProjectContext({ question: "CEO 项目的挑战是什么", projects, activeProjectId: followUp.projectId });
  const afterSwitch = resolveProjectContext({ question: "这个项目怎么解决", projects, activeProjectId: switched.projectId });

  assert.equal(followUp.projectId, "marketing");
  assert.equal(switched.projectId, "ceo");
  assert.equal(afterSwitch.projectId, "ceo");
});

test("点名未收录的 CEO 项目时不能错误沿用上一题的 GEO 项目", () => {
  const resolved = resolveProjectContext({
    question: "CEO 项目里最大的困难是什么？",
    projects: [{ id: "geo", name: "GEO 品牌增长平台", aliases: ["GEO"] }],
    activeProjectId: "geo",
  });
  assert.deepEqual(resolved, { projectId: "", source: "unknown", confidence: 0 });
});

test("手动锁定优先于最近上下文", () => {
  assert.deepEqual(resolveProjectContext({ question: "RAG 怎么做的", projects, activeProjectId: "marketing", lockedProjectId: "ceo" }), { projectId: "ceo", source: "locked", confidence: 1 });
});

test("问题同时出现栏目词和项目名时，优先选择更具体的项目名", () => {
  const resolved = resolveProjectContext({
    question: "GEO项目的指标怎么计算",
    projects: [
      { id: "metric", name: "指标" },
      { id: "geo", name: "GEO" },
    ],
  });
  assert.equal(resolved.projectId, "geo");
  assert.equal(resolved.source, "explicit");
});

test("普通新问题不能被上一项目限制检索范围", () => {
  assert.equal(shouldScopeToProject({ projectId: "marketing", source: "context" }, "你具体做过什么项目"), false);
});

test("带上一题上下文的自我介绍也不能被项目范围裁剪", () => {
  assert.equal(shouldScopeToProject({ projectId: "marketing", source: "context" }, "刚才提到项目了，先做一下自我介绍"), false);
});

test("短追问才沿用上一项目检索范围", () => {
  assert.equal(shouldScopeToProject({ projectId: "marketing", source: "context" }, "具体怎么做"), true);
});

test("指标和计算口径追问沿用最近确认的项目", () => {
  assert.equal(shouldScopeToProject({ projectId: "marketing", source: "context" }, "你们有什么指标，指标是怎么算的"), true);
});

test("承接上一题的“这个项目”能力问法继续限定在当前项目", () => {
  const question = "他这个项目用到的 AI 能力有什么？";
  const resolved = resolveProjectContext({
    question,
    projects: [{ id: "tourism", name: "旅游智能营销", aliases: ["旅游获客"] }],
    activeProjectId: "tourism",
  });

  assert.deepEqual(resolved, { projectId: "tourism", source: "context", confidence: 0.7 });
  assert.equal(shouldScopeToProject(resolved, question), true);
  assert.equal(classifyAnswerScope(question, { isFollowUp: classifyTranscript(question).followUp, projectSource: resolved.source }), "followup");
});

test("承接上一题的准确率计算追问继续使用当前 GEO 项目资料", () => {
  const question = "你刚刚说的这个准确率从71.1%提升到85%以上，那这个是怎么计算出来的？";
  const resolved = resolveProjectContext({
    question,
    projects: [{ id: "geo", name: "GEO" }],
    activeProjectId: "geo",
  });
  const turn = classifyTranscript(question);

  assert.equal(turn.followUp, true);
  assert.equal(shouldScopeToProject(resolved, question), true);
  assert.equal(classifyAnswerScope(question, { isFollowUp: turn.followUp, projectSource: resolved.source }), "followup");
});
