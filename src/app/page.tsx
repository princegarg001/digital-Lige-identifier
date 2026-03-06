"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, memo } from "react";
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
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-3xl px-12 py-10 flex flex-col items-center gap-6 max-w-md">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400/20 to-emerald-400/20 border border-cyan-400/20 flex items-center justify-center animate-pulse-ring">
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
        className="px-8 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-semibold text-sm tracking-wide hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] transition-all duration-500 hover:scale-105"
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

  // Session management
  const session = useSessionManager(API_KEY);
  const timer = useSessionTimer(session.isConnected);
  const chat = useChatMessages();

  // Wire up transcript handler
  useEffect(() => {
    session.onTranscript.current = (text) => {
      chat.addAssistantMessage(text);
    };
  }, [session.onTranscript, chat]);

  // Wire up tool call handler
  useEffect(() => {
    session.onToolCall.current = (tc) => {
      console.log("[Page] Tool call:", tc.name, tc.args);
      // Future: Handle animations based on tool calls
    };
  }, [session.onToolCall]);

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
      {/* Header */}
      <CallHeader status={session.status} sessionTime={timer.formatted} />

      {/* 3D Avatar Area */}
      <div className="flex-1 relative">
        {/* 3D Scene */}
        <div className="absolute inset-0 scan-line">
          <Scene
            isActive={session.isConnected || session.status === "connecting"}
            audioLevel={session.audioLevel}
          />
        </div>

        {/* Persona overlay */}
        <PersonaOverlay
          audioLevel={session.audioLevel}
          isConnected={session.isConnected}
        />

        {/* Floating Webcam */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="absolute top-4 right-4 w-52 h-36 rounded-xl overflow-hidden shadow-2xl z-10"
        >
          <WebcamFeed
            videoRef={session.videoRef}
            isActive={session.isCameraActive}
          />
        </motion.div>

        {/* Idle Screen */}
        <AnimatePresence>
          {!session.isConnected && session.status !== "connecting" && (
            <IdleScreen onStart={session.toggleSession} />
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Controls */}
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
