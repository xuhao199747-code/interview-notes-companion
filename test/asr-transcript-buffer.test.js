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
