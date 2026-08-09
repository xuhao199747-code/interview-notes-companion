import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { classifyAnswerScope, selectAnswerMaterials, shouldUsePersonalContext } from "../src/answer-context-policy.js";

const sections = [
  { title: "自我介绍", content: "我做过 AlphaRank GEO。", project: "" },
  { title: "GEO 项目挑战", content: "项目中的问题集管理。", project: "AlphaRank GEO" },
  { title: "AIGC 产品方法", content: "先明确用户问题与成功指标。", project: "" },
];

test("通用方法论检索全部技术资料，但不把个人档案送给模型", () => {
  const scope = classifyAnswerScope("如果让你从零开始做一个 AIGC 产品，你会怎么开始？", { answerMode: "auto" });
  const materials = selectAnswerMaterials({ scope, sections });
  assert.equal(scope, "general");
  assert.deepEqual(materials.map((item) => item.title), ["GEO 项目挑战", "AIGC 产品方法"]);
});

test("通用问题保留项目技术资料作为事实参考，但排除自我介绍", () => {
  const librarySections = [
    { title: "什么是 RAG", content: "检索增强生成先召回再生成。", project: "其他问题" },
    { title: "项目 RAG 复盘", content: "GEO 项目采用混合检索。", project: "GEO" },
    { title: "自我介绍", content: "我做过 GEO。", project: "自我介绍" },
  ];
  const materials = selectAnswerMaterials({ scope: "general", sections: librarySections });
  assert.deepEqual(materials.map((item) => item.title), ["什么是 RAG", "项目 RAG 复盘"]);
});

test("明确询问候选人经历时才允许使用个人经历", () => {
  const scope = classifyAnswerScope("介绍一下你做过的项目", { answerMode: "auto" });
  const materials = selectAnswerMaterials({ scope, sections });
  assert.equal(scope, "experience");
  assert.equal(materials.some((item) => item.title === "自我介绍"), true);
});

test("自我介绍一下必须识别为候选人经历题", () => {
  const scope = classifyAnswerScope("自我介绍一下", { answerMode: "auto" });
  const materials = selectAnswerMaterials({ scope, sections });
  assert.equal(scope, "experience");
  assert.equal(materials.some((item) => item.title === "自我介绍"), true);
});

test("“你会怎么做 RAG 系统”是通用问题，不因提问语气中的“你”带入经历", () => {
  assert.equal(classifyAnswerScope("你会怎么做 RAG 系统"), "general");
  assert.equal(shouldUsePersonalContext(classifyAnswerScope("你会怎么做 RAG 系统")), false);
});

test("经历问题自动保留相关项目资料，但不把回答 Skill 当知识库检索", () => {
  const experienceSections = [
    { title: "自我介绍", content: "我做过 GEO。", project: "自我介绍", sourceType: "knowledge" },
    { title: "RAG 方案", content: "在 GEO 项目中负责 RAG 召回和评测。", project: "GEO", sourceType: "knowledge" },
    { title: "回答原则", content: "这是回答 Skill，不是候选人事实。", project: "回答 Skill", sourceType: "skill" },
  ];
  const scope = classifyAnswerScope("你的项目里 RAG 怎么做的");
  const materials = selectAnswerMaterials({ scope, sections: experienceSections });
  assert.deepEqual(materials.map((item) => item.title), ["自我介绍", "RAG 方案"]);
});

test("旧的手动回答方式不会覆盖自动判断", () => {
  assert.equal(classifyAnswerScope("自我介绍一下", { answerMode: "general" }), "experience");
  assert.equal(classifyAnswerScope("如果从零做一个 AIGC 项目怎么开始", { answerMode: "experience" }), "general");
});

test("页面按回答范围选择资料，并只在允许时发送个人背景", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(app, /classifyAnswerScope\(normalizedQuery/);
  assert.match(app, /selectAnswerMaterials\(\{ scope, sections: scoped\.sections \}\)/);
  assert.match(app, /shouldUsePersonalContext\(scope\) \? selectPersonalContext/);
  assert.match(app, /filter\(\(doc\) => doc\.type !== "skill"\)/);
  assert.doesNotMatch(html, /id="answerModeSelect"/);
  assert.doesNotMatch(app, /interview\.answerMode/);
});

test("服务端回答范围优先于上传 Skill，通用题不得被 Skill 改成个人经历", async () => {
  const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
  assert.match(server, /回答范围优先级最高/);
  assert.match(server, /Skill 只能规定表达结构/);
  assert.match(server, /AI 产品经理/);
});
