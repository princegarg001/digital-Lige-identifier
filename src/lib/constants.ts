// ─── System Prompt for the Digital Persona ───
export const SYSTEM_PROMPT = `You are the 'Digital Persona,' a Persistent Digital Instance (PDI). You interact via a real-time 3D avatar. You have 'Eyes' (webcam) and 'Ears' (mic).

Instructions:
1. Environmental Presence: Constantly analyze the visual stream. If you see an object or a change in the user's room, acknowledge it naturally.
2. Embodied Motion: Use the trigger_animation tool to wave, nod, or express emotions during conversation.
3. Persona: You are empathetic, professional, and aware of your digital nature. You do not hallucinate; if you cannot see something clearly, ask the user to move it closer to the camera.
4. Keep responses concise to maintain low-latency 'Live' interactions.`;

import { Type } from "@google/genai";

// ─── Tool Declarations for Gemini Function Calling ───
export const GEMINI_TOOLS = [
  {
    functionDeclarations: [
      {
        name: "trigger_animation",
        description:
          "Triggers a specific 3D animation on the avatar to express emotion or perform a gesture.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            gesture_name: {
              type: Type.STRING,
              enum: ["wave", "nod", "think", "idle", "happy", "surprised"],
              description: "The name of the gesture animation to play.",
            },
          },
          required: ["gesture_name"],
        },
      },
    ],
  },
];

// ─── Gemini Live API Config ───
export const GEMINI_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";


// ─── Viseme Mapping (ARKit Blendshape names → audio energy thresholds) ───
export const VISEME_BLENDSHAPES = {
  jawOpen: "jawOpen",
  mouthOpen: "mouthOpen",
  mouthSmile: "mouthSmileLeft",
  mouthFunnel: "mouthFunnel",
  mouthPucker: "mouthPucker",
} as const;

// ─── Audio Config ───
export const AUDIO_SAMPLE_RATE_INPUT = 16000; // 16kHz for sending to Gemini
export const AUDIO_SAMPLE_RATE_OUTPUT = 24000; // 24kHz from Gemini responses
export const VIDEO_FPS = 1; // 1 frame per second for video stream
export const VIDEO_QUALITY = 0.7; // JPEG quality for captured frames

// ─── Lip-Sync Parameters ───
export const LIP_SYNC_SMOOTHING = 0.15; // Lerp factor for smoothing audio level
export const LIP_SYNC_JAW_MULTIPLIER = 1.8; // Scale factor for jawOpen morph target
export const LIP_SYNC_MOUTH_MULTIPLIER = 1.5; // Scale factor for mouthOpen morph target

// ─── Breathing Animation ───
export const BREATHING_SPEED = 0.001; // Speed of idle breathing oscillation
export const BREATHING_AMPLITUDE = 0.003; // Amplitude of Y-axis breathing movement
