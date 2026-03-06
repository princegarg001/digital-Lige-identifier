"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Phone,
  Settings,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CallControlsProps {
  isConnected: boolean;
  isMicActive: boolean;
  isCameraActive: boolean;
  isChatOpen: boolean;
  onToggleConnection: () => void;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleChat: () => void;
}

function ControlButton({
  icon: Icon,
  label,
  active = true,
  variant = "default",
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  variant?: "default" | "danger" | "success";
  onClick: () => void;
}) {
  const variants = {
    default: active
      ? "bg-white/5 hover:bg-white/10 text-white border-white/10"
      : "bg-white/5 hover:bg-white/10 text-zinc-500 border-white/5",
    danger:
      "bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/20 glow-red",
    success:
      "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/20 glow-emerald",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={onClick}
          className={cn(
            "w-12 h-12 rounded-full transition-all duration-300",
            variants[variant]
          )}
        >
          <Icon className="w-5 h-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="bg-zinc-900 text-zinc-300 border-zinc-800">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function CallControls({
  isConnected,
  isMicActive,
  isCameraActive,
  isChatOpen,
  onToggleConnection,
  onToggleMic,
  onToggleCamera,
  onToggleChat,
}: CallControlsProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Mic Toggle */}
      <ControlButton
        icon={isMicActive ? Mic : MicOff}
        label={isMicActive ? "Mute microphone" : "Unmute microphone"}
        active={isMicActive}
        onClick={onToggleMic}
      />

      {/* Camera Toggle */}
      <ControlButton
        icon={isCameraActive ? Video : VideoOff}
        label={isCameraActive ? "Turn off camera" : "Turn on camera"}
        active={isCameraActive}
        onClick={onToggleCamera}
      />

      {/* Connect / Disconnect */}
      <ControlButton
        icon={isConnected ? PhoneOff : Phone}
        label={isConnected ? "End session" : "Start session"}
        variant={isConnected ? "danger" : "success"}
        onClick={onToggleConnection}
      />

      {/* Chat */}
      <ControlButton
        icon={MessageSquare}
        label={isChatOpen ? "Close chat" : "Open chat"}
        active={isChatOpen}
        onClick={onToggleChat}
      />

      {/* Settings */}
      <ControlButton
        icon={Settings}
        label="Settings"
        onClick={() => {}}
      />
    </div>
  );
}
