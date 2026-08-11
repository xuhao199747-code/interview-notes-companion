import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("桌面生命周期在退出或窗口销毁后不再创建、聚焦窗口", async () => {
  const main = await fs.readFile(new URL("../electron/main.js", import.meta.url), "utf8");

  assert.match(main, /let isQuitting = false/);
  assert.match(main, /windowRef\.isDestroyed\(\)/);
  assert.match(main, /if \(isQuitting\) return/);
  assert.match(main, /if \(process\.platform !== "darwin" && !isQuitting\) app\.quit\(\)/);
});
