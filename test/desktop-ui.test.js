import test from "node:test";
import assert from "node:assert/strict";
import { getDesktopControlState } from "../src/desktop-ui.js";

test("桌面监听连接中时主按钮应显示明确状态", () => {
  assert.deepEqual(getDesktopControlState({ listening: false, starting: true }), { label: "正在开启全程监听…", active: true, disabled: true });
  assert.deepEqual(getDesktopControlState({ listening: true, starting: false }), { label: "全程监听中 · 点击结束", active: true, disabled: false });
  assert.deepEqual(getDesktopControlState({ listening: false, starting: false }), { label: "开启全程监听", active: false, disabled: false });
});

test("浏览器页面不能伪装成可启动桌面监听", () => {
  assert.deepEqual(getDesktopControlState({ listening: false, starting: false, isDesktop: false }), { label: "请切换到桌面端", active: false, disabled: false });
});
