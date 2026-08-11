import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("切换 Mac 桌面后，窗口跟随桌面且后台识别不降速", async () => {
  const main = await readFile(new URL("../electron/main.js", import.meta.url), "utf8");

  assert.match(main, /backgroundThrottling:\s*false/);
  assert.match(main, /setVisibleOnAllWorkspaces\(true,\s*\{\s*visibleOnFullScreen:\s*false\s*\}\)/);
  assert.match(main, /windowRef\.setAlwaysOnTop\(windowAlwaysOnTop\)/);
  assert.match(main, /webContents\.setBackgroundThrottling\(false\)/);
  assert.match(main, /disable-background-timer-throttling/);
  assert.match(main, /disable-backgrounding-occluded-windows/);
});
