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
        <h2 className="text-xl font-semibold tracking-wide mb-2">
          Digital Persona
        </h2>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Start a session to activate your AI persona.
          <br />
          Grant camera & mic permissions for full interaction.
        </p>
      </div>
      <button
        onClick={onStart}
        className="px-8 py-3 rounded-full bg-linear-to-r from-cyan-500 to-emerald-500 text-black font-semibold text-sm tracking-wide hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] transition-all duration-500 hover:scale-105"
      >
        INITIATE SESSION
      </button>
    </div>
  </motion.div>
));

IdleScreen.displayName = "IdleScreen";

// Main component
function HomePage() {
  // UI State
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [currentAnimation, setCurrentAnimation] = useState<string>("idle");

  // Session management
  const { onTranscript: onTranscriptRef, onToolCall: onToolCallRef, ...session } = useSessionManager(API_KEY);
  const timer = useSessionTimer(session.isConnected);
  const chat = useChatMessages();

  // Wire up transcript handler
  useEffect(() => {
    onTranscriptRef.current = (text) => {
      chat.addAssistantMessage(text);
    };
  }, [onTranscriptRef, chat]);

  // Wire up tool call handler
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    onToolCallRef.current = (tc) => {
      console.log("[Page] Tool call:", tc.name, tc.args);
      if (tc.name === "trigger_animation" && tc.args.gesture_name) {
        setCurrentAnimation(tc.args.gesture_name);
        
        // Revert to idle after 3 seconds (approximate duration of most gestures)
        if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = setTimeout(() => {
          setCurrentAnimation("idle");
        }, 3000);
      }
    };
  }, [onToolCallRef]);

  // Send chat text
  const handleSendText = useCallback(
    (text: string) => {
      chat.addUserMessage(text);
      session.sendText(text);
    },
    [chat, session]
  );

  // Error handling
  if (session.errorMessage) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 max-w-md w-full">
          <h2 className="text-xl font-semibold mb-4 text-red-500">
            Connection Error
          </h2>
          <p className="text-sm text-zinc-400 mb-4">{session.errorMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-cyan-500 text-black rounded-lg font-medium hover:bg-cyan-400 transition-colors"
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
      <div className="absolute inset-0 scan-line z-0">
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
