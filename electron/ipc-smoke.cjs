const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");

app.whenReady().then(async () => {
  const expected = Buffer.from(new Int16Array([1, -2, 300]).buffer);
  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  ipcMain.once("question-capture:audio", (_event, chunk) => {
    const received = Buffer.from(chunk);
    console.log(JSON.stringify({ matches: received.equals(expected), bytes: received.length }));
    app.exit(received.equals(expected) ? 0 : 1);
  });
  await window.loadURL("data:text/html,<main>ipc smoke test</main>");
  await window.webContents.executeJavaScript("window.interviewApp.sendQuestionCaptureAudio(new Uint8Array(new Int16Array([1, -2, 300]).buffer))");
  setTimeout(() => { console.log(JSON.stringify({ matches: false, timeout: true })); app.exit(1); }, 5000);
});
