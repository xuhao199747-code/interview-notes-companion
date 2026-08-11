import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("服务端不再提供声纹或全程监听配置", async () => {
  const source = await fs.readFile(new URL("../server.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /voiceprint|voicePrint|localVoiceprint/i);
  assert.doesNotMatch(source, /questionCommitMode/);
  assert.doesNotMatch(source, /questionHotkey:/);
  assert.match(source, /questionCaptureHotkey/);
});
