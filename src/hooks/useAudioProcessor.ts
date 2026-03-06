"use client";

import { useCallback, useRef, useState } from "react";
import { AUDIO_SAMPLE_RATE_INPUT, AUDIO_SAMPLE_RATE_OUTPUT } from "@/lib/constants";

/**
 * Handles:
 * 1. Capturing microphone audio → converting to 16kHz 16-bit PCM → base64
 * 2. Playing back Gemini audio responses (24kHz PCM)
 * 3. Computing audio levels for lip-sync
 */
export function useAudioProcessor() {
  const [isMicActive, setIsMicActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  // Playback refs
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const playbackQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);

  // ── Mic capture ──
  const startMic = useCallback(
    (onChunk: (base64: string) => void) => {
      (async () => {
        try {
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

          // Use ScriptProcessor as a fallback (AudioWorklet requires served worklet file)
          const processor = ctx.createScriptProcessor(4096, 1, 1);
          source.connect(processor);
          processor.connect(ctx.destination);

          processor.onaudioprocess = (e) => {
            const float32 = e.inputBuffer.getChannelData(0);
            // Convert Float32 → Int16
            const int16 = new Int16Array(float32.length);
            for (let i = 0; i < float32.length; i++) {
              const s = Math.max(-1, Math.min(1, float32[i]));
              int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }
            // Convert to base64
            const bytes = new Uint8Array(int16.buffer);
            let binary = "";
            for (let i = 0; i < bytes.length; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            onChunk(btoa(binary));
          };

          // Animation loop for audio level
          const updateLevel = () => {
            if (!analyserRef.current) return;
            const data = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(data);
            const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
            setAudioLevel(avg / 255);
            animFrameRef.current = requestAnimationFrame(updateLevel);
          };
          updateLevel();

          setIsMicActive(true);
        } catch (err) {
          console.error("[AudioProcessor] Mic error:", err);
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
    setIsMicActive(false);
    setAudioLevel(0);
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

      // Decode base64 → Int16 → Float32
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

      // Compute playback audio level for lip-sync
      const rms = Math.sqrt(
        float32.reduce((sum, v) => sum + v * v, 0) / float32.length
      );
      setAudioLevel(Math.min(1, rms * 4));

      if (!isPlayingRef.current) {
        drainQueue();
      }
    } catch (err) {
      console.warn("[AudioProcessor] Playback error:", err);
    }
  }, []);

  const drainQueue = useCallback(() => {
    const ctx = playbackCtxRef.current;
    if (!ctx || playbackQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setAudioLevel(0);
      return;
    }
    isPlayingRef.current = true;
    const buffer = playbackQueueRef.current.shift()!;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => drainQueue();
    source.start();
  }, []);

  return {
    isMicActive,
    audioLevel,
    startMic,
    stopMic,
    playAudioChunk,
  };
}
