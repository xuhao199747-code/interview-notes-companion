import test from "node:test";
import assert from "node:assert/strict";
import { syncActiveSkill } from "../src/skill-sync.js";

test("恢复本地资料时，用同名的已上传 Skill 覆盖旧回答模板", () => {
  const result = syncActiveSkill({
    documents: [
      { name: "知识库.md", type: "knowledge", markdown: "资料" },
      { name: "AI产品经理面试完整口述回答Skill.md", type: "skill", markdown: "更新后的规则" }
    ],
    templateName: "AI产品经理面试完整口述回答Skill.md"
  });

  assert.deepEqual(result, {
    templateName: "AI产品经理面试完整口述回答Skill.md",
    template: "更新后的规则"
  });
});

test("当前 Skill 已不存在时，不擅自切换到其他 Skill", () => {
  const result = syncActiveSkill({
    documents: [{ name: "其他规则.md", type: "skill", markdown: "其他规则" }],
    templateName: "已删除的规则.md"
  });

  assert.equal(result, null);
});
