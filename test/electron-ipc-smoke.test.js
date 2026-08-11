import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("IPC 冒烟脚本使用一次性识别音频通道", async () => {
  const smoke = await fs.readFile(new URL("../electron/ipc-smoke.cjs", import.meta.url), "utf8");
  assert.match(smoke, /question-capture:audio/);
  assert.match(smoke, /sendQuestionCaptureAudio/);
  assert.doesNotMatch(smoke, /asr:audio|sendAudio/);
});
