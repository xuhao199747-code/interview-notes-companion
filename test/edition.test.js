import test from "node:test";
import assert from "node:assert/strict";
import { getEditionStorageName } from "../src/edition.js";

test("正式版和本地版使用独立的数据目录", () => {
  assert.equal(getEditionStorageName("release"), "interview-notes-companion");
  assert.equal(getEditionStorageName("local"), "interview-notes-companion-local");
});
