/**
 * PCM Capture AudioWorklet Processor
 *
 * Runs in the audio rendering thread to capture mic input as 16-bit PCM base64.
 * Replaces the deprecated ScriptProcessorNode for modern browsers.
 *
 * Loaded via: audioContext.audioWorklet.addModule('/pcm-capture-worklet.js')
 */
class PCMCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const float32 = input[0]; // mono channel
    if (!float32 || float32.length === 0) return true;

    // Float32 → Int16
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    // Int16 → base64
    const bytes = new Uint8Array(int16.buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    // Send base64 chunk to main thread
    this.port.postMessage(btoa(binary));

    return true; // Keep processor alive
  }
}

registerProcessor('pcm-capture-processor', PCMCaptureProcessor);
