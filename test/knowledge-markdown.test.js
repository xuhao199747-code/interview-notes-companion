import test from "node:test";
import assert from "node:assert/strict";
import { normalizeKnowledgeMarkdown } from "../src/knowledge-markdown.js";

test("飞书 Markdown 表格保留原始行列关系，只清理单元格内的换行格式", () => {
  const output = normalizeKnowledgeMarkdown("| AI能力 | 主要功能 |\n|-|-|\n| Leader Agent | 理解目标<br/>拆解任务 |\n");
  assert.equal(output, "| AI能力 | 主要功能 |\n| --- | --- |\n| Leader Agent | 理解目标<br>拆解任务 |\n");
  assert.doesNotMatch(output, /#### Leader Agent|主要功能：/u);
});

test("飞书 HTML 表格转换为 Markdown 表格，不改写成字段卡片", () => {
  const output = normalizeKnowledgeMarkdown("<table><tr><td>客户</td><td>平台</td></tr><tr><td>A</td><td>元宝<br/>Kimi</td></tr></table>");
  assert.equal(output, "| 客户 | 平台 |\n| --- | --- |\n| A | 元宝<br>Kimi |\n");
  assert.doesNotMatch(output, /<table|<td|#### A|平台：/u);
});

test("旧版单行记录保留字段内容，不丢失历史资料", () => {
  const output = normalizeKnowledgeMarkdown("- 记录 1：AI能力：Leader Agent；主要功能：理解目标；输出：任务计划\n");
  assert.equal(output, "- AI能力：Leader Agent\n- 主要功能：理解目标\n- 输出：任务计划\n");
});

test("飞书的普通文本框不作为代码块显示", () => {
  const output = normalizeKnowledgeMarkdown("```Plain Text\nROI = 收益 ÷ 成本\n```");
  assert.equal(output, "ROI = 收益 ÷ 成本\n");
});

test("飞书用 JSON 标记承载口述文本时不保留代码围栏", () => {
  const output = normalizeKnowledgeMarkdown("```JSON\n# 项目背景\n客户不知道怎么优化。\n```");
  assert.equal(output, "# 项目背景\n客户不知道怎么优化。\n");
  assert.doesNotMatch(output, /```JSON/u);
});
