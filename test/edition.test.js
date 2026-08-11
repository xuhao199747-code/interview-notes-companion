import test from "node:test";
import assert from "node:assert/strict";
import { getEditionStorageName } from "../src/edition.js";

test("所有启动入口使用同一份本地资料目录，避免配置在刷新后看起来丢失", () => {
  assert.equal(getEditionStorageName("release"), "interview-notes-companion-local");
  assert.equal(getEditionStorageName("local"), "interview-notes-companion-local");
});
