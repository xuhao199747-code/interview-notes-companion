import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("桌面端先显示本地启动壳，再后台加载正式应用", async () => {
  const main = await readFile(new URL("../electron/main.js", import.meta.url), "utf8");

  assert.match(main, /await windowRef\.loadFile\(path\.join\(root, "boot\.html"\)\)/);
  assert.doesNotMatch(main, /app\.dock\.show\(\)/);
});

test("本地启动入口打开正式 macOS 应用，不再启动 Terminal 开发进程", async () => {
  const [packageJson, launcher] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../启动面试资料伴侣.command", import.meta.url), "utf8"),
  ]);

  assert.match(packageJson, /"package:mac"\s*:/);
  assert.match(packageJson, /"electron-builder"/);
  assert.match(launcher, /open\s+"\$APP_PATH"/);
  assert.doesNotMatch(launcher, /git pull|npm run desktop/);
});

test("正式应用继续复用统一的本地资料目录", async () => {
  const [main, edition] = await Promise.all([
    readFile(new URL("../electron/main.js", import.meta.url), "utf8"),
    readFile(new URL("../src/edition.js", import.meta.url), "utf8"),
  ]);

  assert.match(main, /getEditionStorageName\(process\.env\.INTERVIEW_EDITION\)/);
  assert.match(edition, /return "interview-notes-companion-local"/);
});
