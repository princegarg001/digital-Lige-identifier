"use client";

import { cn } from "@/lib/utils";

interface StatusDotProps {
  status: "online" | "connecting" | "offline" | "error";
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
  className?: string;
}

const statusColors = {
  online: "bg-emerald-500",
  connecting: "bg-amber-500",
  offline: "bg-muted-foreground/30",
  error: "bg-destructive",
};


const sizeMap = {
  sm: "h-1.5 w-1.5",
  md: "h-2 w-2",
  lg: "h-3 w-3",
};

export function StatusDot({
  status,
  size = "md",
  pulse = true,
  className,
}: StatusDotProps) {
  const shouldPulse = pulse && status === "online";

  return (
    <span className={cn("relative flex", sizeMap[size], className)}>
      {shouldPulse && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
            statusColors[status]
          )}
        />
      )}
      <span
        className={cn(
          "relative inline-flex rounded-full h-full w-full",
          statusColors[status]
        )}
      />
    </span>
  );
}
