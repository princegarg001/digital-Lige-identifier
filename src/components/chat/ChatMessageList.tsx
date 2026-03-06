"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage, type ChatMessageData } from "./ChatMessage";
import { TypingIndicator } from "@/components/shared/TypingIndicator";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ChatMessageListProps {
  messages: ChatMessageData[];
  isTyping?: boolean;
  className?: string;
}

export function ChatMessageList({
  messages,
  isTyping = false,
  className,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isTyping]);

  return (
    <ScrollArea className={cn("flex-1", className)}>
      <div className="px-4 py-3 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/5 flex items-center justify-center">
              <span className="text-2xl">💬</span>
            </div>
            <p className="text-xs text-zinc-600 text-center font-mono leading-relaxed">
              Start a conversation with
              <br />
              your Digital Persona
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {isTyping && (
          <div className="pl-10">
            <TypingIndicator name="AI Persona" />
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
