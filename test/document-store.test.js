import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createDocumentStore } from "../src/document-store.js";

test("资料库写入本地文件并可在新实例中恢复", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "interview-documents-"));
  try {
    const filePath = path.join(directory, "documents.json");
    const documents = [{ name: "术语表.md", type: "glossary", markdown: "## RAG\n别名：IG" }];
    await createDocumentStore(filePath).save(documents);
    assert.deepEqual(await createDocumentStore(filePath).load(), documents);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("上传 Markdown 时按顺序写入本机，并在上传完成前等待最终资料落盘", async () => {
  const app = await (await import("node:fs/promises")).readFile(new URL("../app.js", import.meta.url), "utf8");

  assert.match(app, /let documentSaveQueue = Promise\.resolve\(\)/);
  assert.match(app, /documentSaveQueue = documentSaveQueue\.catch\(\(\) => \{\}\)\.then/);
  assert.match(app, /async function importDocumentFiles[\s\S]*await persistDocuments\(\)/);
});
