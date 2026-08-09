import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("独立知识库入口已移除，设置资料管理仍存在", async () => {
  const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, /data-view="knowledgeView"/);
  assert.doesNotMatch(html, /id="knowledgeView"/);
  assert.match(html, /id="knowledgeSettings"/);
});
