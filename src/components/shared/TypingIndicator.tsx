"use client";

import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  name?: string;
  className?: string;
}

export function TypingIndicator({ name = "AI", className }: TypingIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2 px-1", className)}>
      <span className="text-xs text-muted-foreground">{name} is typing</span>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-cyan-400/60"
            style={{
              animation: `typing-bounce 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
