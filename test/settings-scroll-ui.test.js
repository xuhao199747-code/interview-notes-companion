import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("设置页内容超出窗口时可以独立纵向滚动", async () => {
  const css = await readFile(new URL("../config.css", import.meta.url), "utf8");
  assert.match(css, /\.workspace\s*\{[^}]*position\s*:\s*relative/s);
  assert.match(css, /#settingsView\s*\{[^}]*position\s*:\s*absolute[^}]*inset\s*:\s*0/s);
  assert.match(css, /\.settings-scroll-content\s*\{[^}]*overflow-y\s*:\s*auto/s);
});
