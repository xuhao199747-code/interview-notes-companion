import assert from "node:assert/strict";
import test from "node:test";
import { cosineSimilarity, rankSemanticCandidates } from "../src/semantic-search.js";

test("余弦相似度识别相同方向的向量", () => {
  assert.equal(cosineSimilarity([1, 0], [2, 0]), 1);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
});

test("语义候选按相似度排序并过滤低置信资料", () => {
  const ranked = rankSemanticCandidates([1, 0], [
    { title: "自我介绍", vector: [0.95, 0.05] },
    { title: "项目复盘", vector: [0.2, 0.8] },
  ], 0.7);
  assert.deepEqual(ranked.map((item) => item.title), ["自我介绍"]);
});
