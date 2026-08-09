import test from "node:test";
import assert from "node:assert/strict";
import { verificationSucceeded } from "../src/voiceprint-verification.js";

test("只有腾讯云明确通过才可启用声纹过滤", () => {
  assert.equal(verificationSucceeded({ Data: { Decision: 1 } }), true);
  assert.equal(verificationSucceeded({ Data: { Decision: 0 } }), false);
  assert.equal(verificationSucceeded({ Data: {} }), false);
});
