import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("桌面端使用 CommonJS 预加载脚本暴露监听桥接", async () => {
  const preload = await readFile(new URL("../electron/preload.cjs", import.meta.url), "utf8");
  assert.match(preload, /require\("electron"\)/);
  assert.match(preload, /exposeInMainWorld\("interviewApp"/);
  assert.match(preload, /startAsr/);
});
