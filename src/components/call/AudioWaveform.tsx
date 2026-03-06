"use client";

import { cn } from "@/lib/utils";

interface AudioWaveformProps {
  audioLevel: number;
  isActive: boolean;
  className?: string;
}

export function AudioWaveform({
  audioLevel,
  isActive,
  className,
}: AudioWaveformProps) {
  const bars = 12;

  return (
    <div className={cn("flex items-end gap-[3px] h-8", className)}>
      {Array.from({ length: bars }).map((_, i) => {
        const distance = Math.abs(i - bars / 2) / (bars / 2);
        const maxHeight = isActive ? Math.max(4, (1 - distance) * audioLevel * 32) : 4;

        return (
          <div
            key={i}
            className={cn(
              "w-[3px] rounded-full transition-all duration-150",
              isActive ? "bg-cyan-400/80" : "bg-zinc-700"
            )}
            style={{
              height: `${maxHeight}px`,
              transitionDelay: `${i * 20}ms`,
            }}
          />
        );
      })}
    </div>
  );
}
