"use client";

import { useCallback, useRef, useState } from "react";
import { AUDIO_SAMPLE_RATE_INPUT, AUDIO_SAMPLE_RATE_OUTPUT } from "@/lib/constants";
import { AudioStreamer } from "@/lib/audio-streamer";

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
              sampleRate: AUDIO_SAMPLE_RATE_INPUT,
              channelCount: 1,
              echoCancellation: true,
              noiseSuppression: true,
            },
          });
          streamRef.current = stream;

          const ctx = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE_INPUT });
          audioCtxRef.current = ctx;

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
              workletNode.connect(ctx.destination);
              workletNode.port.onmessage = (e: MessageEvent<string>) => {
                onChunk(e.data);
              };
              workletNodeRef.current = workletNode;
              workletLoaded = true;
              console.log("[AudioProcessor] Using AudioWorklet for PCM capture.");
            } catch (workletErr) {
              console.warn("[AudioProcessor] AudioWorklet failed, falling back to ScriptProcessor:", workletErr);
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
            console.log("[AudioProcessor] Using ScriptProcessorNode fallback for PCM capture.");
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
          console.error("[AudioProcessor] Mic error:", err);
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
  }, []);

  // ── Playback via AudioStreamer ────────────────────────────────────────────

  /**
   * Get or create the AudioStreamer instance (single shared AudioContext).
   */
  const getStreamer = useCallback((): AudioStreamer => {
    if (!audioStreamerRef.current) {
      if (!playbackCtxRef.current) {
        playbackCtxRef.current = new AudioContext({
          sampleRate: AUDIO_SAMPLE_RATE_OUTPUT,
        });
      }
      audioStreamerRef.current = new AudioStreamer(
        playbackCtxRef.current,
        AUDIO_SAMPLE_RATE_OUTPUT,
      );
    }
    return audioStreamerRef.current;
  }, []);

  /**
   * Queue a base64-encoded PCM16 audio chunk for time-scheduled playback.
   * Converts base64 → Uint8Array → hands off to AudioStreamer.
   */
  const playAudioChunk = useCallback((base64: string) => {
    try {
      const streamer = getStreamer();

      // base64 → Uint8Array (PCM16 bytes)
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // Feed to AudioStreamer for gapless scheduling.
      streamer.addPCM16(bytes);

      // Update audio level ref for lip-sync during playback.
      // Use RMS from the raw float32 data.
      const int16 = new Int16Array(bytes.buffer);
      let sum = 0;
      for (let i = 0; i < int16.length; i++) {
        const sample = int16[i] / 32768;
        sum += sample * sample;
      }
      const rms = Math.sqrt(sum / int16.length);
      audioLevelRef.current = Math.min(1, rms * 4);
    } catch (err) {
      console.warn("[AudioProcessor] Playback error:", err);
    }
  }, [getStreamer]);

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
    audioLevelRef.current = 0;
  }, []);

  return {
    isMicActive,
    permissionError,
    audioLevelRef,
    startMic,
    stopMic,
    playAudioChunk,
    stopPlayback,
  };
}
