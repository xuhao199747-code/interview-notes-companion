export function downsampleToPcm16(samples, sourceRate, targetRate = 16000) {
  if (sourceRate < targetRate) throw new Error("音频采样率不能低于目标采样率");
  const ratio = sourceRate / targetRate;
  const length = Math.floor(samples.length / ratio);
  const output = new Int16Array(length);
  for (let index = 0; index < length; index += 1) {
    const start = Math.floor(index * ratio);
    const end = Math.min(Math.floor((index + 1) * ratio), samples.length);
    let sum = 0;
    for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) sum += samples[sampleIndex];
    const value = Math.max(-1, Math.min(1, sum / Math.max(1, end - start)));
    output[index] = value < 0 ? value * 0x8000 : value * 0x7fff;
  }
  return output.buffer;
}
