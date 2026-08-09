export function getPreferredAudioDeviceId(devices, selectedDeviceId) {
  if (devices.some((device) => device.deviceId === selectedDeviceId)) return selectedDeviceId;
  return devices[0]?.deviceId || "";
}
