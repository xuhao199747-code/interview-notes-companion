import test from "node:test";
import assert from "node:assert/strict";
import { toPublicDoubaoConfig, validateDoubaoConfig } from "../src/doubao-config.js";

test("豆包配置要求 App ID、Access Token 和资源 ID", () => {
  assert.deepEqual(validateDoubaoConfig({}), { valid: false, message: "请填写豆包 App ID、Access Token 和资源 ID" });
  assert.deepEqual(
    validateDoubaoConfig({ doubaoAppId: "app", doubaoAccessToken: "token", doubaoResourceId: "volc.seedasr.sauc.duration" }),
    { valid: true, message: "配置格式正确" }
  );
});

test("公开豆包配置不会回显 Access Token", () => {
  const result = toPublicDoubaoConfig({ doubaoAppId: "app", doubaoAccessToken: "private-token", doubaoResourceId: "resource" });
  assert.deepEqual(result, {
    doubaoAppId: "app",
    doubaoAccessToken: "已保存",
    doubaoResourceId: "resource",
    doubaoEndpoint: "wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async"
  });
  assert.equal(JSON.stringify(result).includes("private-token"), false);
});
