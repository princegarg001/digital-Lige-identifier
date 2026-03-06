"use client";

import { useCallback, useState } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

/**
 * Chat messages management hook
 * Handles message state and operations
 */
export function useChatMessages() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const addUserMessage = useCallback((content: string) => {
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);
    setIsTyping(true);
    return message;
  }, []);

  const addAssistantMessage = useCallback((content: string) => {
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);
    setIsTyping(false);
    return message;
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setIsTyping(false);
  }, []);

  return {
    messages,
    isTyping,
    addUserMessage,
    addAssistantMessage,
    clearMessages,
    setIsTyping,
  };
}
