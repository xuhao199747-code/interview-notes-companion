import assert from "node:assert/strict";
import test from "node:test";
import { applyAsrEvent, createAsrTurnState } from "../src/asr-turn-state.js";

test("运行状态不会成为待提交的问题", () => {
  const state = createAsrTurnState();
  const next = applyAsrEvent(state, { type: "status", message: "全程监听中：已收到 175 个音频包" });
  assert.equal(next.submitText, "");
  assert.equal(next.rawText, "");
});

test("较短的 ASR 中间修订不会覆盖更长的问题", () => {
  let state = createAsrTurnState();
  state = applyAsrEvent(state, { type: "partial", text: "如果让我从零到一做一个项目" });
  state = applyAsrEvent(state, { type: "partial", text: "如果" });
  assert.equal(state.rawText, "如果让我从零到一做一个项目");
});

test("最终 ASR 结果只提交一次完整问题", () => {
  let state = createAsrTurnState();
  state = applyAsrEvent(state, { type: "partial", text: "请做一下自我介绍" });
  state = applyAsrEvent(state, { type: "final", text: "请做一下自我介绍" });
  assert.equal(state.submitText, "请做一下自我介绍");
  state = applyAsrEvent(state, { type: "final", text: "请做一下自我介绍" });
  assert.equal(state.submitText, "");
});

test("异常变短的最终结果不能覆盖已识别的完整问题", () => {
  let state = createAsrTurnState();
  state = applyAsrEvent(state, { type: "partial", text: "请做一下自我介绍" });
  state = applyAsrEvent(state, { type: "final", text: "一下" });

  assert.equal(state.rawText, "请做一下自我介绍");
  assert.equal(state.submitText, "请做一下自我介绍");
});
