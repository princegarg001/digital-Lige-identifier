"use client";

import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "light" | "heavy" | "solid";
  glow?: "none" | "cyan" | "emerald" | "red";
  rounded?: "lg" | "xl" | "2xl" | "3xl" | "full";
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  (
    { variant = "light", glow = "none", rounded = "2xl", className, children, ...props },
    ref
  ) => {
    const variants = {
      light:
        "glass",
      heavy:
        "glass-heavy",
      solid:
        "bg-card/90 backdrop-blur-xl border border-border",
    };

    const glows = {
      none: "",
      cyan: "shadow-[0_0_20px_rgba(34,211,238,0.12),0_0_60px_rgba(34,211,238,0.04)]",
      emerald:
        "shadow-[0_0_20px_rgba(52,211,153,0.12),0_0_60px_rgba(52,211,153,0.04)]",
      red: "shadow-[0_0_20px_rgba(239,68,68,0.2),0_0_60px_rgba(239,68,68,0.06)]",
    };

    const roundedMap = {
      lg: "rounded-lg",
      xl: "rounded-xl",
      "2xl": "rounded-2xl",
      "3xl": "rounded-3xl",
      full: "rounded-full",
    };

    return (
      <div
        ref={ref}
        className={cn(variants[variant], glows[glow], roundedMap[rounded], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassPanel.displayName = "GlassPanel";
