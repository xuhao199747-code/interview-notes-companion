export function shouldPublishAudioProgress(packetCount) {
  return packetCount === 1 || packetCount % 25 === 0;
}
