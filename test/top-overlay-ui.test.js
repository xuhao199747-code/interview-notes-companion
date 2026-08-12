import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("答题区使用顶部浮层、外部遮罩和历史入口", async () => {
  const [html, app, css] = await Promise.all([
    fs.readFile(new URL("../index.html", import.meta.url), "utf8"),
    fs.readFile(new URL("../app.js", import.meta.url), "utf8"),
    fs.readFile(new URL("../config.css", import.meta.url), "utf8"),
  ]);

  assert.match(html, /id="answerOverlayBackdrop"/);
  assert.match(html, /id="answerOverlay"/);
  assert.match(html, /id="answerOverlayToggle"/);
  assert.match(html, /id="previousAnswerButton"/);
  assert.match(html, /id="overlaySettingsButton"/);
  assert.match(app, /function renderAnswerOverlay\(\)/);
  assert.match(app, /overlaySettingsButton"\)\.addEventListener/);
  assert.match(app, /overlay\.classList\.toggle\("expanded"/);
  assert.match(css, /#answerOverlay\s*\{[^}]*position:\s*fixed[^}]*left:\s*50%/s);
});

test("浮层可切换查看上一题，并在开始新识别时回到当前题", async () => {
  const app = await fs.readFile(new URL("../app.js", import.meta.url), "utf8");

  assert.match(app, /function showPreviousAnswer\(\)/);
  assert.match(app, /function showCurrentAnswer\(\)/);
  assert.match(app, /showCurrentAnswer\(\);[\s\S]*?window\.interviewApp\?\.startQuestionCapture/);
});

test("问题浮层外区域支持透出桌面会议内容", async () => {
  const [electronMain, css] = await Promise.all([
    fs.readFile(new URL("../electron/main.js", import.meta.url), "utf8"),
    fs.readFile(new URL("../config.css", import.meta.url), "utf8"),
  ]);

  assert.match(electronMain, /transparent:\s*true/);
  assert.match(css, /body\.overlay-mode\s*\{[^}]*background:\s*transparent/s);
  assert.match(css, /body\.overlay-mode\s+\.topbar\s*\{[^}]*display:\s*none/s);
});

test("浮层默认置顶，控制条可切换置顶状态", async () => {
  const [html, electronMain, preload, app] = await Promise.all([
    fs.readFile(new URL("../index.html", import.meta.url), "utf8"),
    fs.readFile(new URL("../electron/main.js", import.meta.url), "utf8"),
    fs.readFile(new URL("../electron/preload.cjs", import.meta.url), "utf8"),
    fs.readFile(new URL("../app.js", import.meta.url), "utf8"),
  ]);

  assert.match(html, /id="alwaysOnTopButton"/);
  assert.match(electronMain, /let windowAlwaysOnTop = true/);
  assert.match(electronMain, /windowRef\.setAlwaysOnTop\(windowAlwaysOnTop\)/);
  assert.match(electronMain, /ipcMain\.handle\("window:toggle-always-on-top"/);
  assert.match(preload, /toggleAlwaysOnTop/);
  assert.match(app, /alwaysOnTopButton"\)\.addEventListener/);
});

test("答题窗收起时变成短语音条，展开答案时再向下扩展", async () => {
  const [electronMain, preload, app] = await Promise.all([
    fs.readFile(new URL("../electron/main.js", import.meta.url), "utf8"),
    fs.readFile(new URL("../electron/preload.cjs", import.meta.url), "utf8"),
    fs.readFile(new URL("../app.js", import.meta.url), "utf8"),
  ]);

  assert.match(electronMain, /const overlayWindowSizes = \{[\s\S]*?collapsed: \{ width: 760, height: 64 \}/);
  assert.match(electronMain, /frame:\s*false/);
  assert.match(electronMain, /hasShadow:\s*false/);
  assert.match(electronMain, /ipcMain\.handle\("window:set-overlay-mode"/);
  assert.match(preload, /setOverlayMode/);
  assert.match(app, /function syncOverlayWindow\(\)/);
  assert.match(app, /setOverlayMode\?\.\(state\.answerOverlayExpanded \? "expanded" : "collapsed"\)/);
});

test("收起时保留可点击语音条和全部控制按钮", async () => {
  const [app, css] = await Promise.all([
    fs.readFile(new URL("../app.js", import.meta.url), "utf8"),
    fs.readFile(new URL("../config.css", import.meta.url), "utf8"),
  ]);

  assert.match(app, /\$\("transcriptCard"\)\.addEventListener\("click", \(\) => \{[\s\S]*?if \(!state\.repeatListening && !state\.repeatAwaitingFinal\) void startRepeatQuestion\(\);/);
  assert.doesNotMatch(css, /#answerOverlay:not\(\.expanded\)\s+\.repeat-question-button,[\s\S]*?#answerOverlay:not\(\.expanded\)\s+\.overlay-action\s*\{[^}]*display:\s*none/s);
  assert.match(css, /#answerOverlay:not\(\.expanded\)\s*\{[^}]*background:\s*transparent[^}]*border:\s*0/s);
});

test("展开后点击答案区空白只收起答案主体，语音工具栏保持可见", async () => {
  const app = await fs.readFile(new URL("../app.js", import.meta.url), "utf8");

  assert.match(app, /\$\("answerOverlayBody"\)\.addEventListener\("click", \(event\) => \{[\s\S]*?event\.target\.closest\("\.answer-body, \.document-excerpt, \.result-card p, \.result-card h3, \.result-meta, \.score-bar, \.empty-state, \.source-heading"\)[\s\S]*?state\.answerOverlayExpanded = false/s);
});

test("展开浮层不使用全屏暗色遮罩，左右答案列在同一工作面板内用分隔线区分", async () => {
  const css = await fs.readFile(new URL("../config.css", import.meta.url), "utf8");

  assert.match(css, /\.answer-overlay-backdrop\s*\{[^}]*background:\s*transparent/s);
  assert.match(css, /#answerOverlay\.expanded\s+#answerOverlayBody\s*\{[^}]*background:rgba\(21,30,48,.72\)[^}]*backdrop-filter:blur\(16px\)/s);
  assert.match(css, /#answerOverlay\.expanded\s+\.answer-source\s*\{[^}]*background:\s*transparent[^}]*border:\s*0/s);
  assert.match(css, /#answerOverlay\.expanded\s+\.answer-source\s*\+\s*\.answer-source\s*\{[^}]*border-left:/s);
});

test("外部应用获得点击时收起答案，工具栏保持同宽并以高度动画展开", async () => {
  const [electronMain, preload, app, css] = await Promise.all([
    fs.readFile(new URL("../electron/main.js", import.meta.url), "utf8"),
    fs.readFile(new URL("../electron/preload.cjs", import.meta.url), "utf8"),
    fs.readFile(new URL("../app.js", import.meta.url), "utf8"),
    fs.readFile(new URL("../config.css", import.meta.url), "utf8"),
  ]);

  assert.match(electronMain, /collapsed: \{ width: 760, height: 64 \}[\s\S]*?expanded: \{ width: 760, height: 720 \}/);
  assert.match(electronMain, /if \(mode === "expanded" && !windowRef\.isFocused\(\)\) windowRef\.focus\(\);/);
  assert.match(electronMain, /windowRef\.on\("blur", \(\) => windowRef\.webContents\.send\("overlay:blur"\)\)/);
  assert.match(electronMain, /setInterval\(/);
  assert.doesNotMatch(electronMain, /vibrancy:/);
  assert.match(preload, /onOverlayBlur: \(callback\) => ipcRenderer\.on\("overlay:blur"/);
  assert.match(app, /window\.interviewApp\?\.onOverlayBlur\?\.\(\(\) => \{[\s\S]*?state\.answerOverlayExpanded = false/s);
  assert.match(css, /#answerOverlayBody\s*\{[^}]*display:grid[^}]*height:0[^}]*opacity:0[^}]*transition:/s);
  assert.match(css, /#answerOverlay\.expanded\s+#answerOverlayBody\s*\{[^}]*opacity:1[^}]*transform:translateY\(0\)/s);
});

test("浮层和全局界面使用 Cursor 式炭黑灰与柔和紫色令牌", async () => {
  const [styles, config] = await Promise.all([
    fs.readFile(new URL("../styles.css", import.meta.url), "utf8"),
    fs.readFile(new URL("../config.css", import.meta.url), "utf8"),
  ]);

  assert.match(styles, /--bg:#1e1f22; --panel:#252526; --panel-2:#2b2d31; --text:#f0f0f0; --muted:#a0a0a0; --line:#3c3f41; --accent:#a78bfa;/);
  assert.match(styles, /\/\* Cursor-inspired neutral palette \*\/[\s\S]*?\.nav-button\.active,.nav-button:hover\s*\{[^}]*color:var\(--accent\)/s);
  assert.match(config, /\/\* Cursor palette for the floating answer tool \*\/[\s\S]*?\.repeat-question-button:hover[^}]*border-color:rgba\(167,139,250,.72\)/s);
  assert.match(config, /--overlay-surface:rgba\(43,45,49,.82\); --overlay-line:rgba\(255,255,255,.12\)/);
});

test("展开回答时仅左右正文滚动，网格和工具栏保持固定", async () => {
  const css = await fs.readFile(new URL("../config.css", import.meta.url), "utf8");

  assert.match(css, /#answerOverlay\.expanded\s+#answerOverlayBody\s*\{[^}]*grid-template-rows:minmax\(0,1fr\)/s);
  assert.match(css, /#answerOverlay\.expanded\s+\.answer-source\s*\{[^}]*height:100%/s);
  assert.match(css, /#answerOverlay\.expanded\s+#llmResults\s*\{[^}]*height:auto[^}]*flex:1[^}]*overflow:hidden/s);
  assert.match(css, /#answerOverlay\.expanded\s+#llmResults\s*>\s*\.ai-result\s*\{[^}]*flex:1[^}]*min-height:0[^}]*overflow-y:auto/s);
});

test("顶部浮层的波形和转写文字保持足够对比度", async () => {
  const css = await fs.readFile(new URL("../config.css", import.meta.url), "utf8");

  assert.match(css, /#answerOverlay\s+\.waveform\s*\{[^}]*opacity:\.88/s);
  assert.match(css, /#answerOverlay\s+\.transcript-placeholder\s*\{[^}]*color:#d8d8d8/s);
});

test("顶部图标按钮在固定尺寸内水平和垂直居中", async () => {
  const css = await fs.readFile(new URL("../config.css", import.meta.url), "utf8");

  assert.match(css, /\.overlay-action\.icon\s*\{[^}]*width:40px[^}]*height:40px[^}]*display:grid[^}]*place-items:center[^}]*line-height:1/s);
});

test("可见工具栏就是窗口边界，控制按钮不被转写文本挤掉，并提供原生拖动区域", async () => {
  const [css, html, app, electronMain, preload] = await Promise.all([
    fs.readFile(new URL("../config.css", import.meta.url), "utf8"),
    fs.readFile(new URL("../index.html", import.meta.url), "utf8"),
    fs.readFile(new URL("../app.js", import.meta.url), "utf8"),
    fs.readFile(new URL("../electron/main.js", import.meta.url), "utf8"),
    fs.readFile(new URL("../electron/preload.cjs", import.meta.url), "utf8"),
  ]);

  assert.match(css, /#answerOverlay\s*\{[^}]*top:0[^}]*left:0[^}]*width:100%[^}]*transform:none/s);
  assert.match(css, /#answerOverlay\s+\.listening-row\s*\{[^}]*grid-template-columns:minmax\(180px,1fr\)\s+124px\s+72px\s+40px\s+40px\s+40px/s);
  assert.match(css, /#answerOverlay\s+\.listening-row\s*\{[^}]*overflow:hidden/s);
  assert.match(css, /#answerOverlay\.expanded\s+#answerOverlayBody\s*\{[^}]*height:calc\(100vh - 64px\)/s);
  assert.match(html, /id="voiceRepeatButton"[\s\S]*?id="previousAnswerButton"[\s\S]*?id="answerOverlayToggle"[\s\S]*?id="alwaysOnTopButton"[\s\S]*?id="overlaySettingsButton"/);
  assert.match(electronMain, /ipcMain\.handle\("window:move-overlay-by"/);
  assert.match(preload, /moveOverlayBy: \(deltaX, deltaY\) => ipcRenderer\.invoke\("window:move-overlay-by", deltaX, deltaY\)/);
  assert.match(app, /function setupOverlayWindowDrag\(\)/);
  assert.match(app, /\$\("transcriptCard"\)\.addEventListener\("pointerdown"/);
  assert.match(app, /moveOverlayBy\?\.\(deltaX, deltaY\)/);
});

test("浮层以更强模糊和文字层级保证答案可读", async () => {
  const css = await fs.readFile(new URL("../config.css", import.meta.url), "utf8");

  assert.match(css, /#answerOverlay\.expanded\s+#answerOverlayBody\s*\{[^}]*background:rgba\(43,45,49,.88\)[^}]*backdrop-filter:blur\(24px\)/s);
  assert.match(css, /#answerOverlay\.expanded\s+\.source-heading\s+h3\s*\{[^}]*color:#fff/s);
  assert.match(css, /#answerOverlay\.expanded\s+\.result-card\s+p[^}]*color:#d8d8d8/s);
});
