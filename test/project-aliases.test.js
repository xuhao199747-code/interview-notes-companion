import test from "node:test";
import assert from "node:assert/strict";
import { canonicalProjectName, createProjectOptions, filterSectionsForProject } from "../src/project-aliases.js";

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
