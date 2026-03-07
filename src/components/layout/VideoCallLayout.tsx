"use client";

import { cn } from "@/lib/utils";

interface VideoCallLayoutProps {
  children: React.ReactNode;
  chatPanel: React.ReactNode;
  isChatOpen: boolean;
  className?: string;
}

/**
 * Responsive layout: main content area (3D avatar) on left,
 * chat panel on right when open.
 */
export function VideoCallLayout({
  children,
  chatPanel,
  isChatOpen,
  className,
}: VideoCallLayoutProps) {
  return (
    <div className={cn("h-screen w-screen flex overflow-hidden relative bg-background p-4 gap-4", className)}>
      {/* Background effects */}
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-125 h-125 bg-cyan-500/4 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-100 h-100 bg-emerald-500/4 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-75 h-75 bg-purple-500/2 rounded-full blur-[120px] pointer-events-none" />

      {/* Main content area (Video Card) */}
      <div className="flex-1 flex flex-col relative z-10 min-w-0 rounded-3xl border border-border bg-card/40 shadow-2xl backdrop-blur-md">
        {children}
      </div>

      {/* Chat panel */}
      <div
        className={cn(
          "h-full transition-all duration-500 ease-out z-20 flex flex-col min-h-0",
          isChatOpen ? "w-95 opacity-100" : "w-0 opacity-0 overflow-hidden"
        )}
      >
        {chatPanel}
      </div>
    </div>
  );
}
