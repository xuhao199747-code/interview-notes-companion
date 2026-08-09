import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const skillUrl = new URL("../assets/AI产品经理面试完整口述回答Skill.md", import.meta.url);

test("完整口述回答 Skill 包含事实边界和五段口述结构", async () => {
  const skill = await readFile(skillUrl, "utf8");
  for (const heading of ["## 目标", "## 回答原则", "### 结论", "### 背景与问题", "### 具体做法", "### 结果", "### 复盘"]) {
    assert.match(skill, new RegExp(heading));
  }
  assert.match(skill, /资料不足时明确说“这部分需要本人确认”/);
  assert.match(skill, /业务目标、产品设计、技术取舍、评估指标、迭代闭环/);
});

test("完整口述回答 Skill 按问题范围区分经历与通用方法论", async () => {
  const skill = await readFile(skillUrl, "utf8");
  assert.match(skill, /## 回答范围判断/);
  assert.match(skill, /候选人经历类/);
  assert.match(skill, /通用方法论类/);
  assert.match(skill, /通用问题使用“我会 \/ 建议 \/ 可以”的方法论表达/);
  assert.match(skill, /个人经历问题才使用“我当时 \/ 我负责 \/ 我做过”的经历表达/);
  assert.match(skill, /不得擅自选择某个项目作为答案/);
});
