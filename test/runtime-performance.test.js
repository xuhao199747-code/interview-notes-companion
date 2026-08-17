import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("内置知识库只在启动时同步，不进行五秒轮询", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.doesNotMatch(app, /setInterval\(\(\) => \{ void loadBundledKnowledgeBase\(\); \}, 5000\)/u);
});

test("首屏先显示加载态，资料就绪后才开放识别入口", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /sections:\s*\[\]/u);
  assert.match(app, /function hydrateStartupData\(\)[\s\S]*?Promise\.all\(\[loadPersistedDocuments\(\), loadPersistedGlossary\(\)\]\)/u);
  assert.match(app, /knowledgeReady:\s*false/u);
  assert.match(app, /function setQuestionCaptureReady\(ready\)/u);
  assert.match(app, /setQuestionCaptureReady\(true\)/u);
  assert.match(app, /if \(!state\.knowledgeReady\)/u);
});
