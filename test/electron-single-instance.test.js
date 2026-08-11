import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("桌面端拒绝重复启动，并聚焦已打开的窗口", async () => {
  const main = await fs.readFile(new URL("../electron/main.js", import.meta.url), "utf8");

  assert.match(main, /app\.requestSingleInstanceLock\(\)/);
  assert.match(main, /app\.on\("second-instance"/);
  assert.match(main, /windowRef\.focus\(\)/);
});

test("切换桌面时跟随桌面显示并保持后台识别", async () => {
  const main = await fs.readFile(new URL("../electron/main.js", import.meta.url), "utf8");

  assert.match(main, /windowRef\.setVisibleOnAllWorkspaces\(true,\s*\{\s*visibleOnFullScreen:\s*false\s*\}\)/);
  assert.match(main, /windowRef\.setAlwaysOnTop\(windowAlwaysOnTop\)/);
  assert.match(main, /windowRef\.webContents\.setBackgroundThrottling\(false\)/);
  assert.match(main, /backgroundThrottling: false/);
});
