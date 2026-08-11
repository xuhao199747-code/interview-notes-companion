export function getPreferredAudioDeviceId(devices, selectedDeviceId) {
  if (devices.some((device) => device.deviceId === selectedDeviceId)) return selectedDeviceId;
  return devices[0]?.deviceId || "";
}

export function getSystemAudioDevice(devices = []) {
  return devices.find((device) => /blackhole/i.test(device.label || "")) || null;
}

export function getQuestionCaptureDevices(devices = [], microphoneId = "") {
  const systemAudio = getSystemAudioDevice(devices);
  const microphone = devices.find((device) => device.deviceId === microphoneId)
    || devices.find((device) => device.deviceId !== systemAudio?.deviceId)
    || null;
  return { microphoneId: microphone?.deviceId || "", systemAudioId: systemAudio?.deviceId || "" };
}

export function getQuestionCaptureMixGains({ hasSystemAudio = false } = {}) {
  return { microphone: hasSystemAudio ? 0.7 : 1, systemAudio: hasSystemAudio ? 0.7 : 0 };
}
