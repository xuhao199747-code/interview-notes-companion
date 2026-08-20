const { app, BrowserWindow, ipcMain, session } = require("electron");
const path = require("node:path");

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => callback(permission === "media"));
  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  ipcMain.once("asr:audio", (_event, chunk) => {
    console.log(JSON.stringify({ received: Buffer.from(chunk).length > 0, bytes: Buffer.from(chunk).length }));
    app.exit(0);
  });
  await window.loadURL("http://127.0.0.1:4173");
  await window.webContents.executeJavaScript(`(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      const pcm = new Int16Array(input.length);
      for (let index = 0; index < input.length; index += 1) pcm[index] = input[index] * 32767;
      window.interviewApp.sendAudio(new Uint8Array(pcm.buffer));
    };
    source.connect(processor);
    processor.connect(context.destination);
    await context.resume();
  })()`);
  setTimeout(() => { console.log(JSON.stringify({ received: false, timeout: true })); app.exit(1); }, 6000);
});
