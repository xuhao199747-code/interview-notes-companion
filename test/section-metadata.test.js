import test from "node:test";
import assert from "node:assert/strict";
import { annotateSection, inferredProjectName, isPersonalProfileSection } from "../src/section-metadata.js";
import { routeAnswer } from "../src/answer-router.js";

test("讲人设和个人故事线自动标为个人介绍，不依赖标题规范", () => {
  const section = annotateSection({
    source: "面试口述与复盘原文.md",
    title: "第一层（讲人设）",
    project: "第一层（讲人设）",
    content: "个人故事线自我介绍。您好，我叫小王，有五年产品经验。",
  });

  assert.equal(section.role, "profile");
  assert.equal(isPersonalProfileSection(section), true);
  assert.deepEqual(routeAnswer("请做一下自我介绍", [section]).matches.map((item) => item.title), ["第一层（讲人设）"]);
});

test("新资料从文件名自动提取项目归属，不预设项目名称", () => {
  const section = annotateSection({
    source: "面试知识库-智能客服增长项目.md",
    title: "项目背景",
    project: "项目背景",
    content: "这个项目用于提升客服转化。",
  });

  assert.equal(section.role, "project-background");
  assert.equal(inferredProjectName(section), "智能客服增长项目");
});

test("个人经历一级标题下的项目挑战不会被误标为个人简介", () => {
  const section = annotateSection({
    project: "自我介绍",
    title: "项目挑战",
    content: "我通过用户访谈定位核心问题。",
  });

  assert.equal(section.role, "project-retrospective");
  assert.equal(isPersonalProfileSection(section), false);
});
