import assert from "node:assert/strict";
import test from "node:test";
import { decideSpeakerGate } from "../src/speaker-gate.js";

test("本人、他人、不确定和重叠语音按保守规则门控", () => {
  assert.equal(decideSpeakerGate({ verification: "self", overlap: false, questionLike: true }), "ignore");
  assert.equal(decideSpeakerGate({ verification: "other", overlap: false, questionLike: true }), "allow");
  assert.equal(decideSpeakerGate({ verification: "unknown", overlap: false, questionLike: false }), "hold");
  assert.equal(decideSpeakerGate({ verification: "other", overlap: true, questionLike: true }), "hold");
});
