import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("验证失败会明确保存为未验证，而不是错误启用", async () => {
  const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
  assert.match(server, /const verified = verificationSucceeded\(result\);/);
  assert.match(server, /runtimeConfig\.voicePrintVerified = verified;/);
  assert.match(server, /if \(!verified\) return sendJson\(response, 422/);
});
