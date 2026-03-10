"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { AUDIO_CONFIG } from "@/lib/constants";
import { AudioStreamer } from "@/lib/audio-streamer";
import { Lipsync } from "wawa-lipsync";
import { useLipSyncStore } from "@/store/useLipSyncStore";
import { createLogger } from "@/lib/logging/logger";

const log = createLogger("useAudioProcessor");

/**
 * Manages microphone audio capture, Gemini audio playback, and real-time audio levels.
 *
 * @remarks
 * - Capture: Records at 16kHz 16-bit PCM mono, outputs base64 chunks.
 * - Playback: Uses `AudioStreamer` for time-scheduled, gapless 24kHz PCM playback.
 * - Stop: `stopPlayback()` immediately halts output and clears the queue
 *   (called on Gemini `interrupted` signal).
 * - Audio Level: Exposed as a `useRef` to avoid 60fps re-renders.
 *   Components that need it (e.g. Avatar, AudioWaveform) should read
 *   `audioLevelRef.current` inside their own animation loops (useFrame / rAF).
 */
export function useAudioProcessor() {
  const [isMicActive, setIsMicActive] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  /**
   * Audio level as a ref — NOT state — to prevent 60fps re-renders.
   * Read this inside `useFrame` / `requestAnimationFrame`.
   */
  const audioLevelRef = useRef(0);

  // Mic capture refs
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);

  // Playback via AudioStreamer
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  // rAF handle for playback-level animation loop
  const playbackAnimFrameRef = useRef<number>(0);

  // ── Mic capture ──────────────────────────────────────────────────────────
  const startMic = useCallback(
    (onChunk: (base64: string) => void) => {
      (async () => {
        setPermissionError(null);
        try {
          // Explicitly check permissions on browsers that support it
          if (navigator.permissions && navigator.permissions.query) {
            try {
              const perm = await navigator.permissions.query({ name: "microphone" as PermissionName });
              if (perm.state === "denied") {
                throw new Error("Microphone access is explicitly denied in browser settings.");
              }
            } catch (e) {
              // Ignore if browser doesn't support 'microphone' permission query (e.g. Firefox)
              console.log("[AudioProcessor] Permission query skipped:", e);
            }
          }

          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              sampleRate: AUDIO_CONFIG.input_hz,
              channelCount: 1,
              // Best practice: disable browser-side AGC and noise processing.
              // These introduce artifacts that degrade the model's emotional tone
              // detection. The Gemini Live API processes the raw signal natively.
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            },
          });
          streamRef.current = stream;

          const ctx = new AudioContext({ sampleRate: AUDIO_CONFIG.input_hz });
          audioCtxRef.current = ctx;
          
          if (ctx.state === "suspended") {
            await ctx.resume();
            log.info("[AudioProcessor] Input AudioContext resumed.");
          }

          const source = ctx.createMediaStreamSource(stream);

          // Analyser for audio level (used for lip-sync during mic input)
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          analyserRef.current = analyser;

          // ── Prefer AudioWorklet, fallback to ScriptProcessorNode ──────
          let workletLoaded = false;
          if (typeof AudioWorkletNode !== "undefined") {
            try {
              await ctx.audioWorklet.addModule("/pcm-capture-worklet.js");
              const workletNode = new AudioWorkletNode(ctx, "pcm-capture-processor");
              source.connect(workletNode);
              // ✅ Fix: Do NOT connect workletNode to ctx.destination.
              // Routing mic → destination would play the raw mic audio back
              // through the speakers, creating a feedback/echo loop.
              workletNode.port.onmessage = (e: MessageEvent<string>) => {
                onChunk(e.data);
              };
              workletNodeRef.current = workletNode;
              workletLoaded = true;
              log.info("[AudioProcessor] Using AudioWorklet for PCM capture.");
            } catch (workletErr) {
              log.warn({ err: workletErr }, "AudioWorklet failed, falling back to ScriptProcessor");
            }
          }

          if (!workletLoaded) {
            // Fallback: deprecated ScriptProcessorNode (still widely supported)
            const processor = ctx.createScriptProcessor(4096, 1, 1);
            source.connect(processor);
            processor.connect(ctx.destination);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const float32 = e.inputBuffer.getChannelData(0);
              // Float32 → Int16
              const int16 = new Int16Array(float32.length);
              for (let i = 0; i < float32.length; i++) {
                const s = Math.max(-1, Math.min(1, float32[i]));
                int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
              }
              // Int16 → base64
              const bytes = new Uint8Array(int16.buffer);
              let binary = "";
              for (let i = 0; i < bytes.length; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              onChunk(btoa(binary));
            };
            log.info("[AudioProcessor] Using ScriptProcessorNode fallback for PCM capture.");
          }

          // rAF loop for audio level → ref (not state)
          const updateLevel = () => {
            if (!analyserRef.current) return;
            const data = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(data);
            const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
            audioLevelRef.current = avg / 255;
            animFrameRef.current = requestAnimationFrame(updateLevel);
          };
          updateLevel();

          setIsMicActive(true);
        } catch (err) {
          log.error({ err }, "Failed to acquire user media or start AudioContext");
          let errorMsg = "Could not access microphone.";
          if (err instanceof DOMException) {
            if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
              errorMsg = "No microphone found. Please plug one in.";
            } else if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
              errorMsg = "Microphone access was denied. Please allow it in settings.";
            } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
              errorMsg = "Microphone is already in use by another application.";
            }
          } else if (err instanceof Error) {
            errorMsg = err.message;
          }
          setPermissionError(errorMsg);
        }
      })();
    },
    [],
  );

  const stopMic = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close();
    cancelAnimationFrame(animFrameRef.current);
    // Clean up AudioWorklet node if it was used
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    streamRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
    processorRef.current = null;
    setIsMicActive(false);
    audioLevelRef.current = 0;
    log.info("Stopped audio processor and released microphone");
  }, []);

  // ── Playback via AudioStreamer ────────────────────────────────────────────

  /**
   * Get or create the AudioStreamer instance (single shared AudioContext).
   */
  const getStreamer = useCallback((): AudioStreamer => {
    if (!audioStreamerRef.current) {
      if (!playbackCtxRef.current) {
        playbackCtxRef.current = new AudioContext({
          sampleRate: AUDIO_CONFIG.output_hz,
        });
        log.info("Initialized AudioContext (Playback)");
      }
      const streamer = new AudioStreamer(
        playbackCtxRef.current,
        AUDIO_CONFIG.output_hz,
      );
      audioStreamerRef.current = streamer;

      // Ensure Lipsync is correctly instantiated and mapped to AudioStreamer
      const wawa = new Lipsync();
      
      // Patch private properties to safely integrate without relying on HTMLAudioElement
      // @ts-expect-error - patching private context to match AudioStreamer
      wawa.audioContext = streamer.context;
      // @ts-expect-error - use the streamer's own analyser that's already in the audio chain
      wawa.analyser = streamer.analyserNode;
      // @ts-expect-error - override sampleRate for wawa
      wawa.sampleRate = streamer.context.sampleRate;
      // @ts-expect-error - recompute binWidth
      wawa.binWidth = wawa.sampleRate / 2048;

      useLipSyncStore.getState().setWawaLipsync(wawa);
    }
    return audioStreamerRef.current;
  }, []);

  /**
   * Continuous rAF loop that keeps audioLevelRef updated from the streamer
   * during playback. Runs at 60fps so Avatar lip-sync is always smooth.
   * Only active while playback is on-going; cancelled by stopPlayback().
   */
  const startPlaybackLevelLoop = useCallback(() => {
    const tick = () => {
      if (audioStreamerRef.current) {
        const vol = audioStreamerRef.current.getVolume();
        // Map streamer RMS (0-1 float) → audioLevelRef (0-1) with a boost
        audioLevelRef.current = Math.min(1, vol * 4);
        
        // Output trace when the volume changes significantly, throttle with frame count
        if (vol > 0.01 && playbackAnimFrameRef.current % 30 === 0) {
           log.trace({ rms: vol }, "AudioStreamer volumetric output");
        }
      }
      playbackAnimFrameRef.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(playbackAnimFrameRef.current);
    playbackAnimFrameRef.current = requestAnimationFrame(tick);
  }, [audioLevelRef]);

  const stopPlaybackLevelLoop = useCallback(() => {
    cancelAnimationFrame(playbackAnimFrameRef.current);
    audioLevelRef.current = 0;
  }, [audioLevelRef]);

  /**
   * Queue a base64-encoded PCM16 audio chunk for time-scheduled playback.
   * Converts base64 → Uint8Array → hands off to AudioStreamer.
   *
   * Best practice: resume the AudioContext before scheduling audio.
   * Browsers (especially mobile) suspend the context until a user gesture;
   * attempting to schedule without resuming causes silent playback.
   */
  const playAudioChunk = useCallback((base64: string) => {
    (async () => {
      try {
        const streamer = getStreamer();
        const ctx = playbackCtxRef.current!;

        // ✅ Fix: Resume suspended AudioContext (browser autoplay policy).
        if (ctx.state === "suspended") {
          await ctx.resume();
          log.info("[AudioProcessor] AudioContext resumed from suspended state.");
        }

        // base64 → Uint8Array (PCM16 bytes)
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        // Feed to AudioStreamer for gapless scheduling.
        streamer.addPCM16(bytes);

        // ✅ Fix: Instead of computing per-chunk bulk RMS (which freezes
        // lip-sync between packets), start a continuous rAF loop that
        // samples the streamer volume at 60fps.
        startPlaybackLevelLoop();
      } catch (error) {
        log.error({ err: error }, "Microphone worklet initialization failed");
      }
    })();
  }, [getStreamer, startPlaybackLevelLoop]);

  /**
   * Bind a callback to the streamer that fires whenever an audio buffer is scheduled.
   */
  const onAudioScheduledRef = useRef<((startMs: number, durationMs: number) => void) | null>(null);
  useEffect(() => {
     if (audioStreamerRef.current) {
        audioStreamerRef.current.onAudioScheduled = (start, duration) => {
           onAudioScheduledRef.current?.(start, duration);
        };
     }
  }, []);

  /**
   * Immediately stop all audio playback and clear the queue.
   * Called when the Gemini server sends an `interrupted` signal.
   *
   * @see Official docs: "stop and empty the current playback queue"
   */
  const stopPlayback = useCallback(() => {
    if (audioStreamerRef.current) {
      audioStreamerRef.current.stop();
    }
    stopPlaybackLevelLoop();
  }, [stopPlaybackLevelLoop]);

  return {
    isMicActive,
    permissionError,
    audioLevelRef,
    startMic,
    stopMic,
    playAudioChunk,
    stopPlayback,
    ensureStreamer: getStreamer,
    onAudioScheduledRef,
  };
}
