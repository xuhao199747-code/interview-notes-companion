import test from "node:test";
import assert from "node:assert/strict";
import { toRendererConfig } from "../src/desktop-config.js";

test("desktop config removes secret values from renderer payload", () => {
  assert.deepEqual(
    toRendererConfig({ asrProvider: "tencent", tencentSecretId: "id", tencentSecretKey: "secret", doubaoAccessToken: "", aiApiKey: "llm-key", tencentAppId: "123" }),
    { asrProvider: "tencent", tencentSecretId: "已保存", tencentSecretKey: "已保存", doubaoAccessToken: "未配置", aiApiKey: "已保存", tencentAppId: "123" }
  );
});
