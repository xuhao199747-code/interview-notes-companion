import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { selectLlmAnswerMaterials } from "../src/llm-answer-materials.js";

test("LLM 保留同一道原文题目的连续分段，而不是只保留左侧引用的第一段", () => {
  const first = { source: "项目原文.md", project: "GEO", title: "评分规则怎么制定", chunkIndex: 0, content: "先确定评测目标和业务红线。", matchType: "keyword" };
  const second = { source: "项目原文.md", project: "GEO", title: "评分规则怎么制定", chunkIndex: 1, content: "再拆维度、定义分级标准并回归验证。", matchType: "keyword" };
  const unrelated = { source: "项目原文.md", project: "GEO", title: "项目背景", content: "这是无关项目概览。", matchType: "keyword" };

  const result = selectLlmAnswerMaterials({
    route: { mode: "direct", matches: [first] },
    materials: [first, second, unrelated],
  });

  assert.deepEqual(result.map((item) => item.content), [first.content, second.content]);
});

test("相关但不足以在左侧作为原文引用的资料，仍可作为 LLM 的口述补充材料", () => {
  const supporting = { source: "通用问题.md", title: "AI 评测", content: "评测集需要覆盖正常、错误和边界案例。", matchType: "semantic" };
  const result = selectLlmAnswerMaterials({
    route: { mode: "supplement", matches: [supporting] },
    materials: [supporting],
  });

  assert.deepEqual(result, [supporting]);
});

test("页面用同一份原文材料渲染左侧参考和生成右侧口述", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /selectLlmAnswerMaterials\(\{ route, materials \}\)/);
  assert.match(app, /documentResultsHtml\(normalizedQuery, materials, referenceRoute, retrieval\)/);
  assert.match(app, /generateAnswer\(normalizedQuery, current\.requestId, current\.context \|\| "", llmMaterials/);
});
