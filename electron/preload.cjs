const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("interviewApp", {
  isDesktop: true,
  sendAudio: (chunk) => { if (chunk) ipcRenderer.send("asr:audio", chunk); },
  startAsr: () => ipcRenderer.invoke("asr:start"),
  stopAsr: () => ipcRenderer.invoke("asr:stop"),
  onAsrEvent: (callback) => ipcRenderer.on("asr:event", (_event, payload) => callback(payload))
});
