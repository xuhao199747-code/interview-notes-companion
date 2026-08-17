import test from "node:test";
import assert from "node:assert/strict";
import { canonicalProjectName, createProjectOptions, filterSectionsForProject } from "../src/project-aliases.js";
import { parseMarkdown } from "../src/search.js";

const sections = [
  { project: "GEO", title: "旧资料里的技术追问" },
  { project: "GEO 品牌增长平台", title: "请介绍一下 GEO 项目" },
];

test("GEO 的简写和全称合并为同一个项目选项", () => {
  const options = createProjectOptions(sections);
  assert.deepEqual(options, [{
    id: "geo 品牌增长平台",
    name: "GEO 品牌增长平台",
    aliases: ["GEO", "GEO品牌增长平台", "品牌增长平台"],
  }]);
  assert.equal(canonicalProjectName("GEO"), "GEO 品牌增长平台");
});

test("锁定 GEO 项目时同时保留简写资料与完整主资料", () => {
  assert.deepEqual(filterSectionsForProject(sections, "geo 品牌增长平台").map((section) => section.title), ["旧资料里的技术追问", "请介绍一下 GEO 项目"]);
});

test("没有项目字段的本地项目资料按文件名自动归属，避免真实上传资料失去项目上下文", () => {
  const localSections = [
    { source: "面试知识库-GEO品牌增长平台.md", title: "RAG 在项目里起什么作用" },
    { source: "面试知识库-旅游智能营销.md", title: "旅游项目的方案推荐" },
    { source: "面试知识库-AI产品通用能力.md", title: "什么是 Agent" },
  ];
  const options = createProjectOptions(localSections);

  assert.deepEqual(options.map(({ id }) => id), ["geo 品牌增长平台", "旅游智能营销"]);
  assert.equal(options.find((option) => option.id === "旅游智能营销").aliases.includes("旅游获客"), true);
  assert.deepEqual(
    filterSectionsForProject(localSections, "geo 品牌增长平台").map((section) => section.title),
    ["RAG 在项目里起什么作用"],
  );
  assert.deepEqual(
    filterSectionsForProject(localSections, "旅游智能营销").map((section) => section.title),
    ["旅游项目的方案推荐"],
  );
});

test("飞书章节标题不能覆盖文件级项目归属，完整当前版本仍可按项目过滤", () => {
  const fetchedSections = [
    { source: "面试知识库-GEO品牌增长平台.md", project: "项目背景", title: "项目定位" },
    { source: "面试知识库-旅游智能营销.md", project: "1. 项目背景", title: "运营基线" },
  ];
  assert.deepEqual(
    filterSectionsForProject(fetchedSections, "geo 品牌增长平台").map((section) => section.title),
    ["项目定位"],
  );
  assert.deepEqual(
    filterSectionsForProject(fetchedSections, "旅游智能营销").map((section) => section.title),
    ["运营基线"],
  );
});

test("一份多项目飞书原文按项目标题切分后仍可分别过滤", () => {
  const sections = parseMarkdown(`
# 第二层（讲项目）

## 项目一（GEO项目）

### 你 AGENT 的架构是什么？

GEO 使用 Leader Agent 和六个专业 Agent。

## 项目二（旅游智能营销项目）

### 旅游项目的 Bad Case 怎么解决？

旅游项目用意图映射表和置信度追问处理误判。
`, "面试知识库-面试口述与复盘原文.md");

  assert.deepEqual(
    filterSectionsForProject(sections, "geo 品牌增长平台").map((section) => section.title),
    ["你 AGENT 的架构是什么？"],
  );
  assert.deepEqual(
    filterSectionsForProject(sections, "旅游智能营销").map((section) => section.title),
    ["旅游项目的 Bad Case 怎么解决？"],
  );
});
