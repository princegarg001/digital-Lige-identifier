"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Mic, Video } from "lucide-react";
import { StatusDot } from "@/components/shared/StatusDot";
import { cn } from "@/lib/utils";

interface Participant {
  id: string;
  name: string;
  role: "user" | "ai";
  status: "online" | "offline";
  isSpeaking?: boolean;
}

interface ParticipantsListProps {
  isConnected: boolean;
  className?: string;
}

export function ParticipantsList({
  isConnected,
  className,
}: ParticipantsListProps) {
  const participants: Participant[] = [
    {
      id: "ai",
      name: "AI Persona",
      role: "ai",
      status: isConnected ? "online" : "offline",
      isSpeaking: false,
    },
    {
      id: "user",
      name: "You",
      role: "user",
      status: "online",
      isSpeaking: false,
    },
  ];

  return (
    <ScrollArea className={cn("flex-1", className)}>
      <div className="px-4 py-3 space-y-1">
        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mb-3 px-1">
          In this session — {participants.length}
        </p>
        {participants.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent transition-colors"
          >
            {/* Avatar */}
            <div
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center relative",
                p.role === "ai"
                  ? "bg-cyan-500/15 border border-cyan-500/20"
                  : "bg-emerald-500/15 border border-emerald-500/20"
              )}
            >
              {p.role === "ai" ? (
                <Bot className="w-4 h-4 text-cyan-400" />
              ) : (
                <User className="w-4 h-4 text-emerald-400" />
              )}
              <div className="absolute -bottom-0.5 -right-0.5">
                <StatusDot status={p.status} size="sm" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {p.name}
              </p>
              <p className="text-[10px] text-muted-foreground capitalize">
                {p.role === "ai" ? "Digital Persona" : "Participant"}
              </p>
            </div>

            {/* Media indicators */}
            <div className="flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-muted-foreground" />
              <Video className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
