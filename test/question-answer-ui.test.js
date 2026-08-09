import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("面试页保留文档库和 LLM 两列回答", async () => {
  const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /id="llmResults"/);
  assert.match(html, /id="documentResults"/);
  assert.match(html, /DOCUMENT LIBRARY/);
  assert.match(html, /文档库参考/);
});
