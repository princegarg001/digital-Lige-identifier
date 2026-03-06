"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  GEMINI_MODEL,
  GEMINI_TOOLS,
  GEMINI_WS_URL,
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
 * Manages the WebSocket connection to the Gemini Multimodal Live API.
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
  const socketRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<GeminiStatus>("disconnected");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Use a ref to track latest status to avoid stale closures in WS handlers
  const statusRef = useRef<GeminiStatus>(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Callback refs — avoids re-rendering on every audio chunk
  const onAudioData = useRef<((b64: string) => void) | null>(null);
  const onToolCall = useRef<((tc: ToolCallPayload) => void) | null>(null);
  const onTranscript = useRef<((text: string) => void) | null>(null);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setStatus("disconnected");
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current) disconnect();

    setStatus("connecting");
    setErrorMessage(null);

    const url = `${GEMINI_WS_URL}?key=${apiKey}`;
    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("[GeminiLive] WebSocket opened, sending setup...");
      ws.send(
        JSON.stringify({
          setup: {
            model: GEMINI_MODEL,
            generation_config: {
              response_modalities: ["AUDIO"],
              speech_config: {
                voice_config: {
                  prebuilt_voice_config: {
                    voice_name: "Aoede",
                  },
                },
              },
            },
            system_instruction: {
              parts: [{ text: SYSTEM_PROMPT }],
            },
            tools: GEMINI_TOOLS,
          },
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Setup complete
        if (data.setupComplete) {
          console.log("[GeminiLive] Setup complete, ready to stream.");
          setStatus("connected");
          return;
        }

        // Server content (audio response and/or text)
        if (data.serverContent) {
          const parts = data.serverContent.modelTurn?.parts;
          if (parts) {
            for (const part of parts) {
              if (part.inlineData?.mimeType?.startsWith("audio/")) {
                onAudioData.current?.(part.inlineData.data);
              }
              if (part.text) {
                onTranscript.current?.(part.text);
              }
            }
          }
        }

        // Tool call response
        if (data.toolCall) {
          const calls = data.toolCall.functionCalls;
          if (calls) {
            for (const call of calls) {
              console.log("[GeminiLive] Tool call:", call.name, call.args);
              onToolCall.current?.({
                name: call.name,
                args: call.args || {},
                id: call.id,
              });

              // Send tool response back
              ws.send(
                JSON.stringify({
                  toolResponse: {
                    functionResponses: [
                      {
                        id: call.id,
                        name: call.name,
                        response: { result: "ok" },
                      },
                    ],
                  },
                })
              );
            }
          }
        }
      } catch (err) {
        console.warn("[GeminiLive] Failed to parse message:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("[GeminiLive] WebSocket error:", err);
      setErrorMessage("WebSocket connection error");
      setStatus("error");
    };

    // FIX: Use statusRef to avoid stale closure
    ws.onclose = (event) => {
      console.log("[GeminiLive] WebSocket closed:", event.code, event.reason);
      if (statusRef.current !== "disconnected") {
        setStatus("disconnected");
      }
    };
  }, [apiKey, disconnect]);

  // Send a base64 JPEG video frame
  const sendVideoFrame = useCallback((base64Image: string) => {
    const ws = socketRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          realtimeInput: {
            mediaChunks: [
              {
                data: base64Image,
                mimeType: "image/jpeg",
              },
            ],
          },
        })
      );
    }
  }, []);

  // Send a base64 PCM audio chunk
  const sendAudioChunk = useCallback((base64Audio: string) => {
    const ws = socketRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          realtimeInput: {
            mediaChunks: [
              {
                data: base64Audio,
                mimeType: "audio/pcm;rate=16000",
              },
            ],
          },
        })
      );
    }
  }, []);

  // Send a text message
  const sendText = useCallback((text: string) => {
    const ws = socketRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          clientContent: {
            turns: [{ role: "user", parts: [{ text }] }],
            turnComplete: true,
          },
        })
      );
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      socketRef.current?.close();
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
