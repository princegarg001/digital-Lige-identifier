"use client";

import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Clock, Zap, type LucideIcon } from "lucide-react";
import type { GeminiStatus } from "@/hooks/useGeminiLive";
import { useEffect, useState } from "react";

interface StatusBarProps {
  status: GeminiStatus;
}

function useElapsedTime(isActive: boolean) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setSeconds(0);
      return;
    }
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

const statusConfig: Record<
  GeminiStatus,
  { color: string; icon: LucideIcon; label: string }
> = {
  disconnected: { color: "text-zinc-500", icon: WifiOff, label: "Offline" },
  connecting: { color: "text-amber-400", icon: Zap, label: "Connecting..." },
  connected: { color: "text-emerald-400", icon: Wifi, label: "Connected" },
  error: { color: "text-red-400", icon: WifiOff, label: "Error" },
};

export function StatusBar({ status }: StatusBarProps) {
  const timer = useElapsedTime(status === "connected");
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className="flex items-center gap-4">
      {/* Connection Status */}
      <Badge
        variant="outline"
        className="glass border-white/10 px-3 py-1.5 gap-2 font-mono text-xs"
      >
        <span className={`relative flex h-2 w-2`}>
          <span
            className={`${
              status === "connected" ? "animate-ping" : ""
            } absolute inline-flex h-full w-full rounded-full ${
              status === "connected"
                ? "bg-emerald-400"
                : status === "connecting"
                ? "bg-amber-400"
                : "bg-zinc-500"
            } opacity-75`}
          />
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              status === "connected"
                ? "bg-emerald-400"
                : status === "connecting"
                ? "bg-amber-400"
                : status === "error"
                ? "bg-red-400"
                : "bg-zinc-500"
            }`}
          />
        </span>
        <StatusIcon className={`w-3.5 h-3.5 ${config.color}`} />
        <span className={config.color}>{config.label}</span>
      </Badge>

      {/* Timer */}
      {status === "connected" && (
        <Badge
          variant="outline"
          className="glass border-white/10 px-3 py-1.5 gap-2 font-mono text-xs text-cyan-400"
        >
          <Clock className="w-3.5 h-3.5" />
          {timer}
        </Badge>
      )}
    </div>
  );
}
