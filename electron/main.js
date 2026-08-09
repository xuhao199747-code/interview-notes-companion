import { app, BrowserWindow, ipcMain, session } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getRuntimeConfig, startServer } from "../server.js";
import { createAsrSession, validateAsrProviderConfig } from "../src/asr-provider.js";
import { shouldPublishAudioProgress } from "../src/audio-progress.js";
import { createVoiceprintClient, voiceprintDecision } from "../src/tencent-voiceprint.js";
import { getEditionStorageName } from "../src/edition.js";

const root = path.dirname(fileURLToPath(import.meta.url));
app.setPath("userData", path.join(app.getPath("appData"), getEditionStorageName(process.env.INTERVIEW_EDITION)));
let windowRef;
let localServer;
let asrSession;
let audioPacketCount = 0;
let recentAudio = [];
let recentAudioBytes = 0;
const MAX_VOICEPRINT_BYTES = 16000 * 2 * 8;

function retainRecentAudio(audio) {
  recentAudio.push(audio);
  recentAudioBytes += audio.length;
  while (recentAudioBytes > MAX_VOICEPRINT_BYTES && recentAudio.length) recentAudioBytes -= recentAudio.shift().length;
}

async function publishAsrPayload(config, payload) {
  if (payload.type !== "result" || !config.voicePrintVerified || !config.voicePrintId) {
    windowRef?.webContents.send("asr:event", payload);
    return;
  }
  if (payload.sentence?.sentence_type !== 1) {
    windowRef?.webContents.send("asr:event", { ...payload, voiceprint: "unknown" });
    return;
  }
  const audio = Buffer.concat(recentAudio);
  try {
    const result = await Promise.race([
      createVoiceprintClient(config).verify({ voicePrintId: config.voicePrintId, pcm16: audio }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("声纹验证超时")), 1500)),
    ]);
    const decision = voiceprintDecision(result);
    const score = result.Data?.Score ?? null;
    windowRef?.webContents.send("asr:event", { type: "voiceprint", decision, score });
    windowRef?.webContents.send("asr:event", { ...payload, voiceprint: decision, voiceprintScore: score });
  } catch (error) {
    windowRef?.webContents.send("asr:event", { type: "voiceprint", decision: "unknown", error: error.message });
    windowRef?.webContents.send("asr:event", { ...payload, voiceprint: "unknown" });
  }
}

async function createWindow() {
  localServer = await startServer(0);
  const address = localServer.address();
  windowRef = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 980,
    minHeight: 680,
    title: "面试资料伴侣",
    webPreferences: {
      preload: path.join(root, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  await windowRef.loadURL(`http://127.0.0.1:${address.port}`);
  if (process.platform === "darwin") app.dock.show();
  windowRef.show();
  windowRef.focus();
}

ipcMain.handle("asr:start", async () => {
  const config = getRuntimeConfig();
  const validation = validateAsrProviderConfig(config);
  if (!validation.valid) return { ok: false, error: validation.message };
  asrSession?.stop();
  audioPacketCount = 0;
  recentAudio = [];
  recentAudioBytes = 0;
  asrSession = createAsrSession(config, (payload) => { void publishAsrPayload(config, payload); });
  asrSession.start();
  return { ok: true };
});
ipcMain.handle("asr:stop", async () => { asrSession?.stop(); asrSession = null; recentAudio = []; recentAudioBytes = 0; return { ok: true }; });
ipcMain.on("asr:audio", (_event, chunk) => {
  if (!asrSession || !chunk) return;
  const audio = Buffer.from(chunk);
  if (!audio.length) return;
  retainRecentAudio(audio);
  audioPacketCount += 1;
  if (shouldPublishAudioProgress(audioPacketCount)) windowRef?.webContents.send("asr:event", { type: "audio", count: audioPacketCount });
  asrSession.sendAudio(audio);
});

app.whenReady().then(createWindow);
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => callback(permission === "media"));
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("before-quit", () => localServer?.close());
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
