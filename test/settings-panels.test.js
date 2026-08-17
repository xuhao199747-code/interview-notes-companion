import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("回答 Skill 面板默认隐藏，直到点击对应设置标签", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /class="settings-panel hidden" id="templateSettings"/);
  assert.match(html, /id="skillCardList"/);
  assert.match(html, /id="glossaryCardList"/);
  assert.doesNotMatch(html, /id="templatePreview"/);
  assert.doesNotMatch(html, /把不需要一直展示的高级功能集中在这里。/);
});

test("资料转换 Skill 独立于资料管理，并为每个已上传转换 Skill 创建顶部标签", async () => {
  const [html, app] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../app.js", import.meta.url), "utf8"),
  ]);

  assert.match(html, /data-settings="converterSkillsSettings">资料转换 Skill/);
  assert.match(html, /id="converterSkillFileInput"/);
  assert.match(html, /id="converterSkillCardList"/);
  assert.match(app, /type === "converter-skill"/);
  assert.match(app, /function renderConverterSkillTabs\(\)/);
  assert.match(app, /data-converter-skill/);
  assert.match(app, /async function importConverterSkillFiles/);
  const css = await readFile(new URL("../config.css", import.meta.url), "utf8");
  assert.match(css, /#converterSkillTabs\s*\{\s*display:contents;/);
});

test("资料转换 Skill 要求原文保真、来源可追溯且禁止静默改写", async () => {
  const { readFile } = await import("node:fs/promises");
  const skill = await readFile(new URL("../assets/原始文档转Markdown资料Skill.md", import.meta.url), "utf8");

  for (const requirement of ["完整原文", "来源链接", "修订号", "历史快照", "不得删除", "不得改写", "图片、图表和流程图"]) {
    assert.match(skill, new RegExp(requirement), `资料转换 Skill 缺少：${requirement}`);
  }
  assert.doesNotMatch(skill, /删除重复段落/);
});

test("当前术语表文件不在资料管理列表重复展示", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");

  assert.match(app, /const documents = state\.documents\.filter\(\(doc\) => doc\.type !== "skill" && doc\.type !== "converter-skill" && doc\.name !== state\.glossaryFileName\);/);
  assert.match(app, /renderRetrievalSettings\(\);/);
});

test("设置中的文件卡片点击后统一在预览弹窗中查看，不默认铺开规则正文", async () => {
  const [html, app] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../app.js", import.meta.url), "utf8"),
  ]);
  assert.match(html, /id="documentPreviewModal"/);
  assert.match(html, /id="documentPreviewContent"/);
  assert.match(app, /function openDocumentPreview\(/);
  assert.match(app, /data-preview-doc/);
  assert.match(app, /data-preview-kind="rules"/);
  assert.doesNotMatch(app, /<details class="rules-preview">/);
});

test("设置标签统一为透明底色和紫色底部细线", async () => {
  const css = await readFile(new URL("../config.css", import.meta.url), "utf8");

  assert.match(css, /\.settings-tab\.active,\.settings-tab:hover\s*\{[^}]*color:#c4b5fd[^}]*background:transparent[^}]*border-color:transparent[^}]*border-bottom-color:var\(--ui-accent\)/s);
});

test("所有设置文件卡片使用统一窄卡片，不因只有一项而撑满整行", async () => {
  const css = await readFile(new URL("../config.css", import.meta.url), "utf8");

  assert.match(css, /\.knowledge-grid\s*\{[^}]*grid-template-columns:repeat\(auto-fill,minmax\(0,340px\)\)/s);
  assert.doesNotMatch(css, /#glossaryCardList,#skillCardList,#rulesCardList\s*\{[^}]*grid-template-columns:minmax\(0,1fr\)/s);
});

test("所有设置文件卡片统一提供下载与删除操作", async () => {
  const [app, server] = await Promise.all([
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../server.js", import.meta.url), "utf8"),
  ]);

  const skillRenderer = app.slice(app.indexOf("function renderSkillCards"), app.indexOf("function converterSkillPanelId"));
  const rulesRenderer = app.slice(app.indexOf("function renderRulesSettings"), app.indexOf("function openDocumentPreview"));
  const glossaryRenderer = app.slice(app.indexOf("function renderRetrievalSettings"), app.indexOf("function deleteGlossary"));
  assert.match(skillRenderer, /download-doc large/);
  assert.match(skillRenderer, /delete-doc large/);
  assert.match(rulesRenderer, /download-rules/);
  assert.match(rulesRenderer, /delete-rules/);
  assert.match(glossaryRenderer, /download-glossary/);
  assert.match(glossaryRenderer, /delete-glossary large/);
  assert.match(app, /function downloadGlossary\(\)/);
  assert.match(app, /async function deleteRules\(\)/);
  assert.match(server, /request\.method === "DELETE" && request\.url === "\/api\/rules"/);
});

test("设置页可通过左上角关闭按钮或 Esc 返回问题页", async () => {
  const [html, app] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../app.js", import.meta.url), "utf8"),
  ]);

  assert.match(html, /id="closeSettingsButton"/);
  assert.match(app, /function closeSettings\(\) \{[\s\S]*?data-view="questionView"/);
  assert.match(app, /\$\("closeSettingsButton"\)\.addEventListener\("click", closeSettings\);/);
  assert.match(app, /document\.addEventListener\("keydown", \(event\) => \{[\s\S]*?event\.key !== "Escape"[\s\S]*?closeSettings\(\);/);
});

test("语音服务选择器不占用整行无效空白", async () => {
  const css = await readFile(new URL("../config.css", import.meta.url), "utf8");

  assert.match(css, /#asrProvider\s*\{[^}]*width:min\(100%,520px\)/s);
});
