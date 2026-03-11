"use client";

import { useCallback, useEffect, useState, useRef } from "react";
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
export function useSessionManager() {
  const { onAudioData: onAudioDataRef, onInterrupted: onInterruptedRef, registerTool, ...gemini } = useGeminiLive();
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

  // ── Wire Gemini interruption → stop playback immediately ────────────────
  // Official docs: "stop and empty the current playback queue"
  useEffect(() => {
    if (!isInitialized) return;
    onInterruptedRef.current = () => {
      audio.stopPlayback();
    };
  }, [onInterruptedRef, audio, isInitialized]);

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

  // Auto-cleanup media devices if Gemini drops connection (error or network loss)
  useEffect(() => {
    if (!isInitialized) return;
    if (gemini.status === "disconnected" || gemini.status === "error") {
      audio.stopMic();
      webcam.stop();
      setTimeout(() => setIsInitialized(false), 0);
    }
  }, [gemini.status, isInitialized, audio, webcam]);

  const startSession = useCallback(async () => {
    try {
      setIsInitialized(true);
      
      // Proactively initialize and resume the playback AudioContext during 
      // the user gesture to satisfy browser autoplay policies.
      const streamer = audio.ensureStreamer();
      if (streamer.context.state === "suspended") {
        await streamer.context.resume();
        console.log("[SessionManager] Playback AudioContext resumed via user gesture.");
      }

      await gemini.connect();
      audio.startMic((chunk) => {
        // While assistant audio is playing, suppress low-level mic bleed to avoid echo loops.
        if (
          audio.isAssistantSpeakingRef.current &&
          (audio.inputAudioLevelRef.current ?? 0) < 0.2
        ) {
          return;
        }
        gemini.sendAudioChunk(chunk);
      });
    } catch (error) {
      console.error("[SessionManager] Failed to start session:", error);
      setIsInitialized(false);
    }
  }, [gemini, audio]);

  const stopSession = useCallback(() => {
    gemini.disconnect();
    audio.stopPlayback();
    audio.stopMic();
    webcam.stop();
    setIsInitialized(false);
  }, [gemini, audio, webcam]);

  // Synchronous lock to prevent dual invocations
  const isTransitioning = useRef(false);

  const toggleSession = useCallback(() => {
    if (isTransitioning.current) return;
    
    // Guard against double-start: only allow starting when strictly "disconnected".
    if (gemini.status !== "disconnected") {
      isTransitioning.current = true;
      stopSession();
      setTimeout(() => { isTransitioning.current = false; }, 500);
    } else {
      isTransitioning.current = true;
      startSession().finally(() => {
        isTransitioning.current = false;
      });
    }
  }, [gemini.status, startSession, stopSession]);

  const toggleMic = useCallback(() => {
    if (audio.isMicActive) {
      audio.stopMic();
    } else {
      audio.startMic((chunk) => {
        if (
          audio.isAssistantSpeakingRef.current &&
          (audio.inputAudioLevelRef.current ?? 0) < 0.2
        ) {
          return;
        }
        gemini.sendAudioChunk(chunk);
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
    micError: audio.permissionError,
    cameraError: webcam.permissionError,
    audioLevelRef: audio.audioLevelRef,
    assistantAudioLevelRef: audio.outputAudioLevelRef,
    isMicActive: audio.isMicActive,
    isCameraActive: webcam.isActive,
    videoRef: webcam.videoRef,

    // Actions
    toggleSession,
    toggleMic,
    toggleCamera,
    sendText: gemini.sendText,

    // Audio Scheduling Callback
    onAudioScheduledRef: audio.onAudioScheduledRef,

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
