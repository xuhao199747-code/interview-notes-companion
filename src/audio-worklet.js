import { downsampleToPcm16 } from "./audio-pcm.js";

class PcmAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.samples = [];
    this.chunkSize = Math.max(128, Math.round(sampleRate * 0.04));
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;
    this.samples.push(...channel);
    while (this.samples.length >= this.chunkSize) {
      const chunk = new Float32Array(this.samples.splice(0, this.chunkSize));
      const pcm = downsampleToPcm16(chunk, sampleRate);
      this.port.postMessage(pcm, [pcm.buffer]);
    }
    return true;
  }
}

registerProcessor("pcm-audio-processor", PcmAudioProcessor);
