import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const privateMarkers = /(?:GEO|旅游智能营销|my\.feishu\.cn|AlphaRank|Attrip|霖枫|U3esdj|FnRed|O2KH)/u;

test("可开源的回答规则不包含候选人项目、飞书或个人资料", async () => {
  const rules = await readFile(new URL("../assets/AI产品经理回答规则.md", import.meta.url), "utf8");
  assert.doesNotMatch(rules, privateMarkers);
  assert.match(rules, /命中原文时，优先使用原文/);
  assert.match(rules, /给定业务场景的开放题/);
});

test("可开源的回答 Skill 仅保留通用口述方法", async () => {
  const skill = await readFile(new URL("../assets/AI产品经理面试完整口述回答Skill-通用版.md", import.meta.url), "utf8");
  assert.doesNotMatch(skill, privateMarkers);
  assert.match(skill, /原文/);
  assert.match(skill, /技术架构/);
  assert.match(skill, /场景/);
});

test("资料库、简历和本机私有回答 Skill 被 Git 忽略", async () => {
  const ignore = await readFile(new URL("../.gitignore", import.meta.url), "utf8");
  for (const entry of ["/面试知识库-*.md", "/简历 7.0.md", "/AI产品经理面试完整口述回答Skill.md", "/AI产品经理术语表.md", "/private/"]) {
    assert.match(ignore, new RegExp(entry.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")));
  }
});

test("公开仓库提供空白个人偏好模板，但不提供个人项目事实", async () => {
  const template = await readFile(new URL("../examples/personal-style.private.template.md", import.meta.url), "utf8");
  assert.doesNotMatch(template, privateMarkers);
  assert.match(template, /本机个人表达偏好/);
  assert.match(template, /不要填写姓名、公司、项目名、真实指标或客户信息/);
});
