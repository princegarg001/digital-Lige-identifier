"use client";

import { GlassPanel } from "@/components/shared/GlassPanel";
import { IconButton } from "@/components/shared/IconButton";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Phone,
  Settings,
  MessageSquare,
  Maximize2,
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
    <footer className="flex items-center justify-center px-6 py-4">
      <GlassPanel rounded="2xl" className="px-5 py-3 flex items-center gap-2">
        {/* Fullscreen */}
        <IconButton
          icon={Maximize2}
          label="Fullscreen"
          size="md"
          variant="ghost"
          onClick={() => document.documentElement.requestFullscreen?.()}
        />

        {/* Mic */}
        <IconButton
          icon={isMicActive ? Mic : MicOff}
          label={isMicActive ? "Mute microphone" : "Unmute microphone"}
          active={isMicActive}
          variant="ghost"
          onClick={onToggleMic}
        />

        {/* Camera */}
        <IconButton
          icon={isCameraActive ? Video : VideoOff}
          label={isCameraActive ? "Turn off camera" : "Turn on camera"}
          active={isCameraActive}
          variant="ghost"
          onClick={onToggleCamera}
        />

        {/* Connect / Disconnect */}
        <IconButton
          icon={isConnected ? PhoneOff : Phone}
          label={isConnected ? "End session" : "Start session"}
          variant={isConnected ? "danger" : "success"}
          size="lg"
          onClick={onToggleConnection}
        />

        {/* Chat */}
        <IconButton
          icon={MessageSquare}
          label={isChatOpen ? "Close chat" : "Open chat"}
          active={isChatOpen}
          variant={isChatOpen ? "primary" : "ghost"}
          onClick={onToggleChat}
        />

        {/* Settings */}
        <IconButton
          icon={Settings}
          label="Settings"
          variant="ghost"
          onClick={() => {}}
        />
      </GlassPanel>
    </footer>
  );
}
