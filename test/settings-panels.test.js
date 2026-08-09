import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("回答 Skill 面板默认隐藏，直到点击对应设置标签", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /class="settings-panel hidden" id="templateSettings"/);
  assert.match(html, /id="activeSkillStatus"/);
  assert.doesNotMatch(html, /id="templatePreview"/);
});
