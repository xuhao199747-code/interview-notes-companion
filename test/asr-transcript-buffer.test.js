import test from "node:test";
import assert from "node:assert/strict";
import { mergeAsrTranscript } from "../src/asr-transcript-buffer.js";

test("累计式识别结果会保留完整问题，而不是只留下最后几个字", () => {
  const first = mergeAsrTranscript("", "多模态模型和传统模型");
  const full = mergeAsrTranscript(first, "多模态模型和传统模型区别是什么");
  assert.equal(full, "多模态模型和传统模型区别是什么");
});

test("分段识别结果会拼接后续片段，并避免重复", () => {
  const first = mergeAsrTranscript("多模态模型和传统模型", "区别是什么");
  assert.equal(first, "多模态模型和传统模型区别是什么");
  assert.equal(mergeAsrTranscript(first, "多模态模型和传统模型区别是什么"), first);
});

test("累计式结果回改前半句时必须覆盖旧文本，不能把同一句追加两遍", () => {
  const previous = "Who?Man?";
  const revisedFullTranscript = "Who? Man in the loop?";
  assert.equal(
    mergeAsrTranscript(previous, revisedFullTranscript, { isCumulative: true }),
    revisedFullTranscript
  );
});

test("服务端只回传当前尾段时，不能因累计标记丢掉已识别的技术名词", () => {
  assert.equal(
    mergeAsrTranscript("策略 Agent 跟归因引擎", "策略有什么区别？", { isCumulative: true }),
    "策略 Agent 跟归因引擎有什么区别？"
  );
});

test("同一句仅标点不同的回写不重复拼接", () => {
  assert.equal(
    mergeAsrTranscript("Who? Man in the loop", "Who Man in the loop?"),
    "Who Man in the loop?"
  );
});

test("长问题分多段到达时，保留前半句并连续合并后半句", () => {
  const first = mergeAsrTranscript("", "你了解策略 Agent 跟归因引擎");
  const second = mergeAsrTranscript(first, "归因引擎有什么区别");
  const full = mergeAsrTranscript(second, "有什么区别，它们分别解决什么问题？");
  assert.equal(full, "你了解策略 Agent 跟归因引擎有什么区别，它们分别解决什么问题？");
});

test("同一完整问题被服务端重复回传两三次时只保留一遍", () => {
  const question = "策略 Agent 跟归因引擎有什么区别？";
  const first = mergeAsrTranscript("", question, { isCumulative: true });
  const second = mergeAsrTranscript(first, question, { isCumulative: true });
  assert.equal(mergeAsrTranscript(second, question, { isCumulative: true }), question);
});

test("单个结果里完整句子重复两遍时会折叠成一遍", () => {
  assert.equal(
    mergeAsrTranscript("", "策略 Agent 跟归因引擎有什么区别？策略 Agent 跟归因引擎有什么区别？"),
    "策略 Agent 跟归因引擎有什么区别？"
  );
});

test("连续问号会被压缩，避免界面出现重复标点", () => {
  assert.equal(mergeAsrTranscript("怎么做 RAG", "怎么做 RAG？？？"), "怎么做 RAG？");
});
