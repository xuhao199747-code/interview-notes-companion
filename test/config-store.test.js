import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createConfigStore } from "../src/config-store.js";

test("语音配置写入本地文件后可以在刷新/重启时恢复", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "interview-config-"));
  const store = createConfigStore(path.join(directory, "asr-config.json"));
  const config = {
    asrProvider: "tencent",
    tencentRegion: "ap-guangzhou",
    tencentAppId: "1234567890",
    tencentSecretId: "secret-id",
    tencentSecretKey: "secret-key"
  };

  await store.save(config);
  const reloaded = createConfigStore(path.join(directory, "asr-config.json"));
  assert.deepEqual(await reloaded.load(), {
    ...config,
    doubaoAppId: "",
    doubaoAccessToken: "",
    doubaoResourceId: "",
    doubaoEndpoint: "wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async",
    aiApiUrl: "https://api.openai.com/v1/chat/completions",
    aiModel: "gpt-4o-mini",
    aiApiKey: "",
    questionCaptureHotkey: "Alt+Space"
  });
});

test("旧声纹字段不会在保存后继续写入本地配置", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "interview-config-cleanup-"));
  const filePath = path.join(directory, "app-config.json");
  const store = createConfigStore(filePath);

  await store.save({ questionHotkey: "Alt+Q", voiceprintEnabled: true, voicePrintId: "legacy" });

  const raw = JSON.parse(await fs.readFile(filePath, "utf8"));
  assert.equal(raw.questionCaptureHotkey, "Alt+Q");
  assert.equal("questionHotkey" in raw, false);
  assert.equal("voiceprintEnabled" in raw, false);
  assert.equal("voicePrintId" in raw, false);
});

test("LLM 配置也会持久化", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "interview-llm-"));
  const store = createConfigStore(path.join(directory, "app-config.json"));
  await store.save({ aiApiUrl: "https://example.com/v1/chat/completions", aiModel: "demo-model", aiApiKey: "local-key" });
  const saved = await store.load();
  assert.equal(saved.aiApiUrl, "https://example.com/v1/chat/completions");
  assert.equal(saved.aiModel, "demo-model");
  assert.equal(saved.aiApiKey, "local-key");
});
