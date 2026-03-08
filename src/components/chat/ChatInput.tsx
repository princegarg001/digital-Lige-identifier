"use client";

import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { Send, Paperclip } from "lucide-react";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Write your message...",
  className,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
    inputRef.current?.focus();
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex-1 flex items-center gap-2 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-full px-4 py-2.5 focus-within:border-cyan-500/40 focus-within:ring-1 focus-within:ring-cyan-500/20 focus-within:shadow-[0_0_15px_rgba(34,211,238,0.1)] transition-all duration-300">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-50 ml-2"
        />
        <LiquidButton
          className="w-8 h-8 text-muted-foreground hover:text-white hover:bg-white/10 shrink-0 rounded-full transition-colors flex items-center justify-center border border-transparent p-0"
          disabled={disabled}
        >
          <Paperclip className="w-4 h-4" />
        </LiquidButton>
      </div>
      <LiquidButton
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className="size-11 rounded-full bg-linear-to-r from-cyan-500 to-emerald-500 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:scale-105 border-0 text-white shrink-0 transition-all duration-500 active:scale-95 flex items-center justify-center p-0"
      >
        <Send className="w-5 h-5 ml-1" />
      </LiquidButton>
    </div>
  );
}

