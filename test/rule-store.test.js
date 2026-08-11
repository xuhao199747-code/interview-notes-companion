import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRuleStore } from "../src/rule-store.js";

test("规则以 Markdown 保存在本机，并可被新版文件替换", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "interview-rules-"));
  const store = createRuleStore(path.join(directory, "answer-rules.json"), { name: "默认规则.md", markdown: "# 默认规则" });
  assert.deepEqual(await store.load(), { name: "默认规则.md", markdown: "# 默认规则" });
  await store.save({ name: "我的规则.md", markdown: "# 我的规则\n不要虚构" });
  assert.deepEqual(await store.load(), { name: "我的规则.md", markdown: "# 我的规则\n不要虚构" });
});
