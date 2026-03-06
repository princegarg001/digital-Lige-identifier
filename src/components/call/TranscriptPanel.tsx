"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Send, X, Bot, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface TranscriptMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface TranscriptPanelProps {
  messages: TranscriptMessage[];
  onSendText: (text: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function TranscriptPanel({
  messages,
  onSendText,
  onClose,
  isOpen,
}: TranscriptPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendText(input.trim());
    setInput("");
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "w-80 h-full flex flex-col glass-heavy rounded-2xl overflow-hidden",
        "transition-all duration-500 ease-out",
        isOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 status-dot" />
          <span className="text-sm font-medium text-zinc-300 tracking-wide">
            Transcript
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 text-zinc-500 hover:text-white"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <Separator className="bg-white/5" />

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
        <div className="space-y-3">
          {messages.length === 0 && (
            <p className="text-xs text-zinc-600 text-center py-8 font-mono">
              Conversation will appear here...
            </p>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-2",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-3.5 h-3.5 text-cyan-400" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                  msg.role === "user"
                    ? "bg-cyan-500/10 text-cyan-100 border border-cyan-500/10"
                    : "bg-white/5 text-zinc-300 border border-white/5"
                )}
              >
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/30 transition-colors"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-9 h-9 text-cyan-400 hover:bg-cyan-500/10 disabled:text-zinc-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
