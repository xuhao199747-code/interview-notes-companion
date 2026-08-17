import test from "node:test";
import assert from "node:assert/strict";
import { nextVisibleTranscript } from "../src/asr-display.js";

test("流式初稿立即展示累计的原始识别文字", () => {
  assert.equal(nextVisibleTranscript({ current: "待识别", mergedText: "介绍一下你的", sentenceType: 0 }), "介绍一下你的");
});

test("二次最终结果到达后才显示已合并的完整问题", () => {
  assert.equal(nextVisibleTranscript({ current: "正在识别…", mergedText: "介绍一下你的项目以及 RAG 架构", sentenceType: 1 }), "介绍一下你的项目以及 RAG 架构");
});

test("录音中只显示服务端刚返回的原始转写，不提前显示合并后的整理文本", () => {
  assert.equal(
    nextVisibleTranscript({
      current: "介绍一下你的项目",
      incomingText: "以及 RAG 架构",
      mergedText: "介绍一下你的项目以及 RAG 架构",
    }),
    "以及 RAG 架构",
  );
});
