"use client";

import { cn } from "@/lib/utils";
import { StatusDot } from "@/components/shared/StatusDot";

export type ChatTab = "messages" | "participants";

interface ChatHeaderProps {
  activeTab: ChatTab;
  onTabChange: (tab: ChatTab) => void;
  isConnected: boolean;
}

export function ChatHeader({
  activeTab,
  onTabChange,
  isConnected,
}: ChatHeaderProps) {
  const tabs: { key: ChatTab; label: string }[] = [
    { key: "messages", label: "Messages" },
    { key: "participants", label: "Participants" },
  ];

  return (
    <div className="px-5 pt-4 pb-0">
      {/* Title row */}
      <div className="flex items-center gap-2 mb-4">
        <StatusDot
          status={isConnected ? "online" : "offline"}
          size="sm"
        />
        <h2 className="text-sm font-semibold text-zinc-200 tracking-wide">
          Group Chat
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={cn(
              "flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200",
              activeTab === tab.key
                ? "bg-cyan-500 text-black shadow-[0_0_12px_rgba(34,211,238,0.2)]"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
