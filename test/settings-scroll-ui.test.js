import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("设置页内容超出窗口时可以独立纵向滚动", async () => {
  const css = await readFile(new URL("../config.css", import.meta.url), "utf8");
  assert.match(css, /\.workspace\s*\{[^}]*position\s*:\s*relative/s);
  assert.match(css, /#settingsView\s*\{[^}]*position\s*:\s*absolute[^}]*inset\s*:\s*0/s);
  assert.match(css, /\.settings-scroll-content\s*\{[^}]*overflow-y\s*:\s*auto/s);
});

test("设置页页头固定但不增加无用途的额外底色", async () => {
  const css = await readFile(new URL("../config.css", import.meta.url), "utf8");

  assert.match(css, /#settingsView\s+\.settings-sticky-header\s*\{[^}]*background:transparent/s);
});

test("设置导航选中态只有文字色，不使用紫色色块", async () => {
  const css = await readFile(new URL("../config.css", import.meta.url), "utf8");

  assert.match(css, /\.nav-button\.active\s*\{[^}]*color:#c4b5fd[^}]*background:transparent[^}]*border-color:transparent/s);
});

test("设置窗口可通过顶栏空白区域拖动，导航按钮保持可点击", async () => {
  const css = await readFile(new URL("../config.css", import.meta.url), "utf8");

  assert.match(css, /body:not\(\.overlay-mode\)\s+\.topbar\s*\{[^}]*-webkit-app-region:drag/s);
  assert.match(css, /body:not\(\.overlay-mode\)\s+\.topbar\s+button\s*\{[^}]*-webkit-app-region:no-drag/s);
});

test("设置页不再使用最外层大卡片，并收紧内部留白", async () => {
  const css = await readFile(new URL("../config.css", import.meta.url), "utf8");

  assert.match(css, /#settingsView\s*\{[^}]*background:transparent[^}]*border:0[^}]*border-radius:0[^}]*box-shadow:none/s);
  assert.match(css, /#settingsView\s+\.settings-sticky-header\s*\{[^}]*padding:16px 16px 0/s);
  assert.match(css, /#settingsView\s+\.settings-scroll-content\s*\{[^}]*padding:0 16px 16px/s);
});
