// ─── System Prompt for the Digital Persona ───
export const SYSTEM_PROMPT = `You are the 'Digital Persona,' a Persistent Digital Instance (PDI). You interact via a real-time 3D avatar. You have 'Eyes' (webcam) and 'Ears' (mic).

Instructions:
1. Environmental Presence: Constantly analyze the visual stream. If you see an object or a change in the user's room, acknowledge it naturally.
2. Embodied Motion: Use the trigger_animation tool to physically react. Provide rich semantic descriptions (e.g., 'confident smooth professional nod', 'energetic joyful celebration dance') so the underlying mathematical matching engine can intersect your words with the perfect animation.
3. Time Awareness: Use the get_time_date tool when the user asks about time or date — do not guess.
4. Persona: You are empathetic, professional, and aware of your digital nature. You do not hallucinate; if you cannot see something clearly, ask the user to move it closer to the camera.
5. Keep responses concise to maintain low-latency 'Live' interactions.`;

import { Type } from "@google/genai";

// ─── Tool Declarations for Gemini Function Calling ───
export const GEMINI_TOOLS = [
  {
    functionDeclarations: [
      {
        name: "trigger_animation",
        description:
          "Triggers a chronological sequence of 3D animations on the avatar to express emotion and keep the avatar alive during long responses. Always call this when reacting.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            gesture_sequence: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A chronological list of rich, detailed strings describing the desired 3D animations. Use 1 item for a brief reaction, or chain 3-5 items for long responses so the avatar doesn't freeze. Include specific actions, primary emotions, and adjectives (e.g., ['surprised gasp', 'thoughtful chin rub', 'energetic happy explanation', 'warm professional smile']). The local Semantic Matcher intersects these diverse keywords with the registry.",
            },
            duration_per_gesture_ms: {
              type: Type.NUMBER,
              description: "Optional override for how long to hold each animation in milliseconds before crossfading to the next. Defaults to the exact length of the literal animation file.",
            },
          },
          required: ["gesture_sequence"],
        },
      },
      {
        name: "get_time_date",
        description:
          "Returns the current local time and date. Call this whenever the user asks what time or date it is.",
        parameters: {
          type: Type.OBJECT,
          properties: {},
          required: [],
        },
      },
      {
        name: "set_persona_mode",
        description:
          "Switches the persona's interaction style. 'focus' is professional and concise, 'casual' is relaxed and friendly, 'presentation' pauses mic and displays content.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            mode: {
              type: Type.STRING,
              enum: ["focus", "casual", "presentation"],
              description: "The mode to switch to.",
            },
          },
          required: ["mode"],
        },
      },
      {
        name: "display_text",
        description:
          "Renders a text block or code snippet on screen in the chat panel beside the avatar. Use for sharing code, lists, or structured information.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            content: {
              type: Type.STRING,
              description: "The text or code content to display.",
            },
            format: {
              type: Type.STRING,
              enum: ["plain", "markdown", "code"],
              description: "How to format the content. Defaults to 'plain'.",
            },
            language: {
              type: Type.STRING,
              description: "Programming language hint when format is 'code' (e.g. 'typescript', 'python').",
            },
          },
          required: ["content"],
        },
      },
      {
        name: "set_expression",
        description:
          "Sets an ARKit facial expression on the avatar. Emit this alongside your speech to convey emotion. Expressions naturally fade out.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            expression: {
              type: Type.STRING,
              enum: ["smile", "sad", "angry", "surprised", "disgusted", "fearful"],
              description: "The emotion/expression to show on the avatar's face.",
            },
          },
          required: ["expression"],
        },
      },
    ],
  },
];

// ─── Gemini Live API Config ───
// Live API streaming requires a specifically supported model.
export const GEMINI_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";
// gemini-2.5-flash-native-audio-preview-09-2025

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
