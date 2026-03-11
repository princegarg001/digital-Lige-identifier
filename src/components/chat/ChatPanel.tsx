"use client";

import { useState } from "react";
import { GlassPanel } from "@/components/shared/GlassPanel";
import { ChatHeader, type ChatTab } from "./ChatHeader";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInput } from "./ChatInput";
import { ParticipantsList } from "./ParticipantsList";
import { SkinSelector } from "./SkinSelector";
import { ConfigPanel } from "./ConfigPanel";
import { AvatarManager } from "./AvatarManager";
import { Separator } from "@/components/ui/separator";
import { type ChatMessageData } from "./ChatMessage";
import { cn } from "@/lib/utils";
import { SkinPreset } from "@/lib/skinConfig";

interface ChatPanelProps {
  messages: ChatMessageData[];
  onSendText: (text: string) => void;
  isConnected: boolean;
  isTyping?: boolean;
  className?: string;
  selectedSkinId: string | null;
  onSkinChange: (preset: SkinPreset) => void;
  debugMode?: boolean;
}

export function ChatPanel({
  messages,
  onSendText,
  isConnected,
  isTyping = false,
  className,
  selectedSkinId,
  onSkinChange,
  debugMode = false,
}: ChatPanelProps) {
  const [activeTab, setActiveTab] = useState<ChatTab>(debugMode ? "config" : "messages");
  const [prevDebugMode, setPrevDebugMode] = useState(debugMode);

  // Derive state from props: Only force tab switches when debugMode *transitions*
  if (debugMode !== prevDebugMode) {
    setPrevDebugMode(debugMode);
    if (debugMode) {
      setActiveTab("config");
    } else if (activeTab === "config") {
      // Gracefully switch out of config tab if it was closed
      setActiveTab("messages");
    }
  }

  const handleTabChange = (tab: ChatTab) => {
    setActiveTab(tab);
  };

  return (
    <GlassPanel
      variant="heavy"
      rounded="3xl"
      className={cn(
        "h-full flex flex-col min-h-0 overflow-hidden shadow-2xl backdrop-blur-xl bg-white/5 border border-white/10",
        className
      )}
    >
      {/* Header with Tabs */}
      <ChatHeader
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isConnected={isConnected}
        showConfigTab={debugMode}
      />

      <Separator className="bg-white/5 mt-4" />

      {/* Content based on active tab */}
      {activeTab === "messages" ? (
        <>
          <ChatMessageList
            messages={messages}
            isTyping={isTyping}
          />
          <Separator className="bg-white/5" />
          <div className="p-4 bg-white/5">
            <ChatInput
              onSend={onSendText}
              disabled={!isConnected}
              placeholder={
                isConnected
                  ? "Write your message..."
                  : "Connect to start chatting..."
              }
            />
          </div>
        </>
      ) : activeTab === "skins" ? (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-4 pt-4 pb-0">
            <AvatarManager />
          </div>
          <SkinSelector
            selectedSkinId={selectedSkinId}
            onSkinChange={onSkinChange}
          />
        </div>
      ) : activeTab === "config" ? (
        <ConfigPanel />
      ) : (
        <ParticipantsList isConnected={isConnected} />
      )}
    </GlassPanel>
  );
}
