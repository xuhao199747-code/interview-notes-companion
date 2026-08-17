import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const skillUrl = new URL("../assets/AI产品经理面试完整口述回答Skill-通用版.md", import.meta.url);

test("通用口述回答 Skill 保留原文优先、项目隔离和事实边界", async () => {
  const skill = await readFile(skillUrl, "utf8");
  for (const phrase of ["原文", "项目题只使用当前锁定项目", "需要本人确认", "不能跨项目拼接"]) {
    assert.match(skill, new RegExp(phrase));
  }
});

test("通用口述回答 Skill 说明技术架构与场景题的讲法", async () => {
  const skill = await readFile(skillUrl, "utf8");
  for (const phrase of ["技术架构题", "调用哪些工具或能力", "关键设计与判断", "给定业务场景的开放题", "用户背景、具体场景和未被满足的痛点"]) {
    assert.match(skill, new RegExp(phrase));
  }
});

test("通用口述回答 Skill 不包含候选人的项目和飞书资料", async () => {
  const skill = await readFile(skillUrl, "utf8");
  assert.doesNotMatch(skill, /(?:GEO|旅游智能营销|my\.feishu\.cn|AlphaRank|Attrip|霖枫)/u);
});
