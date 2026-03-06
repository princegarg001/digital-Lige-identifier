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
            ? "bg-emerald-500/15 border border-emerald-500/20"
            : "bg-cyan-500/15 border border-cyan-500/20"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-emerald-400" />
        ) : (
          <Bot className="w-4 h-4 text-cyan-400" />
        )}
      </div>

      {/* Bubble */}
      <div className="flex flex-col gap-1 max-w-[75%]">
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-emerald-500/10 text-emerald-50 border border-emerald-500/10 rounded-tr-sm"
              : "bg-white/5 text-zinc-200 border border-white/5 rounded-tl-sm"
          )}
        >
          {message.content}
        </div>
        <span
          className={cn(
            "text-[10px] text-zinc-600 font-mono",
            isUser ? "text-right" : "text-left"
          )}
        >
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
});
