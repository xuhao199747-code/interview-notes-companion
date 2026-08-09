import assert from "node:assert/strict";
import test from "node:test";
import { shouldMigrateLegacyConfig } from "../src/config-migration.js";

test("新数据目录没有云端配置时迁移旧本机配置", () => {
  assert.equal(shouldMigrateLegacyConfig({ asrProvider: "browser", doubaoAccessToken: "" }, { asrProvider: "doubao", doubaoAccessToken: "token" }), true);
});

test("新数据目录已有云端配置时不覆盖", () => {
  assert.equal(shouldMigrateLegacyConfig({ asrProvider: "doubao", doubaoAccessToken: "new-token" }, { asrProvider: "tencent", tencentSecretKey: "old-key" }), false);
});
