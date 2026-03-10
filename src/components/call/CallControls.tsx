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
    <footer className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-center z-50">
      <div className="bg-white/5 backdrop-blur-2xl border border-white/6 rounded-full px-4 py-2.5 flex items-center gap-2 shadow-2xl">
        {/* Chat */}
        <IconButton
          icon={MessageSquare}
          label={isChatOpen ? "Close chat" : "Open chat"}
          active={isChatOpen}
          variant={isChatOpen ? "primary" : "ghost"}
          size="sm"
          onClick={onToggleChat}
          className="hover:bg-cyan-500/10 rounded-full"
        />

        <div className="w-px h-6 bg-white/10 mx-1" />

        {/* Mic */}
        <IconButton
          icon={isMicActive ? Mic : MicOff}
          label={isMicActive ? "Mute microphone" : "Unmute microphone"}
          active={!isMicActive}
          variant={isMicActive ? "ghost" : "danger"}
          size="sm"
          onClick={onToggleMic}
          className="rounded-full"
        />

        {/* Camera */}
        <IconButton
          icon={isCameraActive ? Video : VideoOff}
          label={isCameraActive ? "Turn off camera" : "Turn on camera"}
          active={!isCameraActive}
          variant={isCameraActive ? "ghost" : "danger"}
          size="sm"
          onClick={onToggleCamera}
          className="rounded-full"
        />

        {/* Connect / Disconnect */}
        <LiquidButton
          onClick={onToggleConnection}
          className={cn(
            "flex items-center justify-center size-10 rounded-full transition-all duration-500 shadow-xl ml-1 border-0 active:scale-90",
            isConnected 
              ? "bg-destructive hover:bg-destructive/90 shadow-destructive/20 text-destructive-foreground" 
              : "bg-linear-to-r from-cyan-500 to-emerald-500 text-primary-foreground hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:scale-105"
          )}
          title={isConnected ? "End session" : "Start session"}
        >

          {isConnected ? <PhoneOff className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
        </LiquidButton>

      </div>
    </footer>
  );
}
