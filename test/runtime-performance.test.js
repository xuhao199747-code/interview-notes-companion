import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("内置知识库只在启动时同步，不进行五秒轮询", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.doesNotMatch(app, /setInterval\(\(\) => \{ void loadBundledKnowledgeBase\(\); \}, 5000\)/u);
});
