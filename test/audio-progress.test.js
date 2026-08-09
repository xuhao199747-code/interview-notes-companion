import test from "node:test";
import assert from "node:assert/strict";
import { shouldPublishAudioProgress } from "../src/audio-progress.js";

test("音频进度首包和固定间隔应反馈给界面", () => {
  assert.equal(shouldPublishAudioProgress(1), true);
  assert.equal(shouldPublishAudioProgress(24), false);
  assert.equal(shouldPublishAudioProgress(25), true);
});
