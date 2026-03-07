"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

// Error Boundary
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Layout
import { VideoCallLayout } from "@/components/layout/VideoCallLayout";

// Call Components
import { CallHeader } from "@/components/call/CallHeader";
import { CallControls } from "@/components/call/CallControls";
import { WebcamFeed } from "@/components/call/WebcamFeed";
import { PersonaOverlay } from "@/components/call/PersonaOverlay";

// Chat Components
import { ChatPanel } from "@/components/chat/ChatPanel";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { TextShimmer } from "@/components/ui/text-shimmer";

// Hooks
import { useSessionManager } from "@/hooks/useSessionManager";
import { useSessionTimer } from "@/hooks/useSessionTimer";
import { useChatMessages } from "@/hooks/useChatMessages";


// 3D Scene (lazy, no SSR)
const Scene = dynamic(() => import("@/components/canvas/Scene"), {
  ssr: false,
  loading: () => <SceneLoader />,
});

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

// Loading component for 3D scene
function SceneLoader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-zinc-500 text-sm">Loading 3D scene...</div>
    </div>
  );
}

// Memoized idle screen
const IdleScreen = memo(({ onStart }: { onStart: () => void }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    transition={{ duration: 0.4 }}
    className="absolute inset-0 flex flex-col items-center justify-center z-10"
  >
    <div className="bg-white/3 backdrop-blur-xl border border-white/6 rounded-3xl px-12 py-10 flex flex-col items-center gap-6 max-w-md">
      <div className="w-20 h-20 rounded-full bg-linear-to-br from-cyan-400/20 to-emerald-400/20 border border-cyan-400/20 flex items-center justify-center animate-pulse-ring">
        <Sparkles className="w-8 h-8 text-cyan-400" />
      </div>
      <div className="text-center">
        <TextShimmer 
          duration={2}
          className="text-2xl font-semibold tracking-wide mb-2 [--base-color:var(--color-cyan-500)] [--base-gradient-color:var(--color-emerald-300)] dark:[--base-color:var(--color-cyan-500)] dark:[--base-gradient-color:var(--color-emerald-300)]"
        >
          Digital Persona
        </TextShimmer>
        <p className="text-sm text-zinc-500 leading-relaxed mt-2">
          Start a session to activate your AI persona.
          <br />
          Grant camera & mic permissions for full interaction.
        </p>
      </div>
      <LiquidButton
        onClick={onStart}
        className="px-8 py-6 rounded-full bg-linear-to-r from-cyan-500 to-emerald-500 text-primary-foreground font-semibold text-sm tracking-wide hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:opacity-100 transition-all duration-500 hover:scale-105 border-0 cursor-pointer"
      >
        INITIATE SESSION
      </LiquidButton>
    </div>
  </motion.div>
));

IdleScreen.displayName = "IdleScreen";

// Main component
function HomePage() {
  // UI State
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [currentAnimation, setCurrentAnimation] = useState<string>("idle");
  const [personaMode, setPersonaMode] = useState<"focus" | "casual" | "presentation">("casual");

  // Session management
  const { onTranscript: onTranscriptRef, registerTool, ...session } = useSessionManager(API_KEY);
  const timer = useSessionTimer(session.isConnected);
  const chat = useChatMessages();

  // animationTimeoutRef must be declared before the tool-registration useEffect below
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Register application-level tool handlers ──────────────────────────────
  // These run ONCE on mount so they are available before the first connect().

  useEffect(() => {
    // trigger_animation — play a named gesture on the 3D avatar
    registerTool("trigger_animation", (args) => {
      const gesture = args.gesture_name as string;
      const duration = (args.duration_ms as number | undefined) ?? 3000;

      if (gesture) {
        setCurrentAnimation(gesture);
        if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = setTimeout(() => {
          setCurrentAnimation("idle");
        }, duration);
      }

      return { acknowledged: true, gesture_name: gesture, duration_ms: duration };
    });

    // set_persona_mode — switch interaction style
    registerTool("set_persona_mode", (args) => {
      const mode = args.mode as "focus" | "casual" | "presentation";
      setPersonaMode(mode);
      console.log(`[Page] Persona mode switched to: ${mode}`);
      return { acknowledged: true, active_mode: mode };
    });

    // display_text — push content into the chat panel as an assistant message
    registerTool("display_text", (args) => {
      const content = args.content as string;
      const format = (args.format as string) ?? "plain";
      const lang = (args.language as string | undefined) ?? "";

      // Wrap code blocks for markdown rendering
      const displayContent =
        format === "code" && lang
          ? `\`\`\`${lang}\n${content}\n\`\`\``
          : format === "code"
          ? `\`\`\`\n${content}\n\`\`\``
          : content;

      chat.addAssistantMessage(displayContent);
      return { acknowledged: true, characters_displayed: content.length };
    });
  }, [registerTool, chat]);

  // Wire up transcript handler
  useEffect(() => {
    onTranscriptRef.current = (text) => {
      chat.addAssistantMessage(text);
    };
  }, [onTranscriptRef, chat]);



  // Send chat text
  const handleSendText = useCallback(
    (text: string) => {
      chat.addUserMessage(text);
      session.sendText(text);
    },
    [chat, session]
  );

  // Error handling
  const anyError = session.errorMessage || session.micError || session.cameraError;
  if (anyError) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 max-w-md w-full">
          <h2 className="text-xl font-semibold mb-4 text-red-500">
            Connection Error
          </h2>
          <p className="text-sm text-muted-foreground mb-4">{anyError}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-cyan-500 text-primary-foreground rounded-lg font-medium hover:bg-cyan-400 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <VideoCallLayout
      isChatOpen={isChatOpen}
      chatPanel={
        <ChatPanel
          messages={chat.messages}
          onSendText={handleSendText}
          isConnected={session.isConnected}
          isTyping={chat.isTyping}
        />
      }
    >
      {/* 3D Scene Background */}
      <div className="absolute inset-0 scan-line z-0" data-persona-mode={personaMode}>
        <Scene
          audioLevelRef={session.audioLevelRef}
          currentAnimation={currentAnimation}
        />
      </div>

      {/* Floating Header */}
      <div className="absolute top-0 left-0 right-0 z-10 px-6 py-4 pointer-events-none">
        <div className="pointer-events-auto inline-block">
          <CallHeader status={session.status} sessionTime={timer.formatted} />
        </div>
      </div>

      {/* Floating Webcam (FaceTime PiP Style) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="absolute top-6 right-6 w-48 h-64 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 z-10"
      >
        <WebcamFeed
          videoRef={session.videoRef}
          isActive={session.isCameraActive}
        />
      </motion.div>

      {/* Persona overlay (Waveform) */}
      <div className="absolute bottom-24 left-6 z-10 pointer-events-none">
        <PersonaOverlay
          audioLevelRef={session.audioLevelRef}
          isConnected={session.isConnected}
        />
      </div>

      {/* Idle Screen */}
      <AnimatePresence>
        {!session.isConnected && session.status !== "connecting" && (
          <IdleScreen onStart={session.toggleSession} />
        )}
      </AnimatePresence>

      {/* Floating Bottom Controls */}
      <div className="absolute bottom-6 left-0 right-0 z-10 flex justify-center pointer-events-none">
        <div className="pointer-events-auto">
          <CallControls
            isConnected={session.isConnected}
            isMicActive={session.isMicActive}
            isCameraActive={session.isCameraActive}
            isChatOpen={isChatOpen}
            onToggleConnection={session.toggleSession}
            onToggleMic={session.toggleMic}
            onToggleCamera={session.toggleCamera}
            onToggleChat={() => setIsChatOpen(!isChatOpen)}
          />
        </div>
      </div>
    </VideoCallLayout>
  );
}

// Export with error boundary
export default function Home() {
  return (
    <ErrorBoundary>
      <HomePage />
    </ErrorBoundary>
  );
}
