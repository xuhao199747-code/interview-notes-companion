import assert from "node:assert/strict";
import test from "node:test";
import { mergeLegacyConverterSkills } from "../src/legacy-document-migration.js";

test("旧资料目录中的转换 Skill 会补入当前资料库，且不覆盖当前同名文件", () => {
  const current = [
    { name: "面试知识库-GEO品牌增长平台.md", markdown: "当前 GEO", type: "knowledge" },
    { name: "原始文档转Markdown资料Skill.md", markdown: "当前转换规则", type: "converter-skill" },
  ];
  const legacy = [
    { name: "原始文档转Markdown资料Skill.md", markdown: "旧转换规则", type: "converter-skill" },
    { name: "旧资料.md", markdown: "不应迁移", type: "knowledge" },
    { name: "另一份转换 Skill.md", markdown: "应迁移", type: "converter-skill" },
  ];

  assert.deepEqual(mergeLegacyConverterSkills(current, legacy), [
    ...current,
    { name: "另一份转换 Skill.md", markdown: "应迁移", type: "converter-skill" },
  ]);
});
