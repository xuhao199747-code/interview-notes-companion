import assert from "node:assert/strict";
import test from "node:test";
import { hydrateDocumentsInBatches } from "../src/startup-hydration.js";

test("资料加载会在每份文档之间让出界面事件循环", async () => {
  const yieldedAfter = [];
  const documents = [{ name: "一.md", markdown: "# 一" }, { name: "二.md", markdown: "# 二" }, { name: "三.md", markdown: "# 三" }];
  const hydrated = await hydrateDocumentsInBatches(documents, (markdown, name) => [`${name}:${markdown}`], {
    yieldToUi: async () => { yieldedAfter.push(true); }
  });

  assert.deepEqual(hydrated.map((document) => document.sections), [["一.md:# 一"], ["二.md:# 二"], ["三.md:# 三"]]);
  assert.equal(yieldedAfter.length, 2);
});
