import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8"),
  readFile(new URL("../config.css", import.meta.url), "utf8"),
  readFile(new URL("../modal.css", import.meta.url), "utf8"),
]);

const [html, styles, config, modal] = files;
const app = await readFile(new URL("../app.js", import.meta.url), "utf8");

test("共享 UI Token 集中定义在基础样式中", () => {
  assert.match(styles, /--space-1:6px/);
  assert.match(styles, /--space-4:24px/);
  assert.match(styles, /--radius-control:6px/);
  assert.match(styles, /--radius-panel:12px/);
  assert.doesNotMatch(config, /:root\s*\{[^}]*--ui-surface/s);
});

test("文件卡片与设置 Tab 使用统一组件约束", () => {
  assert.match(styles, /\.knowledge-card-actions\s*\{[^}]*gap:var\(--space-2\)/s);
  assert.match(styles, /\.settings-tab\s*\{[^}]*min-height:40px/s);
  assert.match(styles, /\.text-action\s*\{/);
});

test("回答区只保留中文层级且两个结果区各自管理滚动", () => {
  assert.doesNotMatch(`${html}\n${app}`, /LLM GENERATED|AI GENERATED/);
  assert.match(config, /#documentResults\s*\{[^}]*overflow-y:auto/s);
  assert.match(config, /#llmResults\s*\{[^}]*overflow:hidden/s);
});

test("浮层、设置页与编辑弹窗使用统一圆角 Token", () => {
  assert.match(config, /#answerOverlay\s*\{[^}]*border-radius:var\(--radius-panel\)/s);
  assert.match(config, /\.settings-scroll-content\s*\{[^}]*overflow-y:auto/s);
  assert.match(modal, /\.editor-modal-card\s*\{[^}]*border-radius:var\(--radius-panel\)/s);
});

test("桌面问题页与设置页复用同一套紧凑间距 Token", () => {
  assert.match(config, /:root\s*\{[^}]*--desktop-gutter:16px[^}]*--desktop-gap:10px[^}]*--desktop-panel-padding:12px/s);
  assert.match(config, /\.answer-source\s*\{[^}]*padding:var\(--desktop-panel-padding\)/s);
  assert.match(config, /#settingsView \.settings-scroll-content\s*\{[^}]*padding:0 var\(--desktop-gutter\) var\(--desktop-gutter\)/s);
});
