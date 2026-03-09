/**
 * AudioStreamer — Time-scheduled PCM16 audio playback.
 *
 * Ported from the Google `live-api-web-console` reference implementation.
 * Uses `AudioContext.currentTime` scheduling for gapless playback and a
 * GainNode for clean stop/resume without audio pops.
 *
 * @see https://github.com/google-gemini/multimodal-live-api-web-console
 */

export class AudioStreamer {
  private sampleRate: number;
  private bufferSize: number = 7680;

  /** Queue of Float32 audio buffers waiting to be scheduled. */
  private audioQueue: Float32Array[] = [];
  private isPlaying: boolean = false;
  /** Marks that no more chunks are expected for this turn. */
  private isStreamComplete: boolean = false;

  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private scheduledTime: number = 0;
  private initialBufferTime: number = 0.1; // 100ms initial buffer

  /** GainNode sits between sources and destination for clean volume control. */
  public gainNode: GainNode;
  public analyserNode!: AnalyserNode;
  public source!: AudioBufferSourceNode;
  private endOfQueueAudioSource: AudioBufferSourceNode | null = null;

  /** Called when the queue has been fully drained and the last buffer finishes. */
  public onComplete = () => {};

  /** 
   * Fires exactly when a buffer is scheduled.
   * Passing back the scheduled start time (in MS) and duration (in MS).
   */
  public onAudioScheduled: ((startTimeMs: number, durationMs: number) => void) | null = null;

  constructor(public context: AudioContext, sampleRate: number = 24000) {
    this.sampleRate = sampleRate;
    this.gainNode = this.context.createGain();
    this.source = this.context.createBufferSource();
    this.gainNode.connect(this.context.destination);
    this.addPCM16 = this.addPCM16.bind(this);
  }

  // ── PCM16 → Float32 conversion ───────────────────────────────────────────

  /**
   * Converts a Uint8Array of PCM16 (little-endian, signed) audio data into a
   * Float32Array normalised to [-1, 1].
   */
  private _processPCM16Chunk(chunk: Uint8Array): Float32Array {
    const float32Array = new Float32Array(chunk.length / 2);
    const dataView = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);

    for (let i = 0; i < chunk.length / 2; i++) {
      const int16 = dataView.getInt16(i * 2, true); // little-endian
      float32Array[i] = int16 / 32768;
    }
    return float32Array;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Queue a PCM16 audio chunk for playback. Chunks are sliced into
   * fixed-size buffers and scheduled with look-ahead timing for
   * gapless output.
   */
  addPCM16(chunk: Uint8Array) {
    // A new chunk means the stream hasn't finished yet.
    this.isStreamComplete = false;

    let processingBuffer = this._processPCM16Chunk(chunk);

    // Slice into fixed-size buffers for consistent scheduling granularity.
    while (processingBuffer.length >= this.bufferSize) {
      const buffer = processingBuffer.slice(0, this.bufferSize);
      this.audioQueue.push(buffer);
      processingBuffer = processingBuffer.slice(this.bufferSize);
    }
    // Remainder goes in as-is.
    if (processingBuffer.length > 0) {
      this.audioQueue.push(processingBuffer);
    }

    // Kick off scheduling if not already playing.
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.scheduledTime = this.context.currentTime + this.initialBufferTime;
      this.scheduleNextBuffer();
    }
  }

  /**
   * Immediately stop all playback, clear the queue, and ramp gain to zero
   * to avoid audio pops.
   */
  stop() {
    this.isPlaying = false;
    this.isStreamComplete = true;
    this.audioQueue = [];
    this.scheduledTime = this.context.currentTime;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Smooth gain ramp-down over 100ms to prevent click/pop.
    this.gainNode.gain.linearRampToValueAtTime(
      0,
      this.context.currentTime + 0.1,
    );

    // Reconnect with fresh gain after ramp completes.
    setTimeout(() => {
      this.gainNode.disconnect();
      this.gainNode = this.context.createGain();
      this.gainNode.connect(this.analyserNode);
    }, 200);
  }

  /**
   * Resume playback (e.g. after a `stop` or first user interaction).
   * Resets scheduling origin and restores gain to full.
   */
  async resume() {
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
    this.isStreamComplete = false;
    this.scheduledTime = this.context.currentTime + this.initialBufferTime;
    this.gainNode.gain.setValueAtTime(1, this.context.currentTime);
  }

  /**
   * Mark the stream as complete. No more chunks are expected.
   */
  complete() {
    this.isStreamComplete = true;
    this.onComplete();
  }

  /** Gets real-time volume (0 to 1) from the hardware AnalyserNode */
  getVolume(): number {
    if (!this.analyserNode) return 0;
    
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(data);
    
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
       sum += data[i];
    }
    const avg = sum / data.length;
    // Normalize byte (0-255) to float (0-1)
    return avg / 255;
  }

  // ── Internal scheduling ──────────────────────────────────────────────────

  private createAudioBuffer(audioData: Float32Array): AudioBuffer {
    const audioBuffer = this.context.createBuffer(
      1,
      audioData.length,
      this.sampleRate,
    );
    audioBuffer.getChannelData(0).set(audioData);
    return audioBuffer;
  }

  private scheduleNextBuffer() {
    const SCHEDULE_AHEAD_TIME = 0.2; // schedule 200ms ahead

    while (
      this.audioQueue.length > 0 &&
      this.scheduledTime < this.context.currentTime + SCHEDULE_AHEAD_TIME
    ) {
      const audioData = this.audioQueue.shift()!;
      const audioBuffer = this.createAudioBuffer(audioData);
      const source = this.context.createBufferSource();

      // Track end-of-queue for onComplete callback.
      if (this.audioQueue.length === 0) {
        if (this.endOfQueueAudioSource) {
          this.endOfQueueAudioSource.onended = null;
        }
        this.endOfQueueAudioSource = source;
        source.onended = () => {
          if (
            !this.audioQueue.length &&
            this.endOfQueueAudioSource === source
          ) {
            this.endOfQueueAudioSource = null;
            this.onComplete();
          }
        };
      }

      source.buffer = audioBuffer;
      // Connect specifically through the gainNode (which feeds into analyserNode)
      source.connect(this.gainNode);

      // Never schedule in the past.
      const startTime = Math.max(this.scheduledTime, this.context.currentTime);
      source.start(startTime);
      
      if (this.onAudioScheduled) {
        this.onAudioScheduled(startTime * 1000, audioBuffer.duration * 1000);
      }

      this.scheduledTime = startTime + audioBuffer.duration;
    }

    // If queue is empty, either we're done or we poll for more chunks.
    if (this.audioQueue.length === 0) {
      if (this.isStreamComplete) {
        this.isPlaying = false;
        if (this.checkInterval) {
          clearInterval(this.checkInterval);
          this.checkInterval = null;
        }
      } else {
        // Poll for new chunks (they arrive asynchronously from the server).
        if (!this.checkInterval) {
          this.checkInterval = setInterval(() => {
            if (this.audioQueue.length > 0) {
              this.scheduleNextBuffer();
            }
          }, 100);
        }
      }
    } else {
      // More in queue — schedule the next batch slightly before the current
      // batch finishes playing.
      const nextCheckTime =
        (this.scheduledTime - this.context.currentTime) * 1000;
      setTimeout(
        () => this.scheduleNextBuffer(),
        Math.max(0, nextCheckTime - 50),
      );
    }
  }
}
