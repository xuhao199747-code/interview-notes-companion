import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("确认问题后不等待本地语义检索，先用即时候选资料开始生成", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /import \{[^}]*setQuestionContext[^}]*\} from "\.\/src\/answer-state\.js"/s);
  assert.match(app, /fetch\("\/api\/retrieve"/);
  assert.match(app, /mergeHybridCandidates\(normalizedQuery, materials, \[\]\)/);
  assert.match(app, /routeAnswer\(normalizedQuery, materials, \{[^}]*candidates/);
  assert.match(app, /selectAnswerEvidence\(\{ route \}\)/);
  assert.match(app, /selectLlmAnswerMaterials\(\{ route, materials \}\)/);
  assert.match(app, /generateAnswer\(normalizedQuery, current\.requestId, current\.context \|\| "", llmMaterials/);
  assert.match(app, /void retrieveSemanticCandidates\(normalizedQuery, materials\)\.then/);
});

test("语义检索异常时仍降级到关键词，但资料区不插入检索状态文字", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /semantic: \{ available: false/);
  assert.doesNotMatch(app, /语义检索暂不可用/);
});
