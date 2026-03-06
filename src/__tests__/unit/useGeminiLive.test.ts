/**
 * Unit Tests for useGeminiLive Hook
 * Tests WebSocket connection, message handling, and API integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGeminiLive } from '@/hooks/useGeminiLive';

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  
  sentMessages: string[] = [];

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 0);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  // Helper to simulate receiving messages
  simulateMessage(data: any) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }

  static reset() {
    MockWebSocket.instances = [];
  }

  static getLastInstance(): MockWebSocket | undefined {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1];
  }
}

describe('useGeminiLive Hook', () => {
  beforeEach(() => {
    // Replace global WebSocket with our mock class
    global.WebSocket = MockWebSocket as any;
    MockWebSocket.reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should initialize with disconnected status', () => {
      const { result } = renderHook(() => useGeminiLive('test-api-key'));
      expect(result.current.status).toBe('disconnected');
    });

    it('should connect to Gemini WebSocket with correct URL', async () => {
      const { result } = renderHook(() => useGeminiLive('test-api-key'));
      
      act(() => {
        result.current.connect();
      });

      await vi.waitFor(() => {
        const instance = MockWebSocket.getLastInstance();
        expect(instance).toBeDefined();
        expect(instance!.url).toContain('wss://generativelanguage.googleapis.com');
        expect(instance!.url).toContain('key=test-api-key');
      });
    });

    it('should send setup message on connection', async () => {
      const { result } = renderHook(() => useGeminiLive('test-api-key'));
      
      act(() => {
        result.current.connect();
      });

      await vi.waitFor(() => {
        const instance = MockWebSocket.getLastInstance();
        expect(instance).toBeDefined();
        expect(instance!.sentMessages.length).toBeGreaterThan(0);
        const setupMsg = JSON.parse(instance!.sentMessages[0]);
        expect(setupMsg.setup).toBeDefined();
        expect(setupMsg.setup.model).toBe('models/gemini-2.0-flash-live-001');
      });
    });

    it('should transition to connected status after setup complete', async () => {
      const { result } = renderHook(() => useGeminiLive('test-api-key'));
      
      act(() => {
        result.current.connect();
      });

      await vi.waitFor(() => {
        expect(result.current.status).toBe('connecting');
      });

      act(() => {
        const instance = MockWebSocket.getLastInstance();
        instance!.simulateMessage({ setupComplete: true });
      });

      await vi.waitFor(() => {
        expect(result.current.status).toBe('connected');
      });
    });

    it('should handle disconnection', async () => {
      const { result } = renderHook(() => useGeminiLive('test-api-key'));
      
      act(() => {
        result.current.connect();
      });

      await vi.waitFor(() => {
        expect(result.current.status).toBe('connecting');
      });

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.status).toBe('disconnected');
    });
  });

  describe('Video Frame Streaming', () => {
    it('should send video frames in correct format', async () => {
      const { result } = renderHook(() => useGeminiLive('test-api-key'));
      
      act(() => {
        result.current.connect();
      });

      // Wait for connection to actually open
      await vi.waitFor(() => {
        expect(MockWebSocket.getLastInstance()?.readyState).toBe(MockWebSocket.OPEN);
      });

      act(() => {
        const instance = MockWebSocket.getLastInstance();
        instance!.simulateMessage({ setupComplete: true });
      });

      await vi.waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      const testFrame = 'base64encodedimage';
      
      act(() => {
        result.current.sendVideoFrame(testFrame);
      });

      const instance = MockWebSocket.getLastInstance();
      const videoMsg = instance!.sentMessages.find(msg => 
        msg.includes('realtimeInput')
      );
      
      expect(videoMsg).toBeDefined();
      const parsed = JSON.parse(videoMsg!);
      expect(parsed.realtimeInput.mediaChunks[0].data).toBe(testFrame);
      expect(parsed.realtimeInput.mediaChunks[0].mimeType).toBe('image/jpeg');
    });

    it('should not send frames when disconnected', () => {
      const { result } = renderHook(() => useGeminiLive('test-api-key'));
      
      const instance = MockWebSocket.getLastInstance();
      const initialLength = instance?.sentMessages?.length || 0;
      
      act(() => {
        result.current.sendVideoFrame('test');
      });

      expect(instance?.sentMessages?.length || 0).toBe(initialLength);
    });
  });

  describe('Audio Streaming', () => {
    it('should send audio chunks in correct format', async () => {
      const { result } = renderHook(() => useGeminiLive('test-api-key'));
      
      act(() => {
        result.current.connect();
      });

      // Wait for connection to actually open
      await vi.waitFor(() => {
        expect(MockWebSocket.getLastInstance()?.readyState).toBe(MockWebSocket.OPEN);
      });

      act(() => {
        const instance = MockWebSocket.getLastInstance();
        instance!.simulateMessage({ setupComplete: true });
      });

      await vi.waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      const testAudio = 'base64encodedaudio';
      
      act(() => {
        result.current.sendAudioChunk(testAudio);
      });

      const instance = MockWebSocket.getLastInstance();
      const audioMsg = instance!.sentMessages.find(msg => 
        msg.includes('audio/pcm')
      );
      
      expect(audioMsg).toBeDefined();
      const parsed = JSON.parse(audioMsg!);
      expect(parsed.realtimeInput.mediaChunks[0].data).toBe(testAudio);
      expect(parsed.realtimeInput.mediaChunks[0].mimeType).toBe('audio/pcm;rate=16000');
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
        const instance = MockWebSocket.getLastInstance();
        instance!.simulateMessage({ setupComplete: true });
      });

      act(() => {
        const instance = MockWebSocket.getLastInstance();
        instance!.simulateMessage({
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
        const instance = MockWebSocket.getLastInstance();
        instance!.simulateMessage({ setupComplete: true });
      });

      act(() => {
        const instance = MockWebSocket.getLastInstance();
        instance!.simulateMessage({
          serverContent: {
            modelTurn: {
              parts: [{ text: 'Hello, how can I help you?' }]
            }
          }
        });
      });

      expect(transcriptCallback).toHaveBeenCalledWith('Hello, how can I help you?');
    });

    it('should handle tool calls', async () => {
      const { result } = renderHook(() => useGeminiLive('test-api-key'));
      
      const toolCallback = vi.fn();
      result.current.onToolCall.current = toolCallback;

      act(() => {
        result.current.connect();
      });

      await vi.waitFor(() => {
        const instance = MockWebSocket.getLastInstance();
        instance!.simulateMessage({ setupComplete: true });
      });

      act(() => {
        const instance = MockWebSocket.getLastInstance();
        instance!.simulateMessage({
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

      // Should send tool response back
      const instance = MockWebSocket.getLastInstance();
      const toolResponse = instance!.sentMessages.find(msg => 
        msg.includes('toolResponse')
      );
      expect(toolResponse).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle WebSocket errors', async () => {
      const { result } = renderHook(() => useGeminiLive('test-api-key'));
      
      act(() => {
        result.current.connect();
      });

      act(() => {
        const instance = MockWebSocket.getLastInstance();
        instance!.onerror?.(new Event('error'));
      });

      await vi.waitFor(() => {
        expect(result.current.status).toBe('error');
        expect(result.current.errorMessage).toBeDefined();
      });
    });

    it('should handle malformed messages gracefully', async () => {
      const { result } = renderHook(() => useGeminiLive('test-api-key'));
      
      act(() => {
        result.current.connect();
      });

      // Should not throw
      expect(() => {
        act(() => {
          const instance = MockWebSocket.getLastInstance();
          instance!.onmessage?.(new MessageEvent('message', { data: 'invalid json' }));
        });
      }).not.toThrow();
    });
  });
});
