import test from "node:test";
import assert from "node:assert/strict";
import { selectAnswerEvidence } from "../src/answer-evidence.js";

test("weak semantic-only material falls back to the configured LLM without a local citation", () => {
  const result = selectAnswerEvidence({
    route: { mode: "supplement", matches: [{ title: "泛泛的项目说明", matchType: "semantic", semanticScore: 0.42 }] },
  });

  assert.equal(result.mode, "llm-only");
  assert.deepEqual(result.evidence, []);
});

test("direct and compose routes retain at most three reliable evidence items", () => {
  const result = selectAnswerEvidence({
    route: {
      mode: "compose",
      matches: [
        { title: "项目背景", matchType: "keyword" },
        { title: "技术方案", matchType: "hybrid", semanticScore: 0.88 },
        { title: "指标结果", matchType: "keyword" },
        { title: "无关段落", matchType: "keyword" },
      ],
    },
  });

  assert.equal(result.mode, "grounded");
  assert.deepEqual(result.evidence.map((item) => item.title), ["项目背景", "技术方案", "指标结果"]);
});
