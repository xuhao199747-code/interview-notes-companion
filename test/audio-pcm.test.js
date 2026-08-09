import test from "node:test";
import assert from "node:assert/strict";
import { downsampleToPcm16 } from "../src/audio-pcm.js";

test("48k float audio becomes 16k signed PCM", () => {
  const bytes = downsampleToPcm16(new Float32Array([0, 0.5, 1, 0, 0.5, 1]), 48000, 16000);
  assert.equal(bytes.byteLength, 4);
  assert.equal(new Int16Array(bytes)[0], 16383);
});
