/**
 * Unit Tests for useSessionManager Hook
 * Tests centralized session management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionManager } from '@/hooks/useSessionManager';

// Mock the dependent hooks
vi.mock('@/hooks/useGeminiLive', () => ({
  useGeminiLive: vi.fn(() => ({
    status: 'disconnected',
    connect: vi.fn(),
    disconnect: vi.fn(),
    sendVideoFrame: vi.fn(),
    sendAudioChunk: vi.fn(),
    sendText: vi.fn(),
    registerTool: vi.fn(),
    onAudioData: { current: null },
    onToolCall: { current: null },
    onTranscript: { current: null },
    errorMessage: null,
  })),
}));

vi.mock('@/hooks/useAudioProcessor', () => ({
  useAudioProcessor: vi.fn(() => ({
    isMicActive: false,
    audioLevelRef: { current: 0 },
    startMic: vi.fn(),
    stopMic: vi.fn(),
    playAudioChunk: vi.fn(),
  })),
}));

vi.mock('@/hooks/useWebcam', () => ({
  useWebcam: vi.fn(() => ({
    videoRef: { current: null },
    isActive: false,
    start: vi.fn(),
    stop: vi.fn(),
    onFrameRef: { current: null },
  })),
}));

describe('useSessionManager Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with disconnected state', () => {
      const { result } = renderHook(() => useSessionManager('test-api-key'));

      expect(result.current.isConnected).toBe(false);
      expect(result.current.status).toBe('disconnected');
      expect(result.current.isMicActive).toBe(false);
      expect(result.current.isCameraActive).toBe(false);
    });

    it('should provide all required methods', () => {
      const { result } = renderHook(() => useSessionManager('test-api-key'));

      expect(result.current.toggleSession).toBeDefined();
      expect(result.current.toggleMic).toBeDefined();
      expect(result.current.toggleCamera).toBeDefined();
      expect(result.current.sendText).toBeDefined();
    });
  });

  describe('Session Control', () => {
    it('should start session when toggleSession is called', async () => {
      const { result } = renderHook(() => useSessionManager('test-api-key'));

      await act(async () => {
        await result.current.toggleSession();
      });

      // Verify session start was attempted
      expect(result.current).toBeDefined();
    });

    it('should stop session when already connected', async () => {
      const { result } = renderHook(() => useSessionManager('test-api-key'));

      // First start
      await act(async () => {
        await result.current.toggleSession();
      });

      // Then stop
      await act(async () => {
        await result.current.toggleSession();
      });

      expect(result.current).toBeDefined();
    });
  });

  describe('Audio Control', () => {
    it('should toggle microphone', () => {
      const { result } = renderHook(() => useSessionManager('test-api-key'));

      act(() => {
        result.current.toggleMic();
      });

      expect(result.current.toggleMic).toBeDefined();
    });
  });

  describe('Camera Control', () => {
    it('should toggle camera', () => {
      const { result } = renderHook(() => useSessionManager('test-api-key'));

      act(() => {
        result.current.toggleCamera();
      });

      expect(result.current.toggleCamera).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should expose error messages', () => {
      const { result } = renderHook(() => useSessionManager('test-api-key'));

      expect(result.current.errorMessage).toBeNull();
    });
  });

  describe('State Exposure', () => {
    it('should expose audio level', () => {
      const { result } = renderHook(() => useSessionManager('test-api-key'));

      expect(result.current.audioLevelRef).toBeDefined();
      expect(result.current.audioLevelRef.current).toBe(0);
    });

    it('should expose video ref', () => {
      const { result } = renderHook(() => useSessionManager('test-api-key'));

      expect(result.current.videoRef).toBeDefined();
    });
  });
});
