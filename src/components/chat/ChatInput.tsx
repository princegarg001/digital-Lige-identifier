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
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all duration-300">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-50"
        />
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-white/5 shrink-0 rounded-lg transition-colors"
          disabled={disabled}
        >
          <Paperclip className="w-4 h-4" />
        </Button>
      </div>
      <Button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className="size-11 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 transition-all duration-300 shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)] active:scale-95 flex items-center justify-center p-0"
        size="icon"
      >
        <Send className="w-5 h-5 ml-0.5" />
      </Button>
    </div>
  );
}

