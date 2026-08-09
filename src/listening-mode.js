export function getListeningMode(provider) {
  return provider === "doubao" || provider === "tencent" ? "desktop" : "browser";
}

export function shouldStopBrowserListening(isBrowserListening, nextProvider) {
  return isBrowserListening && getListeningMode(nextProvider) === "desktop";
}

export function getDesktopStartRedirect(deviceId) {
  if (deviceId) return null;
  return {
    viewId: "settingsView",
    settingsId: "voiceSettings",
    message: "请先刷新并选择桌面会议音频设备"
  };
}
