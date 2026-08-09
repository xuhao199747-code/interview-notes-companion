import assert from "node:assert/strict";
import test from "node:test";
import { withTimeout } from "../src/request-timeout.js";

test("上游请求无响应时，超时兜底会及时返回错误", async () => {
  await assert.rejects(
    withTimeout(new Promise(() => {}), 10, "腾讯云声纹验证超过 15 秒没有响应，请重试"),
    /超过 15 秒/,
  );
});
