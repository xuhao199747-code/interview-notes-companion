import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getActiveSkillName } from "../src/skill-ui.js";

test("预览显示最后应用的 Skill，而不是列表中的旧 Skill", () => {
  const documents = [
    { name: "旧模板.md", type: "skill" },
    { name: "我的面试规则.md", type: "skill" }
  ];
  assert.equal(getActiveSkillName(documents, "我的面试规则.md"), "我的面试规则.md");
});

test("回答 Skill 用卡片展示当前应用状态和管理操作", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const skillRenderer = app.slice(app.indexOf("function renderSkillCards"), app.indexOf("function renderRetrievalSettings"));
  assert.match(app, /function renderSkillCards\(\)/);
  assert.match(app, /skillCardList/);
  assert.match(app, /当前应用中/);
  assert.match(skillRenderer, /class="delete-doc large"/);
  assert.doesNotMatch(skillRenderer, /edit-doc/);
});
