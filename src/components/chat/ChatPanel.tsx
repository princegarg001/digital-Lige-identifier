"use client";

import { useState } from "react";
import { GlassPanel } from "@/components/shared/GlassPanel";
import { ChatHeader, type ChatTab } from "./ChatHeader";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInput } from "./ChatInput";
import { ParticipantsList } from "./ParticipantsList";
import { Separator } from "@/components/ui/separator";
import { type ChatMessageData } from "./ChatMessage";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  messages: ChatMessageData[];
  onSendText: (text: string) => void;
  isConnected: boolean;
  isTyping?: boolean;
  className?: string;
}

export function ChatPanel({
  messages,
  onSendText,
  isConnected,
  isTyping = false,
  className,
}: ChatPanelProps) {
  const [activeTab, setActiveTab] = useState<ChatTab>("messages");

  return (
    <GlassPanel
      variant="heavy"
      rounded="3xl"
      className={cn(
        "h-full flex flex-col min-h-0 overflow-hidden shadow-2xl backdrop-blur-xl bg-black/50 border-white/5",
        className
      )}
    >
      {/* Header with Tabs */}
      <ChatHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isConnected={isConnected}
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
      ) : (
        <ParticipantsList isConnected={isConnected} />
      )}
    </GlassPanel>
  );
}

