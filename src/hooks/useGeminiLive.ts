"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from "@google/genai";
import {
  GEMINI_MODEL,
  GEMINI_TOOLS,
  SYSTEM_PROMPT,
  VAD_CONFIG,
} from "@/lib/constants";

export type GeminiStatus = "disconnected" | "connecting" | "connected" | "error";

export interface ToolCallPayload {
  name: string;
  args: Record<string, unknown>;
  id?: string;
}

/**
 * A typed handler that the application registers for a specific tool name.
 * It receives the parsed args and MUST return a result object that will be
 * sent back to the model as the function response.
 *
 * @example
 * registry.set("get_time_date", async () => ({
 *   iso: new Date().toISOString(),
 *   formatted: new Date().toLocaleString(),
 * }));
 */
export type ToolHandler = (
  args: Record<string, unknown>
) => Promise<Record<string, unknown>> | Record<string, unknown>;

export interface UseGeminiLiveReturn {
  status: GeminiStatus;
  connect: () => void;
  disconnect: () => void;
  sendVideoFrame: (base64: string) => void;
  sendAudioChunk: (base64: string) => void;
  sendText: (text: string) => void;
  /**
   * Register a handler for a specific Gemini function tool.
   * The return value is sent back as the FunctionResponse.
   * Call this before connecting. Handlers are stable across re-renders
   * if you wrap them in useCallback.
   */
  registerTool: (name: string, handler: ToolHandler) => void;
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
 * @returns Connection controls, send functions, tool registration, and callback refs
 *
 * @remarks
 * **Function Calling Pattern**
 * Use `registerTool(name, handler)` to provide real implementations for each
 * declared function. When the model triggers a function call, the handler is
 * awaited and its return value is sent back via `sendToolResponse` so the model
 * can use the actual result to generate its final response.
 *
 * If no handler is registered for a tool name, a fallback `{ result: "ok" }`
 * is returned (preserves backward compatibility) and a console warning is logged.
 *
 * **Callback Refs**
 * `onAudioData`, `onToolCall`, `onTranscript` are refs (not state) to avoid
 * re-renders on every audio chunk.
 *
 * @see https://ai.google.dev/gemini-api/docs/function-calling
 */
export function useGeminiLive(apiKey: string): UseGeminiLiveReturn {
  const sessionRef = useRef<Session | null>(null);
  const [status, setStatus] = useState<GeminiStatus>("disconnected");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tracks latest status to avoid stale closures in async callbacks
  const statusRef = useRef<GeminiStatus>(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // ── Callback refs — avoids re-rendering on every audio chunk ─────────────
  const onAudioData = useRef<((b64: string) => void) | null>(null);
  const onToolCall = useRef<((tc: ToolCallPayload) => void) | null>(null);
  const onTranscript = useRef<((text: string) => void) | null>(null);

  // ── Function tool registry ────────────────────────────────────────────────
  // Stores handlers registered by the application for each declared tool.
  const toolRegistryRef = useRef<Map<string, ToolHandler>>(new Map());

  const registerTool = useCallback((name: string, handler: ToolHandler) => {
    toolRegistryRef.current.set(name, handler);
  }, []);

  // ── SDK client — initialized once per apiKey ──────────────────────────────
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

    // ── Incoming message handler ──────────────────────────────────────────
    const handleMessage = (message: LiveServerMessage) => {
      try {
        // Server content: audio response and/or text transcript
        if (message.serverContent) {
          // Interruption — caller should clear any pending audio playback
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

        // Tool / function call
        if (message.toolCall) {
          const calls = message.toolCall.functionCalls;
          if (!calls) return;

          for (const call of calls) {
            const callName = call.name ?? "";
            const callArgs = (call.args ?? {}) as Record<string, unknown>;
            const callId = call.id ?? "";

            console.log("[GeminiLive] Tool call:", callName, callArgs);

            // Notify application (e.g. to trigger avatar animation)
            onToolCall.current?.({ name: callName, args: callArgs, id: callId });

            // Execute the registered handler and send the real result back
            const handler = toolRegistryRef.current.get(callName);

            const dispatchResult = async () => {
              let result: Record<string, unknown>;

              if (handler) {
                try {
                  result = await Promise.resolve(handler(callArgs));
                } catch (handlerErr) {
                  console.error(
                    `[GeminiLive] Handler for "${callName}" threw:`,
                    handlerErr
                  );
                  result = {
                    error: `Handler failed: ${
                      handlerErr instanceof Error
                        ? handlerErr.message
                        : String(handlerErr)
                    }`,
                  };
                }
              } else {
                // Backward-compatible fallback — warn so developers know to register
                console.warn(
                  `[GeminiLive] No handler registered for tool "${callName}". ` +
                    `Register one via registerTool("${callName}", handler). ` +
                    `Returning { result: "ok" } as fallback.`
                );
                result = { result: "ok" };
              }

              sessionRef.current?.sendToolResponse({
                functionResponses: [
                  {
                    id: callId,
                    name: callName,
                    response: result,
                  },
                ],
              });
            };

            // Fire-and-forget (Live API does not await tool responses)
            void dispatchResult();
          }
        }
      } catch (err) {
        console.warn("[GeminiLive] Failed to handle message:", err);
      }
    };

    // ── Connect using the official SDK ────────────────────────────────────
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tools: GEMINI_TOOLS as any,
          // Explicit VAD config for predictable turn-taking and interruption behavior
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          realtimeInputConfig: VAD_CONFIG as any,
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

  // ── Send helpers ──────────────────────────────────────────────────────────

  /** Send a base64 JPEG video frame */
  const sendVideoFrame = useCallback((base64Image: string) => {
    sessionRef.current?.sendRealtimeInput({
      video: {
        data: base64Image,
        mimeType: "image/jpeg",
      },
    });
  }, []);

  /** Send a base64 PCM audio chunk (16kHz, 16-bit mono) */
  const sendAudioChunk = useCallback((base64Audio: string) => {
    sessionRef.current?.sendRealtimeInput({
      audio: {
        data: base64Audio,
        mimeType: "audio/pcm;rate=16000",
      },
    });
  }, []);

  /** Send a text message to the model */
  const sendText = useCallback((text: string) => {
    sessionRef.current?.sendClientContent({
      turns: [{ role: "user", parts: [{ text }] }],
      turnComplete: true,
    });
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
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
    registerTool,
    onAudioData,
    onToolCall,
    onTranscript,
    errorMessage,
  };
}
