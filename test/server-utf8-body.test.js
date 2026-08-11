import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("服务端将完整请求字节拼接后再解析，避免中文跨分块变成乱码", async () => {
  const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
  assert.match(server, /Buffer\.concat\(chunks\)\.toString\("utf8"\)/);
  assert.doesNotMatch(server, /for await \(const chunk of request\) body \+= chunk/);
});
