import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("面试页提供手动补充问题入口", async () => {
  const [html, app] = await Promise.all([
    fs.readFile(new URL("../index.html", import.meta.url), "utf8"),
    fs.readFile(new URL("../app.js", import.meta.url), "utf8"),
  ]);

  assert.match(html, /id="manualQuestionButton"/);
  assert.match(html, /id="manualQuestionInput"/);
  assert.match(html, /id="submitManualQuestionButton"/);
  assert.match(app, /function submitManualQuestion\(/);
});
