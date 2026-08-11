import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("确认问题后先请求本地语义检索，再把候选资料交给回答路由", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /fetch\("\/api\/retrieve"/);
  assert.match(app, /await retrieveSemanticCandidates\(normalizedQuery, materials\)/);
  assert.match(app, /mergeHybridCandidates\(normalizedQuery, materials, retrieval\.matches\)/);
  assert.match(app, /routeAnswer\(normalizedQuery, materials, \{[^}]*candidates/);
});

test("语义检索异常时，资料区明确提示关键词降级，而不把空结果伪装为无资料", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /语义检索暂不可用/);
  assert.match(app, /semantic: \{ available: false/);
});
