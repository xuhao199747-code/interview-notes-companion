export function getDesktopControlState({ listening, starting, isDesktop = true }) {
  if (!isDesktop) return { label: "请切换到桌面端", active: false, disabled: false };
  if (starting) return { label: "正在开启全程监听…", active: true, disabled: true };
  if (listening) return { label: "全程监听中 · 点击结束", active: true, disabled: false };
  return { label: "开启全程监听", active: false, disabled: false };
}
