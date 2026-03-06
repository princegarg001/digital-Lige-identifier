/**
 * Unit Tests for useChatMessages Hook
 * Tests chat message management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatMessages } from '@/hooks/useChatMessages';

describe('useChatMessages Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with empty messages', () => {
      const { result } = renderHook(() => useChatMessages());

      expect(result.current.messages).toEqual([]);
      expect(result.current.isTyping).toBe(false);
    });

    it('should provide all required methods', () => {
      const { result } = renderHook(() => useChatMessages());

      expect(result.current.addUserMessage).toBeDefined();
      expect(result.current.addAssistantMessage).toBeDefined();
      expect(result.current.clearMessages).toBeDefined();
      expect(result.current.setIsTyping).toBeDefined();
    });
  });

  describe('Adding User Messages', () => {
    it('should add a user message', () => {
      const { result } = renderHook(() => useChatMessages());

      act(() => {
        result.current.addUserMessage('Hello');
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].role).toBe('user');
      expect(result.current.messages[0].content).toBe('Hello');
    });

    it('should set typing state when adding user message', () => {
      const { result } = renderHook(() => useChatMessages());

      act(() => {
        result.current.addUserMessage('Hello');
      });

      expect(result.current.isTyping).toBe(true);
    });

    it('should generate unique IDs for messages', () => {
      const { result } = renderHook(() => useChatMessages());

      act(() => {
        result.current.addUserMessage('Message 1');
        result.current.addUserMessage('Message 2');
      });

      expect(result.current.messages[0].id).not.toBe(
        result.current.messages[1].id
      );
    });

    it('should include timestamp', () => {
      const { result } = renderHook(() => useChatMessages());

      const before = new Date();

      act(() => {
        result.current.addUserMessage('Hello');
      });

      const after = new Date();

      const timestamp = result.current.messages[0].timestamp;
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Adding Assistant Messages', () => {
    it('should add an assistant message', () => {
      const { result } = renderHook(() => useChatMessages());

      act(() => {
        result.current.addAssistantMessage('Hi there!');
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].role).toBe('assistant');
      expect(result.current.messages[0].content).toBe('Hi there!');
    });

    it('should clear typing state when adding assistant message', () => {
      const { result } = renderHook(() => useChatMessages());

      act(() => {
        result.current.addUserMessage('Hello');
      });

      expect(result.current.isTyping).toBe(true);

      act(() => {
        result.current.addAssistantMessage('Hi!');
      });

      expect(result.current.isTyping).toBe(false);
    });
  });

  describe('Message Ordering', () => {
    it('should maintain message order', () => {
      const { result } = renderHook(() => useChatMessages());

      act(() => {
        result.current.addUserMessage('First');
        result.current.addAssistantMessage('Second');
        result.current.addUserMessage('Third');
      });

      expect(result.current.messages).toHaveLength(3);
      expect(result.current.messages[0].content).toBe('First');
      expect(result.current.messages[1].content).toBe('Second');
      expect(result.current.messages[2].content).toBe('Third');
    });

    it('should alternate between user and assistant', () => {
      const { result } = renderHook(() => useChatMessages());

      act(() => {
        result.current.addUserMessage('User 1');
        result.current.addAssistantMessage('Assistant 1');
        result.current.addUserMessage('User 2');
        result.current.addAssistantMessage('Assistant 2');
      });

      expect(result.current.messages[0].role).toBe('user');
      expect(result.current.messages[1].role).toBe('assistant');
      expect(result.current.messages[2].role).toBe('user');
      expect(result.current.messages[3].role).toBe('assistant');
    });
  });

  describe('Clearing Messages', () => {
    it('should clear all messages', () => {
      const { result } = renderHook(() => useChatMessages());

      act(() => {
        result.current.addUserMessage('Message 1');
        result.current.addAssistantMessage('Message 2');
        result.current.addUserMessage('Message 3');
      });

      expect(result.current.messages).toHaveLength(3);

      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.messages).toHaveLength(0);
    });

    it('should reset typing state when clearing', () => {
      const { result } = renderHook(() => useChatMessages());

      act(() => {
        result.current.addUserMessage('Hello');
      });

      expect(result.current.isTyping).toBe(true);

      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.isTyping).toBe(false);
    });
  });

  describe('Typing State', () => {
    it('should allow manual typing state control', () => {
      const { result } = renderHook(() => useChatMessages());

      act(() => {
        result.current.setIsTyping(true);
      });

      expect(result.current.isTyping).toBe(true);

      act(() => {
        result.current.setIsTyping(false);
      });

      expect(result.current.isTyping).toBe(false);
    });
  });

  describe('Message Return Values', () => {
    it('should return created user message', () => {
      const { result } = renderHook(() => useChatMessages());

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let message: any;
      act(() => {
        message = result.current.addUserMessage('Test');
      });

      expect(message).toBeDefined();
      expect(message?.content).toBe('Test');
      expect(message?.role).toBe('user');
    });

    it('should return created assistant message', () => {
      const { result } = renderHook(() => useChatMessages());

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let message: any;
      act(() => {
        message = result.current.addAssistantMessage('Response');
      });

      expect(message).toBeDefined();
      expect(message?.content).toBe('Response');
      expect(message?.role).toBe('assistant');
    });
  });
});
