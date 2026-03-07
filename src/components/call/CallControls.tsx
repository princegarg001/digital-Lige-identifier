"use client";

import { IconButton } from "@/components/shared/IconButton";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { cn } from "@/lib/utils";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Phone,
  MessageSquare,
} from "lucide-react";

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
    <footer className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center justify-center z-50">
      <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-full px-6 py-4 flex items-center gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        {/* Chat */}
        <IconButton
          icon={MessageSquare}
          label={isChatOpen ? "Close chat" : "Open chat"}
          active={isChatOpen}
          variant={isChatOpen ? "primary" : "ghost"}
          onClick={onToggleChat}
          className="hover:bg-white/10 rounded-full"
        />

        <div className="w-px h-8 bg-white/10 mx-2" />

        {/* Mic */}
        <IconButton
          icon={isMicActive ? Mic : MicOff}
          label={isMicActive ? "Mute microphone" : "Unmute microphone"}
          active={isMicActive}
          variant="ghost"
          onClick={onToggleMic}
          className={cn("rounded-full", !isMicActive && "bg-red-500/20 text-red-400 hover:bg-red-500/30")}
        />

        {/* Camera */}
        <IconButton
          icon={isCameraActive ? Video : VideoOff}
          label={isCameraActive ? "Turn off camera" : "Turn on camera"}
          active={isCameraActive}
          variant="ghost"
          onClick={onToggleCamera}
          className={cn("rounded-full", !isCameraActive && "bg-red-500/20 text-red-400 hover:bg-red-500/30")}
        />

        {/* Connect / Disconnect */}
        <LiquidButton
          onClick={onToggleConnection}
          className={cn(
            "flex items-center justify-center size-14 rounded-full transition-all duration-300 shadow-lg ml-2 border-0",
            isConnected 
              ? "bg-destructive hover:bg-destructive/90 shadow-destructive/20 text-destructive-foreground" 
              : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20 text-primary-foreground"
          )}
          title={isConnected ? "End session" : "Start session"}
        >
          {isConnected ? <PhoneOff className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
        </LiquidButton>

      </div>
    </footer>
  );
}
