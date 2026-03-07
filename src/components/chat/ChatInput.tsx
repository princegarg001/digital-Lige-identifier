"use client";

import { Button } from "@/components/ui/button";
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
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-cyan-500/30 transition-colors">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none disabled:opacity-50"
        />
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 text-zinc-500 hover:text-zinc-300 shrink-0"
          disabled={disabled}
        >
          <Paperclip className="w-3.5 h-3.5" />
        </Button>
      </div>
      <Button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className="size-10 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-primary-foreground shrink-0 transition-all duration-200 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
        size="icon"
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>
  );
}
