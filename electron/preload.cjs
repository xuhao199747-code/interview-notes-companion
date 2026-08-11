const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("interviewApp", {
  isDesktop: true,
  sendQuestionCaptureAudio: (chunk) => { if (chunk) ipcRenderer.send("question-capture:audio", chunk); },
  startQuestionCapture: () => ipcRenderer.invoke("question-capture:start"),
  stopQuestionCapture: () => ipcRenderer.invoke("question-capture:stop"),
  toggleAlwaysOnTop: () => ipcRenderer.invoke("window:toggle-always-on-top"),
  setOverlayMode: (mode) => ipcRenderer.invoke("window:set-overlay-mode", mode),
  onOverlayBlur: (callback) => ipcRenderer.on("overlay:blur", () => callback()),
  configureQuestionCaptureHotkey: (hotkey) => ipcRenderer.invoke("question-capture:configure-hotkey", hotkey),
  markQuestionCaptureRendererReady: () => ipcRenderer.invoke("question-capture:renderer-ready"),
  configurePreviousAnswerHotkey: (hotkey) => ipcRenderer.invoke("previous-answer:configure-hotkey", hotkey),
  onQuestionCaptureHotkey: (callback) => ipcRenderer.on("question-capture:hotkey", () => callback()),
  onPreviousAnswerHotkey: (callback) => ipcRenderer.on("previous-answer:hotkey", () => callback()),
  onQuestionCaptureEvent: (callback) => ipcRenderer.on("question-capture:event", (_event, payload) => callback(payload))
});
