// 流式回答会频繁重绘内容，但 BrowserWindow 只应在模式真正变化时调整尺寸。
export function nextOverlayWindowMode(previousMode, desiredMode) {
  // 收起/紧凑态需要反复确认原生窗口的尺寸和命中区域。DOM 状态可能已经
  // 收起，但 macOS 的透明 BrowserWindow 仍保留上一帧的高度；这时不能
  // 因为模式字符串相同就跳过 IPC 同步。
  if (desiredMode === "collapsed" || desiredMode === "compact") return desiredMode;
  return previousMode === desiredMode ? null : desiredMode;
}
