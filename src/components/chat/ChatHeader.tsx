"use client";

import React from "react";
import { MessageSquare, Users, Palette, Settings } from "lucide-react";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";
import { StatusDot } from "@/components/shared/StatusDot";

export type ChatTab = "messages" | "participants" | "skins" | "config";

interface ChatHeaderProps {
  activeTab: ChatTab;
  onTabChange: (tab: ChatTab) => void;
  isConnected: boolean;
  showConfigTab?: boolean;
}

const TAB_KEYS: ChatTab[] = ["messages", "participants", "skins", "config"];

export function ChatHeader({
  activeTab,
  onTabChange,
  isConnected,
  showConfigTab = false,
}: ChatHeaderProps) {
  const tabs = [
    { title: "Chat", icon: MessageSquare },
    { title: "People", icon: Users },
    { type: "separator" as const },
    { title: "Skins", icon: Palette },
    ...(showConfigTab
      ? [
          { type: "separator" as const },
          { title: "Config", icon: Settings },
        ]
      : []),
  ];

  // Map from ExpandableTabs index (which includes separators) to ChatTab key
  const indexToTabKey = (index: number): ChatTab | null => {
    let tabCount = 0;
    for (let i = 0; i < tabs.length; i++) {
      if ("type" in tabs[i] && tabs[i].type === "separator") continue;
      if (i === index) return TAB_KEYS[tabCount];
      tabCount++;
    }
    return null;
  };

  // Map from ChatTab key back to ExpandableTabs index (accounts for separators)
  const tabKeyToIndex = (key: ChatTab): number | null => {
    let tabCount = 0;
    for (let i = 0; i < tabs.length; i++) {
      if ("type" in tabs[i] && tabs[i].type === "separator") continue;
      if (TAB_KEYS[tabCount] === key) return i;
      tabCount++;
    }
    return null;
  };

  const handleChange = (index: number | null) => {
    if (index === null) {
      // When clicking outside, keep the current active tab (don't deselect)
      return;
    }
    const key = indexToTabKey(index);
    if (key) onTabChange(key);
  };

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

      {/* Expandable Tabs — controlled via activeIdx */}
      <ExpandableTabs
        tabs={tabs}
        activeIdx={tabKeyToIndex(activeTab)}
        activeColor="text-primary"
        onChange={handleChange}
        className="bg-white/5 border-white/5 backdrop-blur-sm"
      />
    </div>
  );
}
