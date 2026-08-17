import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("服务端提供本地语义检索接口，并在保存资料时预建索引", async () => {
  const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
  assert.match(server, /POST" && request\.url === "\/api\/retrieve"/);
  assert.match(server, /semanticIndex\.index\(sectionsFromDocuments/);
  assert.match(server, /semanticIndex\.search\(semanticQueryFor\(query\), sections/);
});

test("回答 Skill 和资料转换 Skill 不参与服务端语义索引", async () => {
  const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
  assert.match(server, /document\?\.type !== "skill" && document\?\.type !== "converter-skill"/);
});

test("桌面端将 ONNX 语义模型移到独立 Node Worker，而不是关闭语义召回", async () => {
  const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
  const worker = await readFile(new URL("../src/semantic-worker-client.js", import.meta.url), "utf8");
  assert.match(server, /createSemanticWorkerClient/);
  assert.match(worker, /ELECTRON_RUN_AS_NODE: "1"/);
  assert.match(worker, /semantic-worker\.js/);
});

test("桌面端启动后延迟预建全量语义索引，避免首屏和模型初始化抢占 CPU", async () => {
  const server = await readFile(new URL("../server.js", import.meta.url), "utf8");

  assert.match(server, /const startupSemanticIndexDelayMs = 3000;/);
  assert.match(server, /setTimeout\(\(\) => \{[\s\S]*?semanticIndex\.index\(sectionsFromDocuments\(documents\)\)[\s\S]*?\}, startupSemanticIndexDelayMs\)/);
});

test("语义 Worker 出错时接口返回显式降级状态，而不是伪装成空结果", async () => {
  const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
  assert.match(server, /semantic = \{ available: false, error: error\.message \}/);
});

test("口语省略问法在进入向量模型前补充检索意图锚点", async () => {
  const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
  assert.match(server, /function semanticQueryFor/);
  assert.match(server, /自我介绍 个人经历 职业背景 核心优势 项目经历/);
  assert.match(server, /semanticIndex\.search\(semanticQueryFor\(query\), sections/);
});

test("检索意图锚点覆盖知识库、评测、高风险和项目概览等常见漏检问法", async () => {
  const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
  assert.match(server, /Metadata 混合召回 Rerank 引用 评测/);
  assert.match(server, /置信度 拒答 人工接管 审计/);
  assert.match(server, /Rubric Bad Case Trace 回归集/);
  assert.match(server, /业务问题 用户痛点 产品方案 技术架构/);
});
