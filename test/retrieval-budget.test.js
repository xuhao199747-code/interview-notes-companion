import test from "node:test";
import assert from "node:assert/strict";
import { withRetrievalDeadline } from "../src/retrieval-budget.js";

test("语义检索在时限内返回原结果", async () => {
  const result = await withRetrievalDeadline(Promise.resolve(["命中资料"]), 50, []);
  assert.deepEqual(result, ["命中资料"]);
});

test("语义检索超时后立即交给关键词检索继续作答", async () => {
  const result = await withRetrievalDeadline(new Promise((resolve) => setTimeout(() => resolve(["慢结果"]), 50)), 5, []);
  assert.deepEqual(result, []);
});
