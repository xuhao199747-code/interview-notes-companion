import test from "node:test";
import assert from "node:assert/strict";
import { formatAsrConnectionError } from "../src/asr-status.js";

test("腾讯云资源包耗尽会显示可操作的错误说明", () => {
  assert.equal(formatAsrConnectionError({ code: 4004, message: "资源包耗尽" }), "腾讯云额度已耗尽（4004）：请购买资源包或开启后付费后再测试");
});
