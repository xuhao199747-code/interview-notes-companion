import { app, BrowserWindow, ipcMain, session, globalShortcut, screen } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAsrSession, validateAsrProviderConfig } from "../src/asr-provider.js";
import { getEditionStorageName } from "../src/edition.js";

// macOS 切换 Space 或被其他窗口遮挡时，Chromium 仍可能进行额外的后台节流。
// 这个窗口在用户明确开始一次识别后才会采音，因此优先保证该短时链路不断帧。
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");
const root = path.dirname(fileURLToPath(import.meta.url));
app.setPath("userData", path.join(app.getPath("appData"), getEditionStorageName(process.env.INTERVIEW_EDITION)));
process.env.INTERVIEW_DATA_DIR = app.getPath("userData");
const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) app.quit();
let windowRef;
let localServer;
let questionCaptureSession;
let getRuntimeConfig;
let startServer;
let activeQuestionHotkey = null;
let activePreviousAnswerHotkey = null;
let activeQuestionCaptureId = 0;
let activeQuestionCaptureAudioFrames = 0;
let questionCaptureRendererReady = false;
let pendingQuestionCaptureHotkey = false;
let isQuitting = false;
let windowAlwaysOnTop = true;
let overlayWindowResizeTimer = null;
const overlayWindowSizes = {
  collapsed: { width: 760, height: 64 },
  expanded: { width: 760, height: 720 },
  settings: { width: 760, height: 800 },
};

function setOverlayWindowMode(mode) {
  if (!windowRef || windowRef.isDestroyed()) return false;
  const size = overlayWindowSizes[mode] || overlayWindowSizes.collapsed;
  if (mode === "expanded" && !windowRef.isFocused()) windowRef.focus();
  const display = screen.getDisplayMatching(windowRef.getBounds());
  const { x, y, width } = display.workArea;
  const targetBounds = { x: Math.round(x + (width - size.width) / 2), y: y + 12, ...size };
  if (overlayWindowResizeTimer) clearInterval(overlayWindowResizeTimer);
  if (mode === "settings") {
    windowRef.setBounds(targetBounds);
    return true;
  }
  const initialBounds = windowRef.getBounds();
  const startedAt = Date.now();
  const duration = 180;
  const animate = () => {
    if (!windowRef || windowRef.isDestroyed()) return;
    const progress = Math.min(1, (Date.now() - startedAt) / duration);
    const eased = 1 - (1 - progress) ** 3;
    windowRef.setBounds({
      ...targetBounds,
      height: Math.round(initialBounds.height + (targetBounds.height - initialBounds.height) * eased),
    });
    if (progress === 1 && overlayWindowResizeTimer) {
      clearInterval(overlayWindowResizeTimer);
      overlayWindowResizeTimer = null;
    }
  };
  animate();
  overlayWindowResizeTimer = setInterval(animate, 16);
  return true;
}

app.on("second-instance", () => {
  if (isQuitting || !windowRef || windowRef.isDestroyed()) return;
  if (windowRef.isMinimized()) windowRef.restore();
  windowRef.show();
  windowRef.focus();
});

function updateQuestionCaptureHotkey(hotkey) {
  if (activeQuestionHotkey) globalShortcut.unregister(activeQuestionHotkey);
  activeQuestionHotkey = null;
  const accelerator = hotkey || "Alt+Space";
  // 识别问题快捷键必须启动独立的一次性复述识别，不能再走已废弃的全程监听提交事件。
  const registered = globalShortcut.register(accelerator, () => {
    // BrowserWindow 已显示不代表 renderer 已完成事件监听注册。首次启动时把
    // 早到的快捷键暂存，等页面显式报告就绪后再投递，避免必须先鼠标点击一次。
    if (!questionCaptureRendererReady) {
      pendingQuestionCaptureHotkey = true;
      return;
    }
    if (windowRef && !windowRef.isDestroyed()) windowRef.webContents.send("question-capture:hotkey");
  });
  if (registered) activeQuestionHotkey = accelerator;
  return registered ? { ok: true, hotkey: accelerator } : { ok: false, error: `${accelerator} 被其他应用占用，请更换快捷键后重试` };
}

function updatePreviousAnswerHotkey(hotkey) {
  if (activePreviousAnswerHotkey) globalShortcut.unregister(activePreviousAnswerHotkey);
  activePreviousAnswerHotkey = null;
  const accelerator = hotkey || "Alt+P";
  const registered = globalShortcut.register(accelerator, () => windowRef?.webContents.send("previous-answer:hotkey"));
  if (registered) activePreviousAnswerHotkey = accelerator;
  return registered ? { ok: true, hotkey: accelerator } : { ok: false, error: `${accelerator} 被其他应用占用，请更换快捷键后重试` };
}

async function createWindow() {
  if (isQuitting || (windowRef && !windowRef.isDestroyed())) return;
  if (!startServer) ({ getRuntimeConfig, startServer } = await import("../server.js"));
  if (isQuitting) return;
  localServer ||= await startServer(0);
  if (isQuitting) return;
  const address = localServer.address();
  windowRef = new BrowserWindow({
    width: 760,
    height: 64,
    minWidth: 460,
    minHeight: 64,
    frame: false,
    hasShadow: false,
    transparent: true,
    backgroundColor: "#00000000",
    title: "面试资料伴侣",
    webPreferences: {
      preload: path.join(root, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      // 音频采集在渲染进程内；切到其他 Space 后也不能让 Chromium 降频。
      backgroundThrottling: false
    }
  });
  // 跟随每个 macOS 桌面，切换 Space 后仍能看到内容并使用全局快捷键。
  if (process.platform === "darwin") {
    windowRef.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
    windowRef.setAlwaysOnTop(windowAlwaysOnTop);
  }
  windowRef.on("blur", () => windowRef.webContents.send("overlay:blur"));
  windowRef.webContents.on("did-start-loading", () => {
    questionCaptureRendererReady = false;
  });
  windowRef.webContents.setBackgroundThrottling(false);
  await windowRef.loadURL(`http://127.0.0.1:${address.port}`);
  if (isQuitting || windowRef.isDestroyed()) return;
  updateQuestionCaptureHotkey(getRuntimeConfig().questionCaptureHotkey);
  updatePreviousAnswerHotkey("Alt+P");
  if (process.platform === "darwin") app.dock.show();
  windowRef.show();
  windowRef.focus();
}

ipcMain.handle("window:toggle-always-on-top", () => {
  windowAlwaysOnTop = !windowAlwaysOnTop;
  windowRef?.setAlwaysOnTop(windowAlwaysOnTop);
  return windowAlwaysOnTop;
});

ipcMain.handle("window:set-overlay-mode", (_event, mode) => setOverlayWindowMode(mode));

ipcMain.handle("question-capture:start", async () => {
  const config = getRuntimeConfig();
  const validation = validateAsrProviderConfig(config);
  if (!validation.valid) return { ok: false, error: validation.message };
  questionCaptureSession?.stop();
  const captureId = ++activeQuestionCaptureId;
  activeQuestionCaptureAudioFrames = 0;
  questionCaptureSession = createAsrSession(config, (payload) => windowRef?.webContents.send("question-capture:event", { ...payload, captureId }));
  questionCaptureSession.start();
  return { ok: true, captureId };
});
ipcMain.handle("question-capture:stop", async () => { questionCaptureSession?.stop(); questionCaptureSession = null; return { ok: true }; });
ipcMain.on("question-capture:audio", (_event, chunk) => {
  if (!questionCaptureSession || !chunk) return;
  const audio = Buffer.from(chunk);
  if (!audio.length) return;
  activeQuestionCaptureAudioFrames += 1;
  // 只回传计数，不回传声音内容；用于明确区分“麦克风没采到”与“云端没转写”。
  if (activeQuestionCaptureAudioFrames === 1 || activeQuestionCaptureAudioFrames % 12 === 0) {
    windowRef?.webContents.send("question-capture:event", { type: "audio", captureId: activeQuestionCaptureId, audioFrames: activeQuestionCaptureAudioFrames });
  }
  questionCaptureSession.sendAudio(audio);
});
ipcMain.handle("question-capture:configure-hotkey", (_event, hotkey) => updateQuestionCaptureHotkey(hotkey));
ipcMain.handle("question-capture:renderer-ready", () => {
  questionCaptureRendererReady = true;
  if (pendingQuestionCaptureHotkey && windowRef && !windowRef.isDestroyed()) {
    pendingQuestionCaptureHotkey = false;
    windowRef.webContents.send("question-capture:hotkey");
  }
  return { ok: true, hotkey: activeQuestionHotkey };
});
ipcMain.handle("previous-answer:configure-hotkey", (_event, hotkey) => updatePreviousAnswerHotkey(hotkey));

if (singleInstanceLock) {
  app.whenReady().then(createWindow);
  app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => callback(permission === "media"));
  });
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && !isQuitting) app.quit();
});
app.on("before-quit", () => { isQuitting = true; globalShortcut.unregisterAll(); questionCaptureSession?.stop(); localServer?.close(); });
app.on("activate", () => { if (!isQuitting && singleInstanceLock && BrowserWindow.getAllWindows().length === 0) void createWindow(); });
