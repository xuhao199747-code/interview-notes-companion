import test from "node:test";
import assert from "node:assert/strict";
import { getPreferredAudioDeviceId } from "../src/audio-device.js";

test("未手动选择设备时优先使用系统默认音频输入", () => {
  const devices = [{ deviceId: "default", label: "MacBook 麦克风" }, { deviceId: "virtual", label: "BlackHole 2ch" }];
  assert.equal(getPreferredAudioDeviceId(devices, ""), "default");
  assert.equal(getPreferredAudioDeviceId(devices, "virtual"), "virtual");
  assert.equal(getPreferredAudioDeviceId([], ""), "");
});
