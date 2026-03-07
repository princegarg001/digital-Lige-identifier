"use client";

import { useCallback, useEffect, useState } from "react";
import { useGeminiLive } from "./useGeminiLive";
import { useAudioProcessor } from "./useAudioProcessor";
import { useWebcam } from "./useWebcam";

/**
 * Centralized session management hook.
 * Coordinates Gemini Live, audio, and webcam; wires built-in tool handlers.
 *
 * @remarks
 * **Built-in tool handlers registered here:**
 * - `get_time_date` — returns current ISO timestamp and locale string
 *
 * Application-level tools (e.g. `trigger_animation`, `set_persona_mode`,
 * `display_text`) should be registered by the page via the returned
 * `registerTool` function BEFORE calling `toggleSession`.
 */
export function useSessionManager(apiKey: string) {
  const { onAudioData: onAudioDataRef, registerTool, ...gemini } = useGeminiLive(apiKey);
  const audio = useAudioProcessor();
  const { onFrameRef, ...webcam } = useWebcam();

  const [isInitialized, setIsInitialized] = useState(false);
  const isConnected = gemini.status === "connected";

  // ── Wire up built-in tool handlers ────────────────────────────────────────
  // Registered once; stable because `registerTool` is memoised with useCallback.
  useEffect(() => {
    // get_time_date: lets the persona answer time/date questions accurately
    registerTool("get_time_date", () => {
      const now = new Date();
      return {
        iso: now.toISOString(),
        formatted: now.toLocaleString(),
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
      };
    });
  }, [registerTool]);

  // ── Wire Gemini audio output → speaker ───────────────────────────────────
  useEffect(() => {
    if (!isInitialized) return;
    onAudioDataRef.current = (b64) => {
      audio.playAudioChunk(b64);
    };
  }, [onAudioDataRef, audio, isInitialized]);

  // ── Wire webcam frames → Gemini ───────────────────────────────────────────
  useEffect(() => {
    if (!isInitialized) return;
    onFrameRef.current = (base64) => {
      if (isConnected) {
        gemini.sendVideoFrame(base64);
      }
    };
  }, [onFrameRef, isConnected, gemini, isInitialized]);

  // ── Session lifecycle ─────────────────────────────────────────────────────

  const startSession = useCallback(async () => {
    try {
      setIsInitialized(true);
      gemini.connect();
      audio.startMic((chunk) => {
        gemini.sendAudioChunk(chunk);
      });
    } catch (error) {
      console.error("[SessionManager] Failed to start session:", error);
      setIsInitialized(false);
    }
  }, [gemini, audio]);

  const stopSession = useCallback(() => {
    gemini.disconnect();
    audio.stopMic();
    webcam.stop();
    setIsInitialized(false);
  }, [gemini, audio, webcam]);

  const toggleSession = useCallback(() => {
    if (isConnected) {
      stopSession();
    } else {
      startSession();
    }
  }, [isConnected, startSession, stopSession]);

  const toggleMic = useCallback(() => {
    if (audio.isMicActive) {
      audio.stopMic();
    } else {
      audio.startMic((chunk) => {
        if (gemini.status === "connected") {
          gemini.sendAudioChunk(chunk);
        }
      });
    }
  }, [audio, gemini]);

  const toggleCamera = useCallback(() => {
    if (webcam.isActive) {
      webcam.stop();
    } else {
      webcam.start();
    }
  }, [webcam]);

  return {
    // State
    isConnected,
    status: gemini.status,
    errorMessage: gemini.errorMessage,
    audioLevelRef: audio.audioLevelRef,
    isMicActive: audio.isMicActive,
    isCameraActive: webcam.isActive,
    videoRef: webcam.videoRef,

    // Actions
    toggleSession,
    toggleMic,
    toggleCamera,
    sendText: gemini.sendText,

    /**
     * Register an application-level tool handler.
     * Must be called before `toggleSession` / `connect`.
     *
     * @example
     * registerTool("set_persona_mode", ({ mode }) => {
     *   setPersonaMode(mode as string);
     *   return { acknowledged: true, mode };
     * });
     */
    registerTool,

    // Callback refs (for transcript and tool-call side-effects in the page)
    onToolCall: gemini.onToolCall,
    onTranscript: gemini.onTranscript,
  };
}
