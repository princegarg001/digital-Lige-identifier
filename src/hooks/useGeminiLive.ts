"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from "@google/genai";
import {
  GEMINI_MODEL,
  GEMINI_TOOLS,
  SYSTEM_PROMPT,
} from "@/lib/constants";

export type GeminiStatus = "disconnected" | "connecting" | "connected" | "error";

export interface ToolCallPayload {
  name: string;
  args: Record<string, string>;
  id?: string;
}

export interface UseGeminiLiveReturn {
  status: GeminiStatus;
  connect: () => void;
  disconnect: () => void;
  sendVideoFrame: (base64: string) => void;
  sendAudioChunk: (base64: string) => void;
  sendText: (text: string) => void;
  onAudioData: React.RefObject<((b64: string) => void) | null>;
  onToolCall: React.RefObject<((tc: ToolCallPayload) => void) | null>;
  onTranscript: React.RefObject<((text: string) => void) | null>;
  errorMessage: string | null;
}

/**
 * Manages the connection to the Gemini Multimodal Live API
 * using the official @google/genai SDK.
 *
 * @param apiKey - Gemini API key from environment
 * @returns Connection controls, send functions, and callback refs
 *
 * @remarks
 * Callback refs (`onAudioData`, `onToolCall`, `onTranscript`) are used
 * instead of callback props to avoid re-renders on every audio chunk.
 * @see vercel-react-best-practices: advanced-event-handler-refs
 */
export function useGeminiLive(apiKey: string): UseGeminiLiveReturn {
  const sessionRef = useRef<Session | null>(null);
  const [status, setStatus] = useState<GeminiStatus>("disconnected");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Use a ref to track latest status to avoid stale closures in callbacks
  const statusRef = useRef<GeminiStatus>(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Callback refs — avoids re-rendering on every audio chunk
  const onAudioData = useRef<((b64: string) => void) | null>(null);
  const onToolCall = useRef<((tc: ToolCallPayload) => void) | null>(null);
  const onTranscript = useRef<((text: string) => void) | null>(null);

  // SDK client — initialized once per apiKey
  const clientRef = useRef<GoogleGenAI | null>(null);
  useEffect(() => {
    clientRef.current = new GoogleGenAI({ apiKey });
  }, [apiKey]);

  const disconnect = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setStatus("disconnected");
  }, []);

  const connect = useCallback(() => {
    if (sessionRef.current) disconnect();
    if (!clientRef.current) {
      setErrorMessage("SDK client not initialized. Check API key.");
      setStatus("error");
      return;
    }

    setStatus("connecting");
    setErrorMessage(null);

    const ai = clientRef.current;

    // Handle incoming messages from the Live API
    const handleMessage = (message: LiveServerMessage) => {
      try {
        // Server content (audio response and/or text)
        if (message.serverContent) {
          // Handle interruption — clear any pending audio
          if (message.serverContent.interrupted) {
            console.log("[GeminiLive] Interrupted by user speech.");
            return;
          }

          const parts = message.serverContent.modelTurn?.parts;
          if (parts) {
            for (const part of parts) {
              if (part.inlineData?.mimeType?.startsWith("audio/")) {
                onAudioData.current?.(part.inlineData.data as string);
              }
              if (part.text) {
                onTranscript.current?.(part.text);
              }
            }
          }
        }

        // Tool call response
        if (message.toolCall) {
          const calls = message.toolCall.functionCalls;
          if (calls) {
            for (const call of calls) {
              console.log("[GeminiLive] Tool call:", call.name, call.args);
              onToolCall.current?.({
                name: call.name || "",
                args: (call.args as Record<string, string>) || {},
                id: call.id,
              });

              // Send tool response back via SDK
              sessionRef.current?.sendToolResponse({
                functionResponses: [
                  {
                    id: call.id || "",
                    name: call.name || "",
                    response: { result: "ok" },
                  },
                ],
              });
            }
          }
        }
      } catch (err) {
        console.warn("[GeminiLive] Failed to handle message:", err);
      }
    };

    // Connect using the official SDK
    ai.live
      .connect({
        model: GEMINI_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Aoede",
              },
            },
          },
          systemInstruction: SYSTEM_PROMPT,
          tools: GEMINI_TOOLS,
        },
        callbacks: {
          onopen: () => {
            console.log("[GeminiLive] Connected via SDK.");
            setStatus("connected");
          },
          onmessage: handleMessage,
          onerror: (e: ErrorEvent) => {
            console.error("[GeminiLive] SDK error:", e.message);
            setErrorMessage(
              `Connection error: ${e.message || "Check API Key and network."}`
            );
            setStatus("error");
          },
          onclose: (e: CloseEvent) => {
            console.log("[GeminiLive] Session closed:", e.code, e.reason);
            if (statusRef.current !== "disconnected") {
              setStatus("disconnected");
            }
          },
        },
      })
      .then((session) => {
        sessionRef.current = session;
        console.log("[GeminiLive] Session established.");
      })
      .catch((err) => {
        console.error("[GeminiLive] Failed to connect:", err);
        setErrorMessage(
          `Failed to connect: ${err instanceof Error ? err.message : String(err)}`
        );
        setStatus("error");
      });
  }, [disconnect]);

  // Send a base64 JPEG video frame
  const sendVideoFrame = useCallback((base64Image: string) => {
    sessionRef.current?.sendRealtimeInput({
      video: {
        data: base64Image,
        mimeType: "image/jpeg",
      },
    });
  }, []);

  // Send a base64 PCM audio chunk
  const sendAudioChunk = useCallback((base64Audio: string) => {
    sessionRef.current?.sendRealtimeInput({
      audio: {
        data: base64Audio,
        mimeType: "audio/pcm;rate=16000",
      },
    });
  }, []);

  // Send a text message
  const sendText = useCallback((text: string) => {
    sessionRef.current?.sendClientContent({
      turns: [{ role: "user", parts: [{ text }] }],
      turnComplete: true,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sessionRef.current?.close();
    };
  }, []);

  return {
    status,
    connect,
    disconnect,
    sendVideoFrame,
    sendAudioChunk,
    sendText,
    onAudioData,
    onToolCall,
    onTranscript,
    errorMessage,
  };
}
