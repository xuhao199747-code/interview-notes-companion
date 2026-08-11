import test from "node:test";
import assert from "node:assert/strict";
import { getPreferredAudioDeviceId, getQuestionCaptureDevices, getQuestionCaptureMixGains, getSystemAudioDevice } from "../src/audio-device.js";

test("未手动选择设备时优先使用系统默认音频输入", () => {
  const devices = [{ deviceId: "default", label: "MacBook 麦克风" }, { deviceId: "virtual", label: "BlackHole 2ch" }];
  assert.equal(getPreferredAudioDeviceId(devices, ""), "default");
  assert.equal(getPreferredAudioDeviceId(devices, "virtual"), "virtual");
  assert.equal(getPreferredAudioDeviceId([], ""), "");
});

test("系统外放模式优先选择 BlackHole 虚拟音频输入", () => {
  const devices = [{ deviceId: "mic", label: "MacBook 麦克风" }, { deviceId: "blackhole", label: "BlackHole 2ch" }, { deviceId: "doubao", label: "豆包会议记录虚拟设备" }];
  assert.equal(getSystemAudioDevice(devices)?.deviceId, "blackhole");
  assert.equal(getSystemAudioDevice([{ deviceId: "mic", label: "MacBook 麦克风" }]), null);
});

test("面试采集同时保留麦克风和系统音频两路输入", () => {
  const devices = [{ deviceId: "mic", label: "MacBook 麦克风" }, { deviceId: "blackhole", label: "BlackHole 2ch" }];
  assert.deepEqual(getQuestionCaptureDevices(devices, "mic"), { microphoneId: "mic", systemAudioId: "blackhole" });
});

test("双音源时外放和麦克风都以相同权重参与识别", () => {
  assert.deepEqual(getQuestionCaptureMixGains({ hasSystemAudio: true }), { microphone: 0.7, systemAudio: 0.7 });
  assert.deepEqual(getQuestionCaptureMixGains({ hasSystemAudio: false }), { microphone: 1, systemAudio: 0 });
});
