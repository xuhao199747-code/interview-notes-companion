import test from "node:test";
import assert from "node:assert/strict";
import { shouldCommitVoiceprintResult } from "../src/voiceprint-routing.js";

test("只有明确非本人且最终结果才可提交问题", () => {
  assert.equal(shouldCommitVoiceprintResult({ gate: "allow", final: true }), true);
  assert.equal(shouldCommitVoiceprintResult({ gate: "allow", final: false }), false);
  assert.equal(shouldCommitVoiceprintResult({ gate: "hold", final: true }), false);
  assert.equal(shouldCommitVoiceprintResult({ gate: "ignore", final: true }), false);
});
