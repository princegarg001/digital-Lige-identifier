/**
 * Unit Tests for useSessionTimer Hook
 * Tests session timing functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionTimer } from '@/hooks/useSessionTimer';

describe('useSessionTimer Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should start at 0 seconds when inactive', () => {
      const { result } = renderHook(() => useSessionTimer(false));

      expect(result.current.seconds).toBe(0);
      expect(result.current.formatted).toBe('00:00');
    });

    it('should start at 0 seconds when active', () => {
      const { result } = renderHook(() => useSessionTimer(true));

      expect(result.current.seconds).toBe(0);
      expect(result.current.formatted).toBe('00:00');
    });
  });

  describe('Timer Counting', () => {
    it('should increment seconds when active', () => {
      const { result } = renderHook(() => useSessionTimer(true));

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.seconds).toBe(1);
      expect(result.current.formatted).toBe('00:01');
    });

    it('should count multiple seconds', () => {
      const { result } = renderHook(() => useSessionTimer(true));

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.seconds).toBe(5);
      expect(result.current.formatted).toBe('00:05');
    });

    it('should not increment when inactive', () => {
      const { result } = renderHook(() => useSessionTimer(false));

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.seconds).toBe(0);
      expect(result.current.formatted).toBe('00:00');
    });
  });

  describe('Formatting', () => {
    it('should format seconds correctly', () => {
      const { result } = renderHook(() => useSessionTimer(true));

      act(() => {
        vi.advanceTimersByTime(9000);
      });

      expect(result.current.formatted).toBe('00:09');
    });

    it('should format minutes correctly', () => {
      const { result } = renderHook(() => useSessionTimer(true));

      act(() => {
        vi.advanceTimersByTime(60000); // 1 minute
      });

      expect(result.current.formatted).toBe('01:00');
    });

    it('should format minutes and seconds correctly', () => {
      const { result } = renderHook(() => useSessionTimer(true));

      act(() => {
        vi.advanceTimersByTime(125000); // 2:05
      });

      expect(result.current.formatted).toBe('02:05');
    });

    it('should handle double-digit minutes', () => {
      const { result } = renderHook(() => useSessionTimer(true));

      act(() => {
        vi.advanceTimersByTime(600000); // 10 minutes
      });

      expect(result.current.formatted).toBe('10:00');
    });
  });

  describe('State Changes', () => {
    it('should reset when switching from active to inactive', () => {
      const { result, rerender } = renderHook(
        ({ isActive }) => useSessionTimer(isActive),
        { initialProps: { isActive: true } }
      );

      act(() => {
        vi.advanceTimersByTime(30000); // 30 seconds
      });

      expect(result.current.seconds).toBe(30);

      // Switch to inactive
      rerender({ isActive: false });

      expect(result.current.seconds).toBe(0);
      expect(result.current.formatted).toBe('00:00');
    });

    it('should start counting when switching from inactive to active', () => {
      const { result, rerender } = renderHook(
        ({ isActive }) => useSessionTimer(isActive),
        { initialProps: { isActive: false } }
      );

      expect(result.current.seconds).toBe(0);

      // Switch to active
      rerender({ isActive: true });

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.seconds).toBe(5);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup interval on unmount', () => {
      const { unmount } = renderHook(() => useSessionTimer(true));

      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });
});
