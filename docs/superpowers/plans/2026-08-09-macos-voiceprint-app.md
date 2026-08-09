# macOS 桌面音频与说话人过滤 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有本地网页封装为 macOS Electron 应用，采集用户选择的桌面音频输入，接入腾讯云实时语音识别 V2，并只将非本人说话人的最终文本交给资料检索。

**Architecture:** Electron 主进程保存配置、生成腾讯云 V2 签名并建立 WebSocket；渲染进程保留现有资料库与检索界面，并通过 AudioWorklet 将选定音频设备转换为 16kHz 单声道 PCM。主进程把腾讯云返回的 `speaker_id` 和最终文本发送回渲染进程；渲染进程使用用户确认的本人 speaker ID 过滤文本。

**Tech Stack:** Electron、Node.js 23 WebSocket 与 crypto、Web Audio AudioWorklet、腾讯云实时语音识别 V2、现有原生 HTML/CSS/JavaScript。

## Global Constraints

- 目标平台为 macOS 14+，桌面会议客户端的音频必须通过可选择的音频输入设备提供给应用；虚拟声卡是首个可用的接入方式。
- 不把 `SecretKey` 或 LLM API Key 传给渲染进程、日志或 Git。
- 腾讯云音频流必须是 16kHz、16-bit、mono PCM，并以接近实时的节奏发送。
- `speaker_id` 仅在腾讯云返回确定结果后用于过滤；`-1` 不触发检索。
- 未连接、鉴权失败、未选择音频设备、未确认本人 speaker ID 必须显示为不可用状态。

---

### Task 1: Electron 桌面壳与安全 IPC

**Files:**
- Modify: `package.json`
- Create: `electron/main.js`
- Create: `electron/preload.js`
- Modify: `index.html`
- Test: `test/electron-config.test.js`

**Interfaces:**
- Produces `window.interviewApp.getConfig()`, `saveConfig(payload)`, `listAudioDevices()`, `startTencentAsr(payload)`, `stopTencentAsr()`。
- 渲染进程不访问 Node、文件系统或密钥。

- [ ] **Step 1: Write the failing test**

```js
test("desktop config removes secret values from renderer payload", () => {
  assert.deepEqual(toRendererConfig({ tencentSecretKey: "secret", aiApiKey: "key", asrProvider: "tencent" }), { asrProvider: "tencent", tencentSecretKey: "已保存", aiApiKey: "已保存" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/electron-config.test.js`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement minimal IPC configuration boundary**

```js
contextBridge.exposeInMainWorld("interviewApp", {
  getConfig: () => ipcRenderer.invoke("config:get"),
  saveConfig: (payload) => ipcRenderer.invoke("config:save", payload),
  listAudioDevices: () => ipcRenderer.invoke("audio:list"),
  startTencentAsr: (payload) => ipcRenderer.invoke("asr:start", payload),
  stopTencentAsr: () => ipcRenderer.invoke("asr:stop")
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/electron-config.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json electron/main.js electron/preload.js test/electron-config.test.js
git commit -m "feat: add Electron desktop shell"
```

### Task 2: 腾讯云 V2 签名与连接状态测试

**Files:**
- Create: `src/tencent-asr.js`
- Modify: `electron/main.js`
- Test: `test/tencent-asr.test.js`

**Interfaces:**
- Produces `createTencentAsrUrl(config, now, nonce, voiceId)` and `TencentAsrSession`。
- `TencentAsrSession` emits `{ type: "ready" | "result" | "error" | "closed", ...payload }`。

- [ ] **Step 1: Write the failing test**

```js
test("Tencent V2 URL is signed with sorted query parameters", () => {
  const url = createTencentAsrUrl(config, 1700000000, 42, "voice-1");
  assert.match(url, /^wss:\/\/asr\.cloud\.tencent\.com\/asr\/v2\/123/);
  assert.match(url, /engine_model_type=16k_zh_en_speaker_2.0/);
  assert.match(url, /signature=/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/tencent-asr.test.js`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement HMAC-SHA1 signature and test connection**

```js
const signature = createHmac("sha1", secretKey).update(signingText).digest("base64");
query.signature = signature;
return `wss://asr.cloud.tencent.com/asr/v2/${appId}?${new URLSearchParams(query)}`;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/tencent-asr.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tencent-asr.js electron/main.js test/tencent-asr.test.js
git commit -m "feat: connect Tencent realtime ASR"
```

### Task 3: 设备选择、16k PCM 转换和音频流

**Files:**
- Create: `src/audio-worklet.js`
- Modify: `app.js`
- Modify: `index.html`
- Modify: `config.css`
- Test: `test/audio-pcm.test.js`

**Interfaces:**
- Produces `downsampleToPcm16(samples, sourceRate, targetRate = 16000)`.
- The renderer sends one `ArrayBuffer` audio chunk per 40–200ms over `window.interviewApp.sendAudio(chunk)`.

- [ ] **Step 1: Write the failing test**

```js
test("48k float audio becomes 16k signed PCM", () => {
  const bytes = downsampleToPcm16(new Float32Array([0, 0.5, 1, 0, 0.5, 1]), 48000, 16000);
  assert.equal(bytes.byteLength, 4);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/audio-pcm.test.js`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement microphone/virtual-device picker and stream controls**

```js
const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId }, echoCancellation: false, noiseSuppression: false } });
await audioContext.audioWorklet.addModule("src/audio-worklet.js");
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/audio-pcm.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/audio-worklet.js app.js index.html config.css test/audio-pcm.test.js
git commit -m "feat: stream selected audio device as PCM"
```

### Task 4: 说话人过滤与可验证状态界面

**Files:**
- Create: `src/speaker-filter.js`
- Modify: `app.js`
- Modify: `index.html`
- Modify: `config.css`
- Test: `test/speaker-filter.test.js`

**Interfaces:**
- Produces `shouldSearchSentence(sentence, ownSpeakerId)`.
- Renderer receives `asr:event` with Tencent stable sentence payload and shows speaker, transcript, filter result, and connection status.

- [ ] **Step 1: Write the failing test**

```js
test("own speaker and unresolved speaker never trigger search", () => {
  assert.equal(shouldSearchSentence({ speaker_id: 2, sentence_type: 1, sentence: "我的回答" }, 2), false);
  assert.equal(shouldSearchSentence({ speaker_id: -1, sentence_type: 1, sentence: "问题" }, 2), false);
  assert.equal(shouldSearchSentence({ speaker_id: 1, sentence_type: 1, sentence: "请介绍项目" }, 2), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/speaker-filter.test.js`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement speaker mapping and filter indicators**

```js
export function shouldSearchSentence(sentence, ownSpeakerId) {
  return sentence.sentence_type === 1 && sentence.speaker_id >= 0 && sentence.speaker_id !== ownSpeakerId && Boolean(sentence.sentence?.trim());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/speaker-filter.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/speaker-filter.js app.js index.html config.css test/speaker-filter.test.js
git commit -m "feat: filter own speaker from ASR results"
```

### Task 5: 本机打包、运行检查与文档

**Files:**
- Modify: `README.md`
- Modify: `package.json`
- Test: `test/`

**Interfaces:**
- Produces `npm run desktop` for Electron development and `npm run package:mac` for macOS packaging.

- [ ] **Step 1: Update launch scripts and setup guidance**

```json
{
  "scripts": {
    "desktop": "electron .",
    "package:mac": "electron-builder --mac"
  }
}
```

- [ ] **Step 2: Document setup and permission checks**

Document the selected audio device, macOS microphone/screen-recording permission, Tencent connection test, speaker-ID confirmation, and the exact “not connected” states.

- [ ] **Step 3: Run full verification**

Run: `npm test && npm run desktop`
Expected: all tests pass and Electron starts with no console errors.

- [ ] **Step 4: Commit**

```bash
git add README.md package.json
git commit -m "docs: add macOS desktop setup"
```
