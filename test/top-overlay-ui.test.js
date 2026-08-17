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

test("置顶按钮在启用状态和悬停状态使用相同的紫色选中样式", async () => {
  const [app, css] = await Promise.all([
    fs.readFile(new URL("../app.js", import.meta.url), "utf8"),
    fs.readFile(new URL("../config.css", import.meta.url), "utf8"),
  ]);

  assert.match(app, /\$\("alwaysOnTopButton"\)\.classList\.add\("active"\);/);
  assert.match(app, /button\.classList\.toggle\("active", enabled\);/);
  assert.match(css, /#alwaysOnTopButton\.active,#alwaysOnTopButton\.active:hover\s*\{[^}]*border-color:var\(--ui-accent\)[^}]*background:var\(--ui-accent-soft\)[^}]*color:#ddd6fe/s);
});

test("识别问题是带 AI 图标的主操作，其余工具按钮使用更轻的次级底色", async () => {
  const [html, css] = await Promise.all([
    fs.readFile(new URL("../index.html", import.meta.url), "utf8"),
    fs.readFile(new URL("../config.css", import.meta.url), "utf8"),
  ]);

  assert.match(html, /id="voiceRepeatButton"[\s\S]*?data-lucide="sparkles"[\s\S]*?识别问题/);
  assert.match(css, /#answerOverlay\s+#voiceRepeatButton\s*\{[^}]*background:rgba\(255,255,255,.06\) !important[^}]*color:#f0f0f0 !important/s);
  assert.match(css, /#answerOverlay\s+#voiceRepeatButton\.active\s*\{[^}]*background:#b9a5ff !important[^}]*color:#1e1f22 !important/s);
  assert.match(css, /#answerOverlay\s+\.overlay-action\s*\{[^}]*background:rgba\(255,255,255,.06\)[^}]*border-color:rgba\(255,255,255,.16\)/s);
});

test("答题窗收起时变成短语音条，展开答案时再向下扩展", async () => {
  const [electronMain, preload, app] = await Promise.all([
    fs.readFile(new URL("../electron/main.js", import.meta.url), "utf8"),
    fs.readFile(new URL("../electron/preload.cjs", import.meta.url), "utf8"),
    fs.readFile(new URL("../app.js", import.meta.url), "utf8"),
  ]);

  assert.match(electronMain, /const overlayWindowSizes = \{[\s\S]*?collapsed: \{ width: 760, height: 52 \}/);
  assert.match(electronMain, /frame:\s*false/);
  assert.match(electronMain, /hasShadow:\s*false/);
  assert.match(electronMain, /ipcMain\.handle\("window:set-overlay-mode"/);
  assert.match(preload, /setOverlayMode/);
  assert.match(app, /function syncOverlayWindow\(\)/);
  assert.match(app, /state\.answerOverlayExpanded \? "expanded" : "collapsed"/);
  assert.match(app, /nextOverlayWindowMode\(syncedOverlayWindowMode, mode\)/);
  assert.match(app, /setOverlayMode\?\.\(nextMode\)/);
});

test("设置页打开后，答案状态刷新不能把窗口重新压回收起高度", async () => {
  const app = await fs.readFile(new URL("../app.js", import.meta.url), "utf8");

  assert.match(app, /function syncOverlayWindow\(\) \{[\s\S]*?document\.querySelector\('\.app-view:not\(\.hidden\)'\)\?\.id === "settingsView"[\s\S]*?nextOverlayWindowMode\(syncedOverlayWindowMode, mode\)[\s\S]*?setOverlayMode\?\.\(nextMode\)/);
});

test("收起时保留明确的识别按钮和全部控制按钮，语音条不会误触发识别", async () => {
  const [app, css] = await Promise.all([
    fs.readFile(new URL("../app.js", import.meta.url), "utf8"),
    fs.readFile(new URL("../config.css", import.meta.url), "utf8"),
  ]);

  assert.match(app, /\$\("voiceRepeatButton"\)\.addEventListener\("click", \(\) => startRepeatQuestion\(\{ source: "button" \}\)\);/);
  assert.match(app, /function setupOverlayWindowDrag\(\)/);
  assert.doesNotMatch(app, /transcriptCard"\)\.addEventListener\("click", startRepeatQuestion/);
  assert.doesNotMatch(css, /#answerOverlay:not\(\.expanded\)\s+\.repeat-question-button,[\s\S]*?#answerOverlay:not\(\.expanded\)\s+\.overlay-action\s*\{[^}]*display:\s*none/s);
  assert.match(css, /#answerOverlay:not\(\.expanded\)\s*\{[^}]*background:\s*transparent[^}]*border:\s*0/s);
  assert.match(css, /body\.overlay-mode:not\(:has\(#answerOverlay\.expanded\)\)\s+\.question-workspace\s*\{[^}]*height:52px[^}]*overflow:hidden[^}]*background:transparent/s);
  assert.match(css, /#answerOverlay:not\(\.expanded\)\s*\{[^}]*height:52px[^}]*overflow:hidden[^}]*box-shadow:none/s);
  assert.match(css, /#answerOverlay:not\(\.expanded\)\s+\.question-toolbar\s*\{[^}]*height:52px[^}]*min-height:52px[^}]*margin:0/s);
  assert.match(css, /#answerOverlay:not\(\.expanded\)\s+\.question-toolbar\s*\{[^}]*box-sizing:border-box/s);
  assert.match(css, /#answerOverlay:not\(\.expanded\)\s+\.live-panel\s*\{[^}]*height:100%[^}]*min-height:0/s);
  assert.match(css, /#answerOverlay:not\(\.expanded\)\s+\.listening-row\s*\{[^}]*height:100%[^}]*min-height:0[^}]*box-sizing:border-box[^}]*padding:5px 6px/s);
  assert.match(css, /#answerOverlay:not\(\.expanded\)\s+\.live-panel\s*\{[^}]*box-shadow:none[^}]*border-radius:0/s);
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

  assert.match(electronMain, /collapsed: \{ width: 760, height: 52 \}[\s\S]*?expanded: \{ width: 760, height: 720 \}/);
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

test("仅在识别中为顶部波形提供动态反馈，并保留按钮图标", async () => {
  const [app, css] = await Promise.all([
    fs.readFile(new URL("../app.js", import.meta.url), "utf8"),
    fs.readFile(new URL("../config.css", import.meta.url), "utf8"),
  ]);

  assert.match(app, /function updateRepeatQuestionButton\(\) \{[\s\S]*?button\.querySelector\("span"\)\.textContent = state\.repeatListening[\s\S]*?\$\("waveform"\)\.classList\.toggle\("is-listening", state\.repeatListening\);/);
  assert.match(css, /#answerOverlay\s+\.waveform\.is-listening\s+i\s*\{[^}]*animation:overlay-wave-pulse/s);
  assert.match(css, /@keyframes overlay-wave-pulse/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test("顶部图标按钮在固定尺寸内水平和垂直居中", async () => {
  const [css, html] = await Promise.all([
    fs.readFile(new URL("../config.css", import.meta.url), "utf8"),
    fs.readFile(new URL("../index.html", import.meta.url), "utf8"),
  ]);

  assert.match(css, /#answerOverlay\s+\.overlay-action\.icon\s*\{[^}]*width:40px[^}]*height:40px[^}]*display:flex !important[^}]*align-items:center[^}]*justify-content:center[^}]*line-height:0/s);
  assert.match(css, /#answerOverlay\s+\.overlay-action\.icon svg\s*\{[^}]*display:block[^}]*width:18px[^}]*height:18px[^}]*margin:0/s);
  assert.match(html, /data-lucide="chevron-up"/);
  assert.match(html, /data-lucide="pin"/);
  assert.match(html, /data-lucide="settings-2"/);
  assert.match(html, /https:\/\/unpkg\.com\/lucide@/);
});

test("可见工具栏就是窗口边界，控制按钮不被转写文本挤掉，并提供原生拖动区域", async () => {
  const [css, html, app, electronMain, preload] = await Promise.all([
    fs.readFile(new URL("../config.css", import.meta.url), "utf8"),
    fs.readFile(new URL("../index.html", import.meta.url), "utf8"),
    fs.readFile(new URL("../app.js", import.meta.url), "utf8"),
    fs.readFile(new URL("../electron/main.js", import.meta.url), "utf8"),
    fs.readFile(new URL("../electron/preload.cjs", import.meta.url), "utf8"),
  ]);

  assert.match(css, /#answerOverlay\s*\{[^}]*top:0[^}]*left:50%[^}]*width:min\(760px,calc\(100vw - 32px\)\)[^}]*transform:translateX\(-50%\)/s);
  assert.match(css, /#answerOverlay\s+\.listening-row\s*\{[^}]*grid-template-columns:minmax\(180px,1fr\)\s+124px\s+72px\s+40px\s+40px\s+40px/s);
  assert.match(css, /#answerOverlay\s+\.listening-row\s*\{[^}]*overflow:hidden/s);
  assert.match(css, /#answerOverlay\.expanded\s+#answerOverlayBody\s*\{[^}]*height:calc\(100vh - 52px\)/s);
  assert.match(css, /#answerOverlay:not\(\.expanded\)\s+#answerOverlayBody\s*\{[^}]*display:none !important/s);
  assert.match(css, /#answerOverlay,#answerOverlay \*\s*\{[^}]*user-select:none !important[^}]*-webkit-user-select:none !important/s);
  assert.match(html, /id="voiceRepeatButton"[\s\S]*?id="previousAnswerButton"[\s\S]*?id="answerOverlayToggle"[\s\S]*?id="alwaysOnTopButton"[\s\S]*?id="overlaySettingsButton"/);
  assert.match(electronMain, /ipcMain\.handle\("window:move-overlay-by"/);
  assert.match(electronMain, /ipcMain\.handle\("window:finish-overlay-drag"/);
  assert.match(preload, /moveOverlayBy: \(deltaX, deltaY\) => ipcRenderer\.invoke\("window:move-overlay-by", deltaX, deltaY\)/);
  assert.match(preload, /finishOverlayDrag: \(mode\) => ipcRenderer\.invoke\("window:finish-overlay-drag", mode\)/);
  assert.match(app, /function setupOverlayWindowDrag\(\)/);
  assert.match(app, /card\.addEventListener\("pointerdown"/);
  assert.match(app, /function finishDrag\(event\) \{[\s\S]*?dragStart = null;[\s\S]*?finishOverlayDrag\?\.\(state\.answerOverlayExpanded \? "expanded" : "collapsed"\)/);
  assert.match(app, /if \(\(event\.buttons & 1\) === 0\) \{\s*finishDrag\(event\);\s*return;\s*\}/);
  assert.match(app, /window\.addEventListener\("pointerup", finishDrag, true\);/);
  assert.match(app, /window\.addEventListener\("blur", finishDrag\);/);
  assert.match(app, /event\.preventDefault\(\);/);
  assert.match(app, /card\.addEventListener\("selectstart", \(event\) => event\.preventDefault\(\)\);/);
  assert.match(app, /window\.getSelection\?\.\(\)\?\.removeAllRanges\?\.\(\);/);
  assert.match(app, /moveOverlayBy\?\.\(deltaX, deltaY\)/);
  assert.match(app, /finishOverlayDrag\?\.\(state\.answerOverlayExpanded \? "expanded" : "collapsed"\)/);
});

test("浮层以更强模糊和文字层级保证答案可读", async () => {
  const css = await fs.readFile(new URL("../config.css", import.meta.url), "utf8");

  assert.match(css, /#answerOverlay\s+\.question-toolbar\s*\{[^}]*backdrop-filter:blur\(30px\)/s);
  assert.match(css, /#answerOverlay\.expanded\s+#answerOverlayBody\s*\{[^}]*background:rgba\(43,45,49,.88\)[^}]*backdrop-filter:blur\(24px\)/s);
  assert.match(css, /#answerOverlay\.expanded\s+\.source-heading\s+h3\s*\{[^}]*color:#fff/s);
  assert.match(css, /#answerOverlay\.expanded\s+\.result-card\s+p[^}]*color:#d8d8d8/s);
});

test("答案展开时按 Esc 仅收起答案内容，顶部工具栏继续保留", async () => {
  const app = await fs.readFile(new URL("../app.js", import.meta.url), "utf8");

  assert.match(app, /if \(event\.key !== "Escape"\) return;\s*if \(!\$\("settingsView"\)\.classList\.contains\("hidden"\)\) \{\s*closeSettings\(\);\s*return;\s*\}\s*if \(!state\.answerOverlayExpanded\) return;\s*state\.answerOverlayExpanded = false;\s*renderAnswerState\(\);/);
});
