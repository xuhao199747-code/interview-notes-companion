import test from "node:test";
import assert from "node:assert/strict";
import {
  acceptLlmAnswer,
  beginQuestion,
  buildFollowUpContext,
  createAnswerState,
  isConfirmedQuestion,
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

test("内部最多只保留紧邻的一条历史题", () => {
  const state = createAnswerState();
  beginQuestion(state, "第一题", "答案一");
  beginQuestion(state, "第二题", "答案二");
  beginQuestion(state, "第三题", "答案三");
  assert.equal(state.current.question, "第三题");
  assert.equal(state.previous.question, "第二题");
  assert.equal(Object.hasOwn(state, "history"), false);
});

test("回答请求会把上一题上下文发送给 LLM", async () => {
  const { readFile } = await import("node:fs/promises");
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /previousContext: current\.context \|\| ""/);
});

test("新题页面提供可展开的上一题入口", async () => {
  const { readFile } = await import("node:fs/promises");
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /function renderPreviousAnswer\(previous\)/);
  assert.match(app, /previous-answer-toggle/);
});
