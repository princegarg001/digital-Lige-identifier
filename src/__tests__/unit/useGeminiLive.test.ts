/**
 * Unit Tests for useGeminiLive Hook
 * Tests SDK-based connection, message handling, and API integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Must define __mockConnect and __mockSession at module level
// since vi.mock factory is hoisted above all other code
const __mockSession = {
  sendRealtimeInput: vi.fn(),
  sendClientContent: vi.fn(),
  sendToolResponse: vi.fn(),
  close: vi.fn(),
};

let __capturedCallbacks: {
  onopen?: () => void;
  onmessage?: (msg: unknown) => void;
  onerror?: (e: ErrorEvent) => void;
  onclose?: (e: CloseEvent) => void;
} = {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const __mockConnect = vi.fn(async (options: any) => {
  __capturedCallbacks = options.callbacks || {};
  setTimeout(() => {
    __capturedCallbacks.onopen?.();
  }, 0);
  return __mockSession;
});

vi.mock('@google/genai', () => {
  class GoogleGenAI {
    live = { connect: __mockConnect };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_config: { apiKey: string }) {}
  }

  return {
    GoogleGenAI,
    Modality: { AUDIO: 'AUDIO' },
    Type: {
      TYPE_UNSPECIFIED: 'TYPE_UNSPECIFIED',
      STRING: 'STRING',
      NUMBER: 'NUMBER',
      INTEGER: 'INTEGER',
      BOOLEAN: 'BOOLEAN',
      ARRAY: 'ARRAY',
      OBJECT: 'OBJECT',
      NULL: 'NULL',
    },
  };
});

// Import AFTER mock is set up (vitest hoists the mock above imports)
import { useGeminiLive } from '@/hooks/useGeminiLive';

describe('useGeminiLive Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __capturedCallbacks = {};
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Connection Management', () => {
    it('should initialize with disconnected status', () => {
      const { result } = renderHook(() => useGeminiLive('test-api-key'));
      expect(result.current.status).toBe('disconnected');
    });

    it('should connect using the SDK', async () => {
      const { result } = renderHook(() => useGeminiLive('test-api-key'));
      
      act(() => {
        result.current.connect();
      });

      expect(result.current.status).toBe('connecting');

      await vi.waitFor(() => {
        expect(__mockConnect).toHaveBeenCalledTimes(1);
      });

      await vi.waitFor(() => {
        expect(result.current.status).toBe('connected');
      });
    });

    it('should pass correct model and config to SDK', async () => {
      const { result } = renderHook(() => useGeminiLive('test-api-key'));
      
      act(() => {
        result.current.connect();
      });

      await vi.waitFor(() => {
        expect(__mockConnect).toHaveBeenCalledTimes(1);
        const callArgs = __mockConnect.mock.calls[0][0];
        expect(callArgs.model).toBe('gemini-2.5-flash-native-audio-preview-12-2025');
        expect(callArgs.config.responseModalities).toEqual(['AUDIO']);
        expect(callArgs.callbacks.onopen).toBeDefined();
        expect(callArgs.callbacks.onmessage).toBeDefined();
      });
    });

    it('should handle disconnection', async () => {
      const { result } = renderHook(() => useGeminiLive('test-api-key'));
      
      act(() => {
        result.current.connect();
      });

      await vi.waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.status).toBe('disconnected');
      expect(__mockSession.close).toHaveBeenCalled();
    });
  });

  describe('Video Frame Streaming', () => {
    it('should send video frames via SDK session', async () => {
      const { result } = renderHook(() => useGeminiLive('test-api-key'));
      
      act(() => {
        result.current.connect();
      });

      await vi.waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      const testFrame = 'base64encodedimage';
      
      act(() => {
        result.current.sendVideoFrame(testFrame);
      });

      expect(__mockSession.sendRealtimeInput).toHaveBeenCalledWith({
        video: {
          data: testFrame,
          mimeType: 'image/jpeg',
        },
      });
    });

    it('should not throw when sending frames before connected', () => {
      const { result } = renderHook(() => useGeminiLive('test-api-key'));
      
      expect(() => {
        act(() => {
          result.current.sendVideoFrame('test');
        });
      }).not.toThrow();
    });
  });

  describe('Audio Streaming', () => {
    it('should send audio chunks via SDK session', async () => {
      const { result } = renderHook(() => useGeminiLive('test-api-key'));
      
      act(() => {
        result.current.connect();
      });

      await vi.waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      const testAudio = 'base64encodedaudio';
      
      act(() => {
        result.current.sendAudioChunk(testAudio);
      });

      expect(__mockSession.sendRealtimeInput).toHaveBeenCalledWith({
        audio: {
          data: testAudio,
          mimeType: 'audio/pcm;rate=16000',
        },
      });
    });
  });

  describe('Text Sending', () => {
    it('should send text via SDK sendClientContent', async () => {
      const { result } = renderHook(() => useGeminiLive('test-api-key'));
      
      act(() => {
        result.current.connect();
      });

      await vi.waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      act(() => {
        result.current.sendText('Hello world');
      });

      expect(__mockSession.sendClientContent).toHaveBeenCalledWith({
        turns: [{ role: 'user', parts: [{ text: 'Hello world' }] }],
        turnComplete: true,
      });
    });
  });

  describe('Response Handling', () => {
    it('should handle audio responses', async () => {
      const { result } = renderHook(() => useGeminiLive('test-api-key'));
      
      const audioCallback = vi.fn();
      result.current.onAudioData.current = audioCallback;

      act(() => {
        result.current.connect();
      });

      await vi.waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      act(() => {
        __capturedCallbacks.onmessage?.({
          serverContent: {
            modelTurn: {
              parts: [
                {
                  inlineData: {
                    mimeType: 'audio/pcm',
                    data: 'audiodata123'
                  }
                }
              ]
            }
          }
        });
      });

      expect(audioCallback).toHaveBeenCalledWith('audiodata123');
    });

    it('should handle text transcripts', async () => {
      const { result } = renderHook(() => useGeminiLive('test-api-key'));
      
      const transcriptCallback = vi.fn();
      result.current.onTranscript.current = transcriptCallback;

      act(() => {
        result.current.connect();
      });

      await vi.waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      act(() => {
        __capturedCallbacks.onmessage?.({
          serverContent: {
            modelTurn: {
              parts: [{ text: 'Hello, how can I help you?' }]
            }
          }
        });
      });

      expect(transcriptCallback).toHaveBeenCalledWith('Hello, how can I help you?');
    });

    it('should handle tool calls and send responses', async () => {
      const { result } = renderHook(() => useGeminiLive('test-api-key'));
      
      const toolCallback = vi.fn();
      result.current.onToolCall.current = toolCallback;

      act(() => {
        result.current.connect();
      });

      await vi.waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      act(() => {
        __capturedCallbacks.onmessage?.({
          toolCall: {
            functionCalls: [
              {
                id: 'call-123',
                name: 'trigger_animation',
                args: { gesture_name: 'wave' }
              }
            ]
          }
        });
      });

      expect(toolCallback).toHaveBeenCalledWith({
        name: 'trigger_animation',
        args: { gesture_name: 'wave' },
        id: 'call-123'
      });

      expect(__mockSession.sendToolResponse).toHaveBeenCalledWith({
        functionResponses: [
          {
            id: 'call-123',
            name: 'trigger_animation',
            response: { result: 'ok' },
          },
        ],
      });
    });

    it('should handle interruptions gracefully', async () => {
      const { result } = renderHook(() => useGeminiLive('test-api-key'));
      
      const audioCallback = vi.fn();
      result.current.onAudioData.current = audioCallback;

      act(() => {
        result.current.connect();
      });

      await vi.waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      expect(() => {
        act(() => {
          __capturedCallbacks.onmessage?.({
            serverContent: {
              interrupted: true,
            }
          });
        });
      }).not.toThrow();

      expect(audioCallback).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle SDK connection errors', async () => {
      __mockConnect.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useGeminiLive('test-api-key'));
      
      act(() => {
        result.current.connect();
      });

      await vi.waitFor(() => {
        expect(result.current.status).toBe('error');
        expect(result.current.errorMessage).toContain('Network error');
      });
    });

    it('should handle onerror callback', async () => {
      const { result } = renderHook(() => useGeminiLive('test-api-key'));
      
      act(() => {
        result.current.connect();
      });

      await vi.waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      act(() => {
        __capturedCallbacks.onerror?.(new ErrorEvent('error', { message: 'WebSocket failed' }));
      });

      await vi.waitFor(() => {
        expect(result.current.status).toBe('error');
        expect(result.current.errorMessage).toContain('WebSocket failed');
      });
    });
  });
});
