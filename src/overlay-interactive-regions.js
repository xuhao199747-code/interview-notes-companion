function isUsableRect(rect) {
  return rect && [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) && rect.width > 0 && rect.height > 0;
}

// 收起态的透明浮窗只保留真正可点的控件区域，避免整条工具栏拦截后方窗口。
export function collectOverlayInteractiveRegions(elements = []) {
  return elements
    .filter(Boolean)
    .map((element) => element.getBoundingClientRect())
    .filter(isUsableRect)
    .map(({ x, y, width, height }) => ({ x, y, width, height }));
}
