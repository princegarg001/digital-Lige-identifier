"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

// Components
import { WebcamFeed } from "@/components/call/WebcamFeed";
import { CallControls } from "@/components/call/CallControls";
import { StatusBar } from "@/components/call/StatusBar";
import { AudioWaveform } from "@/components/call/AudioWaveform";
import {
  TranscriptPanel,
  type TranscriptMessage,
} from "@/components/call/TranscriptPanel";

// Hooks
import { useGeminiLive } from "@/hooks/useGeminiLive";
import { useAudioProcessor } from "@/hooks/useAudioProcessor";
import { useWebcam } from "@/hooks/useWebcam";

// Lazy-load the 3D scene (no SSR)
const Scene = dynamic(() => import("@/components/canvas/Scene"), { ssr: false });

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

export default function Home() {
  // ── State ──
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);

  // ── Hooks ──
  const gemini = useGeminiLive(API_KEY);
  const audio = useAudioProcessor();
  const webcam = useWebcam();

  const isConnected = gemini.status === "connected";

  // ── Wire up Gemini callbacks ──
  useEffect(() => {
    gemini.onAudioData.current = (b64) => {
      audio.playAudioChunk(b64);
    };
  }, [gemini.onAudioData, audio]);

  useEffect(() => {
    gemini.onTranscript.current = (text) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: text,
          timestamp: new Date(),
        },
      ]);
    };
  }, [gemini.onTranscript]);

  useEffect(() => {
    gemini.onToolCall.current = (tc) => {
      console.log("[Page] Tool call received:", tc);
      // Tool calls are handled by the Avatar through audio level for now
    };
  }, [gemini.onToolCall]);

  // ── Wire webcam frames → Gemini ──
  useEffect(() => {
    webcam.onFrameRef.current = (base64) => {
      if (isConnected) {
        gemini.sendVideoFrame(base64);
      }
    };
  }, [webcam.onFrameRef, isConnected, gemini]);

  // ── Connection control ──
  const handleToggleConnection = useCallback(() => {
    if (isConnected) {
      gemini.disconnect();
      audio.stopMic();
      webcam.stop();
    } else {
      gemini.connect();
      webcam.start();
      audio.startMic((chunk) => {
        gemini.sendAudioChunk(chunk);
      });
    }
  }, [isConnected, gemini, audio, webcam]);

  const handleToggleMic = useCallback(() => {
    if (audio.isMicActive) {
      audio.stopMic();
    } else {
      audio.startMic((chunk) => {
        if (gemini.status === "connected") {
          gemini.sendAudioChunk(chunk);
        }
      });
    }
  }, [audio, gemini]);

  const handleToggleCamera = useCallback(() => {
    if (webcam.isActive) {
      webcam.stop();
    } else {
      webcam.start();
    }
  }, [webcam]);

  const handleSendText = useCallback(
    (text: string) => {
      gemini.sendText(text);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "user",
          content: text,
          timestamp: new Date(),
        },
      ]);
    },
    [gemini]
  );

  return (
    <main className="h-screen w-screen bg-[#030712] relative flex overflow-hidden">
      {/* ── Background Grid ── */}
      <div className="absolute inset-0 grid-bg opacity-50" />

      {/* ── Ambient glow blurs ── */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* ── Top Bar ── */}
        <header className="flex items-center justify-between px-6 py-4">
          {/* Logo / Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide">
                DIGITAL PERSONA
              </h1>
              <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
                Substrate v1.0
              </p>
            </div>
          </div>

          {/* Status */}
          <StatusBar status={gemini.status} />
        </header>

        {/* ── 3D Avatar Area ── */}
        <div className="flex-1 relative">
          {/* The 3D Scene */}
          <div className="absolute inset-0 scan-line">
            <Scene
              isActive={isConnected || gemini.status === "connecting"}
              audioLevel={audio.audioLevel}
            />
          </div>

          {/* Persona name overlay */}
          <AnimatePresence>
            {isConnected && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-6 left-6"
              >
                <div className="glass rounded-xl px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <AudioWaveform
                      audioLevel={audio.audioLevel}
                      isActive={isConnected}
                    />
                    <div>
                      <p className="text-sm font-medium text-white">
                        AI Persona
                      </p>
                      <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                        {audio.audioLevel > 0.05 ? "Speaking" : "Listening"}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Webcam (top-right) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-4 right-4 w-56 h-40 rounded-xl overflow-hidden shadow-2xl"
          >
            <WebcamFeed videoRef={webcam.videoRef} isActive={webcam.isActive} />
          </motion.div>

          {/* Center prompt when disconnected */}
          <AnimatePresence>
            {!isConnected && gemini.status !== "connecting" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 flex flex-col items-center justify-center"
              >
                <div className="glass rounded-3xl px-12 py-10 flex flex-col items-center gap-6 max-w-md">
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
                    onClick={handleToggleConnection}
                    className="px-8 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-semibold text-sm tracking-wide hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] transition-all duration-500 hover:scale-105"
                  >
                    INITIATE SESSION
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Bottom Controls ── */}
        <footer className="flex items-center justify-center px-6 py-5">
          <div className="glass rounded-2xl px-6 py-3">
            <CallControls
              isConnected={isConnected}
              isMicActive={audio.isMicActive}
              isCameraActive={webcam.isActive}
              isChatOpen={isChatOpen}
              onToggleConnection={handleToggleConnection}
              onToggleMic={handleToggleMic}
              onToggleCamera={handleToggleCamera}
              onToggleChat={() => setIsChatOpen(!isChatOpen)}
            />
          </div>
        </footer>
      </div>

      {/* ── Transcript Panel (right side) ── */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="h-full py-4 pr-4 relative z-20"
          >
            <TranscriptPanel
              messages={messages}
              onSendText={handleSendText}
              onClose={() => setIsChatOpen(false)}
              isOpen={isChatOpen}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
