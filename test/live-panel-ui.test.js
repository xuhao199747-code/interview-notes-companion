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

test("识别问题按钮与转写框同一行，且不再显示实时问题标题", async () => {
  const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /class="listening-row"[\s\S]*id="transcriptCard"[\s\S]*id="voiceRepeatButton"/);
  assert.doesNotMatch(html, /id="micButton"/);
  assert.doesNotMatch(html, /<h2>实时问题<\/h2>/);
});

test("文档库和 LLM 回答在各自内容框内滚动，不再使用外层结果框", async () => {
  const [html, css] = await Promise.all([
    fs.readFile(new URL("../index.html", import.meta.url), "utf8"),
    fs.readFile(new URL("../config.css", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(html, /results-panel|answer-status|id="matchLabel"/);
  assert.match(css, /\.current-answer-grid\s*\{[^}]*flex\s*:\s*1[^}]*min-height\s*:\s*0/s);
  assert.match(css, /\.answer-source\s+\.results-list\s*\{[^}]*overflow-y\s*:\s*auto/s);
});

test("两列回答区的标题压缩为单行，优先留出正文空间", async () => {
  const css = await fs.readFile(new URL("../config.css", import.meta.url), "utf8");

  assert.match(css, /\.answer-source\s+\.source-heading\s*\{[^}]*display\s*:\s*flex[^}]*align-items\s*:\s*center/s);
  assert.match(css, /\.answer-source\s+\.source-heading\s+h3\s*\{[^}]*margin\s*:\s*0/s);
  assert.match(css, /\.answer-source\s+\.source-heading\s*\{[^}]*margin-bottom\s*:\s*8px/s);
});

test("上一题通过顶部控制条查看，并保留文档与 LLM 两列回答", async () => {
  const [html, app] = await Promise.all([
    fs.readFile(new URL("../index.html", import.meta.url), "utf8"),
    fs.readFile(new URL("../app.js", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(html, /03\s*\/\s*PREPARED ANSWERS|<h2>准备内容<\/h2>/);
  assert.match(html, /id="previousAnswerButton"/);
  assert.match(app, /function showPreviousAnswer\(\)/);
  assert.match(app, /function showCurrentAnswer\(\)/);
});

test("顶部导航不使用深色底板，并保持紧凑高度", async () => {
  const css = await fs.readFile(new URL("../config.css", import.meta.url), "utf8");

  assert.match(css, /\.topbar\s*\{[^}]*height\s*:\s*62px[^}]*background\s*:\s*transparent[^}]*backdrop-filter\s*:\s*none/s);
});

test("默认答题视图不再显示页面标题，只保留隐藏的数据计数", async () => {
  const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /<span id="docCount" class="hidden">0<\/span>/);
  assert.doesNotMatch(html, /workspace-title/);
  assert.doesNotMatch(html, /INTERVIEW WORKSPACE|source-count/);
});

test("当前问题不再显示等待问题状态栏", async () => {
  const [html, app] = await Promise.all([
    fs.readFile(new URL("../index.html", import.meta.url), "utf8"),
    fs.readFile(new URL("../app.js", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(html, /等待问题|matchLabel/);
  assert.doesNotMatch(app, /\$\("matchLabel"\)/);
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

test("窄窗口下设置页脱离已隐藏问题页的高度约束", async () => {
  const css = await fs.readFile(new URL("../config.css", import.meta.url), "utf8");

  assert.match(css, /@media\s*\(max-width:700px\)\s*\{[\s\S]*?#settingsView\s*\{[^}]*position:\s*fixed[^}]*inset:\s*62px\s+var\(--compact-page-gutter\)\s+0/s);
});

test("桌面窗口启动时保持紧凑工具条尺寸，并可收窄至 460px", async () => {
  const electronMain = await fs.readFile(new URL("../electron/main.js", import.meta.url), "utf8");

  assert.match(electronMain, /width:\s*760/);
  assert.match(electronMain, /minWidth:\s*460/);
});

test("主页面和回答卡片使用统一的紧凑边距", async () => {
  const css = await fs.readFile(new URL("../config.css", import.meta.url), "utf8");

  assert.match(css, /--compact-page-gutter:\s*24px/);
  assert.match(css, /\.app-shell\s*\{[^}]*padding:\s*0\s+var\(--compact-page-gutter\)/s);
  assert.match(css, /\.answer-source\s*\{[^}]*padding:\s*10px\s+12px/s);
});

test("两列回答区域填满问题工作区的剩余高度", async () => {
  const css = await fs.readFile(new URL("../config.css", import.meta.url), "utf8");

  assert.match(css, /\.workspace\s*\{[^}]*height:\s*calc\(100vh\s*-\s*62px\)/s);
  assert.match(css, /\.question-workspace\s*\{[^}]*grid-template-rows:\s*auto\s+minmax\(0,1fr\)/s);
  assert.match(css, /\.current-answer-grid\s*\{[^}]*height:\s*100%/s);
});

test("LLM 回答只在橙色回答卡内滚动", async () => {
  const css = await fs.readFile(new URL("../config.css", import.meta.url), "utf8");

  assert.match(css, /\.question-workspace\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.current-answer-grid\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(css, /#llmResults\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(css, /#llmResults\s*>\s*\.ai-result\s*\{[^}]*height:\s*100%[^}]*overflow-y:\s*auto/s);
});

test("当前两栏只保留中文标题和正文，不再嵌套生成卡片", async () => {
  const [html, app, css] = await Promise.all([
    fs.readFile(new URL("../index.html", import.meta.url), "utf8"),
    fs.readFile(new URL("../app.js", import.meta.url), "utf8"),
    fs.readFile(new URL("../config.css", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(html, /source-heading"><span class="section-kicker">(?:DOCUMENT LIBRARY|LLM GENERATED)/);
  assert.doesNotMatch(app, /AI GENERATED|基于当前资料|<div class="result-meta">/);
  assert.match(app, /<article class="ai-result"><div class="answer-body">/);
  assert.match(css, /#llmResults > \.ai-result\s*\{[^}]*border:\s*0[^}]*background:\s*transparent/s);
});
