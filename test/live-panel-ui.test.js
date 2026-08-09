import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("实时问题工具栏从内容区顶部开始紧凑排列", async () => {
  const css = await fs.readFile(new URL("../config.css", import.meta.url), "utf8");

  assert.match(css, /\.workspace\s*\{[^}]*padding\s*:\s*8px\s+0\s+12px/s);
  assert.match(css, /\.question-toolbar\s*\{[^}]*position\s*:\s*static/s);
  assert.match(css, /\.question-toolbar\s+\.live-panel\s*\{[^}]*min-height\s*:\s*0/s);
  assert.match(css, /\.question-toolbar\s+\.transcript-card\s*\{[^}]*min-height\s*:\s*38px/s);
});

test("监听按钮与转写框同一行，且不再显示实时问题标题", async () => {
  const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /class="listening-row"[\s\S]*id="transcriptCard"[\s\S]*id="micButton"/);
  assert.doesNotMatch(html, /<h2>实时问题<\/h2>/);
});

test("文档库和 LLM 回答在各自内容框内滚动", async () => {
  const css = await fs.readFile(new URL("../config.css", import.meta.url), "utf8");

  assert.match(css, /\.results-panel\s*\{[^}]*flex\s*:\s*1[^}]*min-height\s*:\s*0[^}]*overflow\s*:\s*hidden/s);
  assert.match(css, /\.answer-source\s+\.results-list\s*\{[^}]*overflow-y\s*:\s*auto/s);
});

test("上一题默认折叠，展开后保留文档与 LLM 两列回答", async () => {
  const [html, app] = await Promise.all([
    fs.readFile(new URL("../index.html", import.meta.url), "utf8"),
    fs.readFile(new URL("../app.js", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(html, /03\s*\/\s*PREPARED ANSWERS|<h2>准备内容<\/h2>/);
  assert.match(app, /function renderPreviousAnswer\(previous\)/);
  assert.match(app, /previous-answer-toggle/);
  assert.match(app, /previous-answer-label/);
  assert.match(app, /previous-answer-copy/);
  assert.match(app, /previousAnswer\.classList\.toggle\("expanded"/);
});

test("顶部导航不使用深色底板，并保持紧凑高度", async () => {
  const css = await fs.readFile(new URL("../config.css", import.meta.url), "utf8");

  assert.match(css, /\.topbar\s*\{[^}]*height\s*:\s*62px[^}]*background\s*:\s*transparent[^}]*backdrop-filter\s*:\s*none/s);
});

test("左侧工具栏只显示面试问题主标题", async () => {
  const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /<div class="workspace-title"><h1>面试问题<span id="docCount" class="hidden">0<\/span><\/h1><\/div>/);
  assert.doesNotMatch(html, /INTERVIEW WORKSPACE|source-count/);
});

test("回答状态文字贴左并在状态栏内垂直居中", async () => {
  const css = await fs.readFile(new URL("../config.css", import.meta.url), "utf8");

  assert.match(css, /\.answer-status\s*\{[^}]*justify-content\s*:\s*flex-start[^}]*align-items\s*:\s*center/s);
});

test("设置页标题与分类标签固定在顶部，内容在独立区域滚动", async () => {
  const [html, css] = await Promise.all([
    fs.readFile(new URL("../index.html", import.meta.url), "utf8"),
    fs.readFile(new URL("../config.css", import.meta.url), "utf8"),
  ]);

  assert.match(html, /<div class="settings-sticky-header">[\s\S]*?<div class="settings-tabs">/);
  assert.match(html, /<div class="settings-scroll-content">[\s\S]*?id="knowledgeSettings"/);
  assert.match(css, /#settingsView\s*\{[^}]*overflow\s*:\s*hidden/s);
  assert.match(css, /\.settings-scroll-content\s*\{[^}]*overflow-y\s*:\s*auto/s);
});
