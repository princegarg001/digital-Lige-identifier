"use client";

import { useCallback, useEffect, useState } from "react";
import { useGeminiLive } from "./useGeminiLive";
import { useAudioProcessor } from "./useAudioProcessor";
import { useWebcam } from "./useWebcam";

/**
 * Centralized session management hook
 * Coordinates Gemini, audio, and webcam connections
 */
export function useSessionManager(apiKey: string) {
  const gemini = useGeminiLive(apiKey);
  const audio = useAudioProcessor();
  const webcam = useWebcam();

  const [isInitialized, setIsInitialized] = useState(false);
  const isConnected = gemini.status === "connected";

  // Wire up Gemini callbacks
  useEffect(() => {
    if (!isInitialized) return;

    gemini.onAudioData.current = (b64) => {
      audio.playAudioChunk(b64);
    };
  }, [gemini.onAudioData, audio, isInitialized]);

  // Wire webcam frames to Gemini
  useEffect(() => {
    if (!isInitialized) return;

    webcam.onFrameRef.current = (base64) => {
      if (isConnected) {
        gemini.sendVideoFrame(base64);
      }
    };
  }, [webcam.onFrameRef, isConnected, gemini, isInitialized]);

  // Start session
  const startSession = useCallback(async () => {
    try {
      setIsInitialized(true);
      gemini.connect();
      await webcam.start();
      audio.startMic((chunk) => {
        gemini.sendAudioChunk(chunk);
      });
    } catch (error) {
      console.error("[SessionManager] Failed to start session:", error);
      setIsInitialized(false);
    }
  }, [gemini, audio, webcam]);

  // Stop session
  const stopSession = useCallback(() => {
    gemini.disconnect();
    audio.stopMic();
    webcam.stop();
    setIsInitialized(false);
  }, [gemini, audio, webcam]);

  // Toggle session
  const toggleSession = useCallback(() => {
    if (isConnected) {
      stopSession();
    } else {
      startSession();
    }
  }, [isConnected, startSession, stopSession]);

  // Toggle mic only
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

  // Toggle camera only
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

    // Callbacks
    onToolCall: gemini.onToolCall,
    onTranscript: gemini.onTranscript,
  };
}
