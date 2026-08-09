import test from "node:test";
import assert from "node:assert/strict";
import { createVoiceprintAudioWindow } from "../src/voiceprint-audio-window.js";

test("声纹验证只取最近四秒音频", () => {
  const audio = createVoiceprintAudioWindow(128000);
  audio.push(Buffer.alloc(96000, 1));
  audio.push(Buffer.alloc(96000, 2));
  const sample = audio.takeLatest(128000);
  assert.equal(sample.length, 128000);
  assert.equal(sample.at(-1), 2);
});

test("清空后不再保留任何音频", () => {
  const audio = createVoiceprintAudioWindow(8);
  audio.push(Buffer.alloc(8, 1));
  audio.clear();
  assert.equal(audio.takeLatest(8).length, 0);
});
