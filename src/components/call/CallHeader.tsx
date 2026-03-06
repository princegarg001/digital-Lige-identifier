"use client";

import { GlassPanel } from "@/components/shared/GlassPanel";
import { StatusDot } from "@/components/shared/StatusDot";
import { Sparkles } from "lucide-react";
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
    <header className="flex items-center justify-between px-5 py-3">
      {/* Logo + Title */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-linear-to-br from-cyan-400 to-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.2)]">
          <Sparkles className="w-5 h-5 text-black" />
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-wide">
            DIGITAL PERSONA
          </h1>
          <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
            Substrate v1.0
          </p>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex items-center gap-3">
        <GlassPanel rounded="xl" className="px-3 py-1.5 flex items-center gap-2">
          <StatusDot status={statusMap[status]} />
          <span
            className={`text-xs font-mono ${
              status === "connected"
                ? "text-emerald-400"
                : status === "connecting"
                ? "text-amber-400"
                : status === "error"
                ? "text-red-400"
                : "text-zinc-500"
            }`}
          >
            {statusLabel[status]}
          </span>
        </GlassPanel>

        {sessionTime && status === "connected" && (
          <GlassPanel rounded="xl" className="px-3 py-1.5">
            <span className="text-xs font-mono text-cyan-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {sessionTime}
            </span>
          </GlassPanel>
        )}
      </div>
    </header>
  );
}
