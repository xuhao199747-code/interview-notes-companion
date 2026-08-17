import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("设置中提供回答规则的查看、上传和下载入口", async () => {
  const [html, app, server] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../server.js", import.meta.url), "utf8"),
  ]);
  assert.match(html, /data-settings="rulesSettings"/);
  assert.match(html, /id="rulesFileInput"/);
  assert.match(app, /function downloadRules\(\)/);
  assert.match(app, /fetch\("\/api\/rules"/);
  assert.match(server, /answerRules\.markdown/);
});

test("所有设置页上传按钮统一使用加号图标", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /for="rulesFileInput">＋ 上传新版规则</);
  assert.doesNotMatch(html, /↑ 上传新版规则/);
});
