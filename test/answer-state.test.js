import test from "node:test";
import assert from "node:assert/strict";
import {
  acceptLlmAnswer,
  beginQuestion,
  buildFollowUpContext,
  createAnswerState,
  isConfirmedQuestion,
  setQuestionContext,
  setQuestionDocument,
} from "../src/answer-state.js";

test("短语音片段不会被当作可替换的问题", () => {
  assert.equal(isConfirmedQuestion("嗯"), false);
  assert.equal(isConfirmedQuestion("你做过什么项目"), true);
});

test("三个字的短追问也要创建新题", () => {
  assert.equal(isConfirmedQuestion("为什么"), true);
  assert.equal(isConfirmedQuestion("展开讲讲"), true);
});

test("完整新问题会归档当前题并保留两类答案", () => {
  const state = createAnswerState();
  beginQuestion(state, "你做过什么项目", "文档答案");
  acceptLlmAnswer(state, state.current.requestId, "LLM 答案");

  beginQuestion(state, "你如何处理困难", "下一题文档答案");

  assert.deepEqual(state.previous, {
    question: "你做过什么项目",
    documentHtml: "文档答案",
    llmHtml: "LLM 答案",
    llmStatus: "ready",
    requestId: 1,
  });
});

test("过时 LLM 结果不会覆盖当前问题", () => {
  const state = createAnswerState();
  const first = beginQuestion(state, "你做过什么项目", "文档一");
  const second = beginQuestion(state, "你如何处理困难", "文档二");

  assert.equal(acceptLlmAnswer(state, first.requestId, "过时答案"), false);
  assert.equal(acceptLlmAnswer(state, second.requestId, "当前答案"), true);
  assert.equal(state.current.llmHtml, "当前答案");
});

test("新题应先替换旧答案，再异步填入该题的检索资料", () => {
  const state = createAnswerState();
  beginQuestion(state, "上一题", "上一题资料");
  acceptLlmAnswer(state, state.current.requestId, "上一题 LLM 答案");

  const current = beginQuestion(state, "自我介绍一下", "");

  assert.equal(state.current.question, "自我介绍一下");
  assert.equal(state.current.documentHtml, "");
  assert.equal(state.current.llmHtml, "");
  assert.equal(setQuestionDocument(state, current.requestId, "自我介绍资料"), true);
  assert.equal(setQuestionDocument(state, current.requestId - 1, "旧题晚到资料"), false);
  assert.equal(state.current.documentHtml, "自我介绍资料");
});

test("短追问会携带上一题的上下文，并创建新的请求", () => {
  const state = createAnswerState();
  const first = beginQuestion(state, "项目有几个 Agent", "项目共有 3 个 Agent");
  acceptLlmAnswer(state, first.requestId, "三个 Agent 分工协作");
  const followUp = buildFollowUpContext(state.current);
  const second = beginQuestion(state, "具体怎么做", "执行 Agent 负责落地", followUp);

  assert.match(second.context, /项目有几个 Agent/);
  assert.equal(second.requestId, 2);
  assert.equal(acceptLlmAnswer(state, first.requestId, "旧题晚到答案"), false);
});

test("项目追问保留最近多题的原始资料上下文", () => {
  const state = createAnswerState();
  const first = beginQuestion(state, "请介绍 GEO 项目", "");
  setQuestionContext(state, first.requestId, "【GEO 项目介绍】\n这是 GEO 品牌增长平台。");
  const second = beginQuestion(state, "这个项目解决什么问题", "");
  setQuestionContext(state, second.requestId, "【GEO 项目背景】\n帮助品牌衡量并提升 AI 可见度。");

  const context = buildFollowUpContext([...state.history, state.current]);

  assert.match(context, /请介绍 GEO 项目/);
  assert.match(context, /GEO 品牌增长平台/);
  assert.match(context, /帮助品牌衡量并提升 AI 可见度/);
});

test("回答请求会把上一题上下文发送给 LLM", async () => {
  const { readFile } = await import("node:fs/promises");
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /previousContext: current\.context \|\| ""/);
});

test("新题页面提供可打开的上一题入口", async () => {
  const { readFile } = await import("node:fs/promises");
  const [app, html] = await Promise.all([
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
  ]);
  assert.match(app, /function renderPreviousAnswer\(previous\)/);
  assert.match(html, /id="previousAnswerButton"/);
  assert.match(app, /function showPreviousAnswer\(\)/);
  assert.match(app, /previous-answer-close/);
});
