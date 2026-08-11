import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const skillUrl = new URL("../assets/AI产品术语表维护Skill.md", import.meta.url);

test("术语表维护 Skill 约束别名、通用表达和必填概念结构", async () => {
  const skill = await readFile(skillUrl, "utf8");

  for (const phrase of [
    "## 适用范围",
    "## 术语条目标准结构",
    "别名：",
    "一句话定义",
    "解决什么业务问题",
    "核心组成或实现链路",
    "适用场景",
    "不适用场景或局限",
    "1 分钟口述回答",
    "区别和关系",
    "可以 / 建议 / 我会",
    "不得写成候选人的亲身项目经历",
  ]) {
    assert.match(skill, new RegExp(phrase));
  }
});

test("术语表维护 Skill 覆盖 Coze、RAG、编排、评测与高风险场景", async () => {
  const skill = await readFile(skillUrl, "utf8");

  for (const phrase of [
    "Coze / 扣子",
    "Bot、Workflow、Plugin、Knowledge、Memory",
    "离线建库",
    "在线检索",
    "混合召回",
    "Rerank",
    "Agent、Workflow、Tool、Skill",
    "Rubric",
    "Badcase",
    "Trace",
    "回归集",
    "拒答",
    "人工接管",
    "审计",
  ]) {
    assert.match(skill, new RegExp(phrase));
  }
});
