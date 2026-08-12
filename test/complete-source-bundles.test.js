import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseMarkdown, searchSections } from "../src/search.js";

function shiftHeadings(markdown, levels = 2) {
  return markdown.replace(/^(#{1,6})(\s+)/gmu, (_all, hashes, gap) => `${"#".repeat(Math.min(6, hashes.length + levels))}${gap}`);
}

function currentSnapshot(markdown) {
  const match = markdown.match(/^## 当前飞书版本[^\n]*\n\n>[^\n]*\n\n([\s\S]*?)(?=^## 历史飞书版本)/mu);
  assert.ok(match, "原始资料需要明确标出当前飞书快照与历史快照的边界");
  return match[1].trim();
}

const bundles = [
  ["../面试知识库-GEO品牌增长平台.md", "../GEO项目梳理-大王版.md"],
  ["../面试知识库-旅游智能营销.md", "../旅游场景.md"],
  ["../面试知识库-AI产品通用能力.md", "../AI产品经理面试问题与知识笔记.md"],
];

for (const [bundlePath, sourcePath] of bundles) {
  test(`${sourcePath} 对应的本地知识库可被加载`, async () => {
    const bundle = await readFile(new URL(bundlePath, import.meta.url), "utf8");
    assert.match(bundle, /完整原文资料（逐条保留）|完整面试问题原文说明/);
    assert.ok(bundle.trim().length > 1000, "本地知识库不应退化为示例占位内容");
  });
}

test("项目画板已转为可检索的文字链路", async () => {
  const [geo, tourism] = await Promise.all([
    readFile(new URL("../面试知识库-GEO品牌增长平台.md", import.meta.url), "utf8"),
    readFile(new URL("../面试知识库-旅游智能营销.md", import.meta.url), "utf8"),
  ]);
  assert.match(geo, /数据监测 → 发现问题 → 分析问题 → 生成方案 → 优化 → 验证效果/);
  assert.match(geo, /Topic\/Prompt.*浏览器自动化采集.*GEO 指标/s);
  assert.match(tourism, /外部渠道.*客户.*RAG.*人工.*CRM/s);
});

test("GEO 与旅游知识库保留各自飞书最新版全文快照及必要的嵌入表格文字", async () => {
  const [geo, tourism] = await Promise.all([
    readFile(new URL("../面试知识库-GEO品牌增长平台.md", import.meta.url), "utf8"),
    readFile(new URL("../面试知识库-旅游智能营销.md", import.meta.url), "utf8"),
  ]);
  assert.match(geo, /当前飞书版本（修订版 1249）/);
  assert.match(geo, /嵌入表格文字化：用户角色与功能对应/);
  assert.match(geo, /企业老板\/负责人.*AI品牌体检/s);
  assert.match(tourism, /当前飞书版本（修订版 1316）/);
  assert.match(tourism, /月均咨询量.*150 条\/月/s);
  assert.match(tourism, /线上销售工作场景/);
});

test("AI 面试资料保留历史完整逐字稿，飞书新版本不能覆盖掉已导入内容", async () => {
  const bundle = await readFile(new URL("../面试知识库-AI产品通用能力.md", import.meta.url), "utf8");
  assert.match(bundle, /当前飞书版本（修订版 2553）/);
  assert.match(bundle, /历史完整快照（修订版 1483）/);
  assert.match(bundle, /知识检索准确率从71\.1%提升到85%以上/);
  assert.match(bundle, /第二层（获客项目）/);
  assert.match(bundle, /项目完整主讲版（约7分钟）/);
});

test("未写题目的逐字稿补充检索标签，职业规划回答可以被准确召回", async () => {
  const bundle = await readFile(new URL("../面试知识库-AI产品通用能力.md", import.meta.url), "utf8");
  assert.match(bundle, /为什么离职\s*\/\s*为什么换工作\s*\/\s*职业规划/);
});

test("长资料中问题标题应优先于泛项目段落，避免逐字稿被无关概览淹没", async () => {
  const bundle = await readFile(new URL("../面试知识库-AI产品通用能力.md", import.meta.url), "utf8");
  const [match] = searchSections("AlphaRank GEO 的 Prompt 怎么生产和优化？", parseMarkdown(bundle), 1);
  assert.equal(match.title, "Prompt是怎么生产和优化的");
});
