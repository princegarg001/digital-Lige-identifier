"use client";

import { cn } from "@/lib/utils";
import React from "react";

interface AudioWaveformProps {
  audioLevelRef: React.RefObject<number>;
  isActive: boolean;
  barCount?: number;
  className?: string;
}

const WAVEFORM_BAR_COUNT = 5;

/**
 * Visualizes real-time audio levels with animated bars.
 * Reads audioLevelRef.current directly for zero-rerender updates.
 *
 * @remarks Uses CSS custom properties for bar height animation
 * to avoid React re-renders on every audio frame.
 */
export const AudioWaveform = React.memo(function AudioWaveform({
  audioLevelRef,
  isActive,
  barCount = WAVEFORM_BAR_COUNT,
  className,
}: AudioWaveformProps) {
  const barsRef = React.useRef<(HTMLDivElement | null)[]>([]);

  // Use rAF to drive bar heights from the ref — no re-renders
  React.useEffect(() => {
    if (!isActive) return;

    let raf: number;
    const animate = () => {
      const level = audioLevelRef.current ?? 0;
      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        // Each bar gets a slightly randomized height
        const offset = Math.sin(Date.now() * 0.005 + i * 0.8) * 0.3;
        const h = Math.max(0.15, Math.min(1, level + offset * level));
        bar.style.height = `${h * 100}%`;
      });
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => cancelAnimationFrame(raf);
  }, [isActive, audioLevelRef]);

  return (
    <div
      className={cn(
        "flex items-end gap-0.75 h-6",
        className
      )}
    >
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          ref={(el) => { barsRef.current[i] = el; }}
          className="w-0.75 rounded-full bg-cyan-400 transition-colors"
          style={{ height: "15%" }}
        />
      ))}
    </div>
  );
});
