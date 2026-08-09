import test from "node:test";
import assert from "node:assert/strict";
import { getActiveSkillName } from "../src/skill-ui.js";

test("预览显示最后应用的 Skill，而不是列表中的旧 Skill", () => {
  const documents = [
    { name: "旧模板.md", type: "skill" },
    { name: "我的面试规则.md", type: "skill" }
  ];
  assert.equal(getActiveSkillName(documents, "我的面试规则.md"), "我的面试规则.md");
});
