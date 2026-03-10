"use client";

import { LiquidButton } from "@/components/ui/liquid-glass-button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";
import { forwardRef } from "react";

interface IconButtonProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  variant?: "ghost" | "danger" | "success" | "primary";
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

const variantStyles = {
  ghost: {
    active:
      "bg-white/10 hover:bg-white/15 text-white border border-white/20 shadow-lg",
    inactive:
      "bg-white/5 hover:bg-white/10 text-muted-foreground border border-white/5",
  },
  danger: {
    active:
      "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]",
    inactive:
      "bg-red-500/5 hover:bg-red-500/10 text-red-400/50 border border-red-500/5",
  },
  success: {
    active:
      "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 shadow-[0_0_20px_rgba(52,211,153,0.1)]",
    inactive:
      "bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400/50 border border-emerald-500/5",
  },
  primary: {
    active:
      "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.1)]",
    inactive:
      "bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-400/50 border border-cyan-500/5",
  },
};

const sizeStyles = {
  sm: "w-9 h-9",
  md: "w-12 h-12",
  lg: "w-14 h-14",
};

const iconSizes = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon: Icon,
      label,
      active = true,
      variant = "ghost",
      size = "md",
      onClick,
      className,
      disabled,
    },
    ref
  ) => {
    const state = active ? "active" : "inactive";

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <LiquidButton
            ref={ref}
            onClick={onClick}
            disabled={disabled}
            className={cn(
              "rounded-full transition-all duration-300 backdrop-blur-xl",
              sizeStyles[size],
              variantStyles[variant][state],
              className
            )}
            style={{ padding: 0 }}
          >
            <Icon className={iconSizes[size]} />
          </LiquidButton>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-card text-muted-foreground border-border text-xs"
        >
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }
);

IconButton.displayName = "IconButton";
