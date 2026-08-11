import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("设置页只展示一次性识别的快捷键设置", async () => {
  const [html, app] = await Promise.all([
    fs.readFile(new URL("../index.html", import.meta.url), "utf8"),
    fs.readFile(new URL("../app.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="questionCaptureHotkey"/);
  assert.doesNotMatch(html, /id="voiceSettings"|id="listeningSettings"|id="questionCommitMode"|id="questionHotkey"/);
  assert.doesNotMatch(app, /insertAdjacentHTML\("beforeend"/);
});
