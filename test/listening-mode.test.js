import test from "node:test";
import assert from "node:assert/strict";
import { getDesktopStartRedirect, getListeningMode, shouldStopBrowserListening } from "../src/listening-mode.js";

test("选择云端语音提供商时，主监听入口必须指向桌面监听", () => {
  assert.equal(getListeningMode("doubao"), "desktop");
  assert.equal(getListeningMode("tencent"), "desktop");
  assert.equal(getListeningMode("browser"), "browser");
});

test("切换到云端语音服务时必须停止旧的浏览器监听", () => {
  assert.equal(shouldStopBrowserListening(true, "doubao"), true);
  assert.equal(shouldStopBrowserListening(true, "tencent"), true);
  assert.equal(shouldStopBrowserListening(true, "browser"), false);
  assert.equal(shouldStopBrowserListening(false, "doubao"), false);
});

test("未选择桌面音频设备时，主监听入口应跳转到声纹设置", () => {
  assert.deepEqual(getDesktopStartRedirect(""), {
    viewId: "settingsView",
    settingsId: "voiceSettings",
    message: "请先刷新并选择桌面会议音频设备"
  });
  assert.equal(getDesktopStartRedirect("virtual-device"), null);
});
