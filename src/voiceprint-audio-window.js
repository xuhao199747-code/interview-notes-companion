export function createVoiceprintAudioWindow(maxBytes) {
  let chunks = [];
  let totalBytes = 0;

  function trim() {
    while (totalBytes > maxBytes && chunks.length) {
      const excess = totalBytes - maxBytes;
      const first = chunks[0];
      if (first.length <= excess) {
        totalBytes -= first.length;
        chunks.shift();
      } else {
        chunks[0] = first.subarray(excess);
        totalBytes -= excess;
      }
    }
  }

  return {
    push(chunk) {
      const audio = Buffer.from(chunk);
      if (!audio.length) return;
      chunks.push(audio);
      totalBytes += audio.length;
      trim();
    },
    takeLatest(bytes = maxBytes) {
      const combined = Buffer.concat(chunks, totalBytes);
      return combined.subarray(Math.max(0, combined.length - Math.max(0, bytes)));
    },
    clear() {
      chunks = [];
      totalBytes = 0;
    },
  };
}
