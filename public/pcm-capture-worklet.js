/**
 * PCM Capture AudioWorklet Processor
 *
 * Runs in the audio rendering thread to capture mic input as 16-bit PCM base64.
 * Replaces the deprecated ScriptProcessorNode for modern browsers.
 *
 * Loaded via: audioContext.audioWorklet.addModule('/pcm-capture-worklet.js')
 *
 * Best-practice chunk size: 2048 samples @ 16kHz = 128ms per packet.
 * This stays within the 20–100ms+ window recommended by the Gemini Live API
 * while reducing WebSocket message frequency by ~16× vs raw 128-sample frames.
 */
class PCMCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Accumulation buffer — holds int16 samples until threshold is reached
    this._buffer = new Int16Array(2048);
    this._bufferIndex = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const float32 = input[0]; // mono channel
    if (!float32 || float32.length === 0) return true;

    // Float32 → Int16 and accumulate
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      this._buffer[this._bufferIndex++] = s < 0 ? s * 0x8000 : s * 0x7fff;

      // Once the buffer is full, post the chunk and reset
      if (this._bufferIndex >= this._buffer.length) {
        const bytes = new Uint8Array(this._buffer.buffer);
        
        // Efficient manual base64 conversion (AudioWorklet has no btoa)
        const base64 = this.toBase64(bytes);
        this.port.postMessage(base64);
        this._bufferIndex = 0;
      }
    }

    return true; // Keep processor alive
  }

  /** Efficient base64 encoder for Worklets */
  toBase64(bytes) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let base64 = '';
    for (let i = 0; i < bytes.length; i += 3) {
      const v1 = bytes[i];
      const v2 = bytes[i + 1];
      const v3 = bytes[i + 2];
      base64 += chars.charAt(v1 >> 2);
      base64 += chars.charAt(((v1 & 3) << 4) | (v2 >> 4));
      if (v2 !== undefined) {
        base64 += chars.charAt(((v2 & 15) << 2) | (v3 >> 6));
        if (v3 !== undefined) {
          base64 += chars.charAt(v3 & 63);
        } else {
          base64 += '=';
        }
      } else {
        base64 += '==';
      }
    }
    return base64;
  }
}

registerProcessor('pcm-capture-processor', PCMCaptureProcessor);
