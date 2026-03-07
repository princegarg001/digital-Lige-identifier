"use client";

import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import React from "react";

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatMessageProps {
  message: ChatMessageData;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Individual chat message bubble.
 * Wrapped in React.memo — re-renders only when the message object changes.
 * @see vercel-react-best-practices: rerender-memo
 */
export const ChatMessage = React.memo(function ChatMessage({
  message,
}: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-2.5 max-w-full",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
          isUser
            ? "bg-secondary/10 border border-secondary/10"
            : "bg-primary/10 border border-primary/10"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-emerald-400" />
        ) : (
          <Bot className="w-4 h-4 text-primary" />
        )}
      </div>

      {/* Bubble */}
      <div className="flex flex-col gap-1.5 max-w-[80%]">
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
            isUser
              ? "bg-primary text-primary-foreground border-primary/20 rounded-tr-sm"
              : "bg-muted/50 text-foreground border border-white/5 backdrop-blur-sm rounded-tl-sm"
          )}
        >
          {message.content}
        </div>
        <span
          className={cn(
            "text-[10px] text-muted-foreground font-medium opacity-60",
            isUser ? "text-right" : "text-left"
          )}
        >
          {formatTime(message.timestamp)}
        </span>
      </div>

    </div>
  );
});
