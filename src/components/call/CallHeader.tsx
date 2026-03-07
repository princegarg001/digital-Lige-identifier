"use client";

import { GlassPanel } from "@/components/shared/GlassPanel";
import { StatusDot } from "@/components/shared/StatusDot";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeminiStatus } from "@/hooks/useGeminiLive";


interface CallHeaderProps {
  status: GeminiStatus;
  sessionTime?: string;
}

export function CallHeader({ status, sessionTime }: CallHeaderProps) {
  const statusMap: Record<GeminiStatus, "online" | "connecting" | "offline" | "error"> = {
    connected: "online",
    connecting: "connecting",
    disconnected: "offline",
    error: "error",
  };

  const statusLabel: Record<GeminiStatus, string> = {
    connected: "Live",
    connecting: "Connecting...",
    disconnected: "Offline",
    error: "Error",
  };

  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <GlassPanel rounded="xl" className="px-3.5 py-3 flex items-center gap-3 bg-white/5 border-white/5 shadow-xl">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] shrink-0">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="pr-2">
            <h1 className="text-[13px] font-bold tracking-wider text-foreground">
              DIGITAL PERSONA
            </h1>
            <p className="text-[9px] text-muted-foreground font-mono tracking-[0.2em] uppercase opacity-70">
              Substrate v1.0
            </p>
          </div>
        </GlassPanel>
      </div>

      {/* Status Badges */}
      <div className="flex items-center gap-2 pl-2">
        <GlassPanel rounded="xl" className="px-3.5 py-2 flex items-center gap-2.5 bg-white/5 border-white/5">
          <StatusDot status={statusMap[status]} pulse={status === "connected"} />
          <span
            className={cn(
              "text-[10px] font-bold tracking-wide uppercase",
              status === "connected"
                ? "text-emerald-500"
                : status === "connecting"
                ? "text-amber-500"
                : status === "error"
                ? "text-destructive"
                : "text-muted-foreground"
            )}
          >
            {statusLabel[status]}
          </span>
        </GlassPanel>

        {sessionTime && status === "connected" && (
          <GlassPanel rounded="xl" className="px-3.5 py-2 flex items-center gap-2 bg-white/5 border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-primary leading-none mt-0.5">
              {sessionTime}
            </span>
          </GlassPanel>
        )}
      </div>
    </header>
  );
}
