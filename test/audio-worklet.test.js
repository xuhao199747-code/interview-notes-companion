import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("音频工作线程传输 PCM 时必须转移底层 ArrayBuffer", async () => {
  const worklet = await readFile(new URL("../src/audio-worklet.js", import.meta.url), "utf8");
  assert.match(worklet, /postMessage\(pcm, \[pcm\.buffer\]\)/);
  assert.doesNotMatch(worklet, /postMessage\(pcm, \[pcm\]\)/);
});

test("桌面监听启动后必须恢复 AudioContext，才能实时处理麦克风音频", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /await context\.resume\(\)/);
});

test("发送到 Electron 主进程时必须把 PCM ArrayBuffer 转成 Uint8Array", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /sendAudio\(new Uint8Array\(pcm\)\)/);
  assert.doesNotMatch(app, /sendAudio\(new Uint8Array\(pcm\.buffer\)\)/);
});

test("桌面端必须使用兼容的 ScriptProcessor 持续输出 PCM 音频", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /context\.createScriptProcessor\(4096, 1, 1\)/);
  assert.match(app, /processor\.onaudioprocess/);
});

test("音频采集链路不能把会议声音回放到扬声器", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /context\.createGain\(\)/);
  assert.match(app, /mute\.gain\.value = 0/);
});
