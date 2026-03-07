"use client";

import { useCallback, useRef, useState } from "react";
import { AUDIO_SAMPLE_RATE_INPUT, AUDIO_SAMPLE_RATE_OUTPUT } from "@/lib/constants";

/**
 * Manages microphone audio capture, Gemini audio playback, and real-time audio levels.
 *
 * @remarks
 * - Capture: Records at 16kHz 16-bit PCM mono, outputs base64 chunks.
 * - Playback: Decodes 24kHz PCM from Gemini and queues sequential playback.
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
   * @see vercel-react-best-practices: rerender-use-ref-transient-values
   */
  const audioLevelRef = useRef(0);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  // Playback refs
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const playbackQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);

  // ── Mic capture ──
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

          // Analyser for audio level (used for lip-sync)
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          analyserRef.current = analyser;

          // ScriptProcessor for PCM capture
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
    []
  );

  const stopMic = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close();
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
    processorRef.current = null;
    setIsMicActive(false);
    audioLevelRef.current = 0;
  }, []);

  const drainQueue = useCallback(function drain() {
    const ctx = playbackCtxRef.current;
    if (!ctx || playbackQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      audioLevelRef.current = 0;
      return;
    }
    isPlayingRef.current = true;
    const buffer = playbackQueueRef.current.shift()!;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => drain();
    source.start();
  }, []);

  // ── Playback of Gemini audio ──
  const playAudioChunk = useCallback((base64: string) => {
    try {
      if (!playbackCtxRef.current) {
        playbackCtxRef.current = new AudioContext({
          sampleRate: AUDIO_SAMPLE_RATE_OUTPUT,
        });
      }
      const ctx = playbackCtxRef.current;

      // base64 → Int16 → Float32
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 0x7fff;
      }

      const buffer = ctx.createBuffer(1, float32.length, AUDIO_SAMPLE_RATE_OUTPUT);
      buffer.copyToChannel(float32, 0);
      playbackQueueRef.current.push(buffer);

      // Update audio level ref for lip-sync during playback
      const rms = Math.sqrt(
        float32.reduce((sum, v) => sum + v * v, 0) / float32.length
      );
      audioLevelRef.current = Math.min(1, rms * 4);

      if (!isPlayingRef.current) {
        drainQueue();
      }
    } catch (err) {
      console.warn("[AudioProcessor] Playback error:", err);
    }
  }, [drainQueue]);

  return {
    isMicActive,
    permissionError,
    audioLevelRef,
    startMic,
    stopMic,
    playAudioChunk,
  };
}
