"use client";

import { cn } from "@/lib/utils";
import { StatusDot } from "@/components/shared/StatusDot";

export type ChatTab = "messages" | "participants" | "skins" | "config";

interface ChatHeaderProps {
  activeTab: ChatTab;
  onTabChange: (tab: ChatTab) => void;
  isConnected: boolean;
  showConfigTab?: boolean;
}

export function ChatHeader({
  activeTab,
  onTabChange,
  isConnected,
  showConfigTab = false,
}: ChatHeaderProps) {
  const tabs: { key: ChatTab; label: string }[] = [
    { key: "messages", label: "Messages" },
    { key: "participants", label: "People" },
    { key: "skins", label: "🎨 Skins" },
    ...(showConfigTab ? [{ key: "config" as ChatTab, label: "⚙ Config" }] : []),
  ];

  return (
    <div className="px-6 pt-5 pb-0">
      {/* Title row */}
      <div className="flex items-center gap-2.5 mb-5">
        <StatusDot
          status={isConnected ? "online" : "offline"}
          size="sm"
        />
        <h2 className="text-sm font-semibold text-foreground tracking-wide opacity-90">
          Group Chat
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-white/5 border border-white/5 rounded-[14px] p-1.5 backdrop-blur-sm">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={cn(
              "flex-1 px-2 py-2 text-xs font-semibold rounded-xl transition-all duration-300",
              activeTab === tab.key
                ? "bg-primary text-primary-foreground shadow-[0_4px_15px_rgba(var(--primary-rgb),0.25)] ring-1 ring-white/10"
                : "text-muted-foreground hover:text-foreground hover:bg-white/10"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
