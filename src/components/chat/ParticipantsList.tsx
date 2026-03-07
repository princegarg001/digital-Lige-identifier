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
            className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-white/5 transition-all duration-300 group"
          >
            {/* Avatar */}
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center relative transition-transform duration-300 group-hover:scale-105",
                p.role === "ai"
                  ? "bg-primary/10 border border-primary/20"
                  : "bg-secondary/10 border border-secondary/20"
              )}
            >
              {p.role === "ai" ? (
                <Bot className="w-5 h-5 text-primary" />
              ) : (
                <User className="w-5 h-5 text-muted-foreground" />
              )}
              <div className="absolute -bottom-0.5 -right-0.5 outline outline-background rounded-full">
                <StatusDot status={p.status} size="sm" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {p.name}
              </p>
              <p className="text-[11px] text-muted-foreground/70 font-medium">
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
