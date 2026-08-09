import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("验证声纹时重新录制独立样本，并向用户说明严格门控", async () => {
  const [app, html] = await Promise.all([
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
  ]);
  assert.match(app, /state\.voiceVerificationPcm = await captureVoiceSample\(4000, setVoiceprintRecordingStatus\)/);
  assert.match(app, /pcm16Base64: pcmToBase64\(state\.voiceVerificationPcm\)/);
  assert.match(app, /if \(!state\.voicePrintVerified\) \{/);
  assert.match(app, /声纹不确定，未触发检索/);
  assert.match(app, /本人声音，已忽略，不会检索或生成答案/);
  assert.match(html, /验证时会重新录制独立语音样本/);
});

test("声纹页展示三步状态卡和单一主操作", async () => {
  const [app, html] = await Promise.all([
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
  ]);
  assert.match(html, /id="voiceprintGuide"/);
  assert.match(html, /id="voiceprintPrimaryAction"/);
  assert.match(app, /function renderVoiceprintGuide\(config\)/);
  assert.match(app, /function openVoiceprintCredentials\(\)/);
  assert.match(app, /voiceprintPrimaryAction/);
});

test("声纹页把设备选择和声纹管理分开，监听控制不在此页", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /class="audio-device-section"/);
  assert.match(html, /class="voiceprint-management"/);
  assert.doesNotMatch(html, /id="startDesktopAsrButton"/);
  assert.doesNotMatch(html, /id="stopDesktopAsrButton"/);
});

test("声纹页先显示当前步骤提示，并且只展示当前步骤需要的内容", async () => {
  const [app, html] = await Promise.all([
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
  ]);

  assert.ok(html.indexOf('id="voiceprintStatus"') < html.indexOf('id="voiceprintGuide"'));
  assert.match(app, /\$\("voiceprintArchive"\)\.hidden = !config\.voicePrintId/);
  assert.match(app, /\$\("audioDeviceSection"\)\.hidden = !config\.voicePrintConfigured/);
  assert.match(app, /\$\("voiceprintManagement"\)\.hidden = !config\.voicePrintId/);
});

test("录入或验证声纹时，在主操作下方显示录音进度", async () => {
  const [app, html] = await Promise.all([
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
  ]);

  assert.match(html, /id="voiceprintRecordingStatus"/);
  assert.match(app, /function setVoiceprintRecordingStatus\(/);
  assert.match(app, /captureVoiceSample\(6000, setVoiceprintRecordingStatus\)/);
  assert.match(app, /captureVoiceSample\(4000, setVoiceprintRecordingStatus\)/);
});

test("声纹已录入但尚未验证时，仍可重新录入或删除", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");

  assert.match(app, /\$\("voiceprintManagement"\)\.hidden = !config\.voicePrintId/);
  assert.match(app, /\$\("verifyVoiceprintButton"\)\.hidden = guide\.step !== "enabled"/);
});

test("页面等待本地声纹验证结果也有超时，不会无限显示提交中", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");

  assert.match(app, /withTimeout\(fetch\("\/api\/voiceprint\/verify"/);
  assert.match(app, /本地声纹验证超过 15 秒没有返回/);
});
