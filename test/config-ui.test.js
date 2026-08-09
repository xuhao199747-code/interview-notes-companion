import test from "node:test";
import assert from "node:assert/strict";
import { llmConfigChangedMessage, secretKeyPlaceholder } from "../src/config-ui.js";

test("已保存的 SecretKey 显示掩码提示而不是空白", () => {
  assert.equal(secretKeyPlaceholder("已保存"), "********（已保存，不显示原文）");
  assert.equal(secretKeyPlaceholder("未配置"), "只在本地填写，不会回显");
});

test("已保存的 SecretID 也显示掩码提示", () => {
  assert.equal(secretKeyPlaceholder("已保存"), "********（已保存，不显示原文）");
});

test("修改 LLM 输入后提示用户先保存，避免沿用旧配置错误", () => {
  assert.equal(llmConfigChangedMessage(), "配置已修改，点击“保存 LLM 配置”后再测试连接");
});
