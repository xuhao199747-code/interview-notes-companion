import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("一次性识别会把当前音频通道的接收状态回传给渲染页", async () => {
  const main = await fs.readFile(new URL("../electron/main.js", import.meta.url), "utf8");
  assert.match(main, /type: "audio"/);
  assert.match(main, /question-capture:event/);
  assert.match(main, /audioFrames/);
});

test("识别页顶部保留识别文字，不展示音频帧计数", async () => {
  const app = await fs.readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /payload\?\.type === "ready"/);
  assert.match(app, /payload\?\.type === "audio"/);
  assert.match(app, /待识别/);
  assert.doesNotMatch(app, /正在接收语音…（\$\{payload\.audioFrames/);
});
