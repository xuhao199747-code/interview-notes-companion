import test from "node:test";
import assert from "node:assert/strict";
import { validateAsrProviderConfig } from "../src/asr-provider.js";

test("豆包提供商使用独立的必填配置校验", () => {
  assert.deepEqual(
    validateAsrProviderConfig({ asrProvider: "doubao", doubaoAppId: "", doubaoAccessToken: "", doubaoResourceId: "" }),
    { valid: false, message: "请填写豆包 App ID、Access Token 和资源 ID" }
  );
  assert.deepEqual(
    validateAsrProviderConfig({ asrProvider: "doubao", doubaoAppId: "app", doubaoAccessToken: "token", doubaoResourceId: "resource" }),
    { valid: true, message: "配置格式正确" }
  );
});

test("腾讯云和浏览器提供商保留各自的配置提示", () => {
  assert.deepEqual(validateAsrProviderConfig({ asrProvider: "tencent" }), { valid: false, message: "请先选择腾讯云 V2 并保存完整配置" });
  assert.deepEqual(validateAsrProviderConfig({ asrProvider: "browser" }), { valid: false, message: "浏览器语音识别不支持桌面音频转写" });
});
