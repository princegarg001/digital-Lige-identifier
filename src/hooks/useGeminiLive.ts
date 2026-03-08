"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from "@google/genai";
import {
  GEMINI_MODEL,
  GEMINI_TOOLS,
  SYSTEM_PROMPT,
} from "@/lib/constants";

/** Maximum time (ms) to wait for a tool handler before returning a timeout error. */
const TOOL_HANDLER_TIMEOUT_MS = 10_000;

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
  /** Fires when the server interrupts the current generation (user started speaking). */
  onInterrupted: React.RefObject<(() => void) | null>;
  /** Fires when the server cancels previously-issued tool calls (due to interruption). */
  onToolCallCancellation: React.RefObject<((ids: string[]) => void) | null>;
  /** The last session resumption handle (can be persisted for reconnection within 2 hrs). */
  lastSessionHandle: React.RefObject<string | null>;
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
export function useGeminiLive(): UseGeminiLiveReturn {
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
  const onInterrupted = useRef<(() => void) | null>(null);
  const onToolCallCancellation = useRef<((ids: string[]) => void) | null>(null);

  // ── Function tool registry ────────────────────────────────────────────────
  // Stores handlers registered by the application for each declared tool.
  const toolRegistryRef = useRef<Map<string, ToolHandler>>(new Map());

  const registerTool = useCallback((name: string, handler: ToolHandler) => {
    toolRegistryRef.current.set(name, handler);
  }, []);

  // ── Session resumption ──────────────────────────────────────────────────
  // Stores the latest session handle so reconnect can resume context.
  const sessionHandleRef = useRef<string | null>(null);

  // ── SDK client — instantiated dynamically per-connect using Ephemeral Token
  const clientRef = useRef<GoogleGenAI | null>(null);

  const disconnect = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    statusRef.current = "disconnected";
    setStatus("disconnected");
  }, []);

  const connect = useCallback(async () => {
    if (sessionRef.current) disconnect();

    statusRef.current = "connecting";
    setStatus("connecting");
    setErrorMessage(null);

    // 1. Fetch ephemeral token from the Next.js backend proxy
    try {
      const tokenRes = await fetch("/api/token", { method: "POST" });
      if (!tokenRes.ok) throw new Error("Failed to fetch Ephemeral Token");
      const { token, error } = await tokenRes.json();
      if (error) throw new Error(error);

      // 2. Initialize the client securely using this temporary 30-min token
      clientRef.current = new GoogleGenAI({ 
        apiKey: token,
        httpOptions: { apiVersion: "v1alpha" }
      });
    } catch (err) {
      console.error("[GeminiLive] Token error:", err);
      setErrorMessage(
        `Authentication failed: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      statusRef.current = "error";
      setStatus("error");
      return;
    }

    if (!clientRef.current) return;
    const ai = clientRef.current;

    // ── Incoming message handler ──────────────────────────────────────────
    const handleMessage = (message: LiveServerMessage) => {
      try {
        // Setup complete acknowledgement
        if (message.setupComplete) {
          console.log("[GeminiLive] Setup complete.");
          return;
        }

        // Session resumption — capture handle for reconnection
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const resumption = (message as any).sessionResumptionUpdate;
        if (resumption?.handle) {
          sessionHandleRef.current = resumption.handle as string;
          console.log("[GeminiLive] Session resumption handle updated.");
        }

        // Tool call cancellation (interruption cancelled pending tool calls)
        if (message.toolCallCancellation) {
          const cancelledIds = message.toolCallCancellation.ids ?? [];
          console.log("[GeminiLive] Tool calls cancelled:", cancelledIds);
          onToolCallCancellation.current?.(cancelledIds);
          return;
        }

        // Server content: audio response and/or text transcript
        if (message.serverContent) {
          // Interruption — stop and empty playback queue
          if (message.serverContent.interrupted) {
            console.log("[GeminiLive] Interrupted by user speech — stopping playback.");
            onInterrupted.current?.();
            return;
          }

          // Turn complete
          if (message.serverContent.turnComplete) {
            console.log("[GeminiLive] Turn complete.");
          }

          // Transcription events (input or output)
          if (message.serverContent.outputTranscription?.text) {
            onTranscript.current?.(message.serverContent.outputTranscription.text);
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
                  // Race the handler against a timeout so a stuck handler
                  // doesn't block the model indefinitely.
                  const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(
                      () => reject(new Error(`Tool handler "${callName}" timed out after ${TOOL_HANDLER_TIMEOUT_MS}ms`)),
                      TOOL_HANDLER_TIMEOUT_MS
                    )
                  );
                  result = await Promise.race([
                    Promise.resolve(handler(callArgs)),
                    timeoutPromise,
                  ]);
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
          // VAD configuration — uses server-side automatic activity detection
          realtimeInputConfig: {
            automaticActivityDetection: {
              // Use defaults: server-side VAD with HIGH sensitivity
            },
          },
          // Enable output transcription for transcript events
          outputAudioTranscription: {},
          // Context window compression — prevents long sessions from crashing.
          // Native audio generates ~25 tokens/sec; without this a 10-minute
          // session hits the context limit and the server terminates the session.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          contextWindowCompression: { slidingWindow: {} } as any,
          // Session resumption — reconnect with prior context if a handle exists
          ...(sessionHandleRef.current
            ? {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                sessionResumption: { handle: sessionHandleRef.current } as any,
              }
            : {}),
        },
        callbacks: {
          onopen: () => {
            console.log("[GeminiLive] Connected via SDK.");
            statusRef.current = "connected";
            setStatus("connected");
          },
          onmessage: handleMessage,
          onerror: (e: ErrorEvent) => {
            console.error("[GeminiLive] SDK error:", e.message);
            setErrorMessage(
              `Connection error: ${e.message || "Check API Key and network."}`
            );
            statusRef.current = "error";
            setStatus("error");
          },
          onclose: (e: CloseEvent) => {
            console.log("[GeminiLive] Session closed:", e.code, e.reason);
            if (statusRef.current !== "disconnected") {
              statusRef.current = "disconnected";
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
        statusRef.current = "error";
        setStatus("error");
      });
  }, [disconnect]);

  // ── Send helpers ──────────────────────────────────────────────────────────

  /** Send a base64 JPEG video frame */
  const sendVideoFrame = useCallback((base64Image: string) => {
    if (statusRef.current !== "connected") return;
    try {
      sessionRef.current?.sendRealtimeInput({
        video: {
          data: base64Image,
          mimeType: "image/jpeg",
        },
      });
    } catch (e) {
      console.warn("[GeminiLive] Failed to send video frame:", e);
    }
  }, []);

  /** Send a base64 PCM audio chunk (16kHz, 16-bit mono) */
  const sendAudioChunk = useCallback((base64Audio: string) => {
    if (statusRef.current !== "connected") return;
    try {
      sessionRef.current?.sendRealtimeInput({
        audio: {
          data: base64Audio,
          mimeType: "audio/pcm;rate=16000",
        },
      });
    } catch (e) {
      console.warn("[GeminiLive] Failed to send audio chunk:", e);
    }
  }, []);

  /** Send a text message to the model */
  const sendText = useCallback((text: string) => {
    if (statusRef.current !== "connected") return;
    try {
      sessionRef.current?.sendClientContent({
        turns: [{ role: "user", parts: [{ text }] }],
        turnComplete: true,
      });
    } catch (e) {
      console.warn("[GeminiLive] Failed to send text:", e);
    }
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
    onInterrupted,
    onToolCallCancellation,
    lastSessionHandle: sessionHandleRef,
    errorMessage,
  };
}
