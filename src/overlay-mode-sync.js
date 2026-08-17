// 流式回答会频繁重绘内容，但 BrowserWindow 只应在模式真正变化时调整尺寸。
export function nextOverlayWindowMode(previousMode, desiredMode) {
  return previousMode === desiredMode ? null : desiredMode;
}
