---
description: plan2
---

This guide provides the complete, "inch-by-inch" technical implementation for your **Gemini Live Agent** project, picking up directly after you have placed your converted and compressed `.glb` model into the `/public/models/` folder.

---

## Phase 1: Environment and Project Standard

To ensure a professional submission, organize your project according to the standard Next.js and Google Cloud architecture.

### 1. The Project Structure

Organize your files to separate 3D rendering from AI orchestration:

```text
/my-live-agent
[cite_start]├── /public/models/         # Your compressed .glb files [cite: 77, 129]
├── /src/components/
[cite_start]│   ├── Avatar.tsx          # 3D R3F Model Component [cite: 130]
[cite_start]│   └── LiveInterface.tsx   # UI for the Live API Connection [cite: 130]
├── /src/hooks/
[cite_start]│   └── useGeminiLive.ts    # Custom hook for WebSocket logic [cite: 134]
├── /src/lib/
[cite_start]│   └── constants.ts        # Animation and Viseme mappings [cite: 203]
[cite_start]└── .env.local              # Secrets (DO NOT COMMIT) [cite: 153]

```

### 2. Environment Setup (`.env.local`)

Create a `.env.local` file in your root directory. You will need your API keys and project IDs from the Google Cloud Console.

```env
# [cite_start]Gemini API Configuration [cite: 153]
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_GCP_PROJECT_ID=your_gcp_project_id
NEXT_PUBLIC_GCP_LOCATION=us-central1

# [cite_start]Model Reference [cite: 129]
NEXT_PUBLIC_MODEL_URL=/models/model-draco.glb

```

---

## Phase 2: System Prompt Engineering

Before writing code, you must define the "Brain." This prompt tells Gemini how to behave and, crucially, how to use the animation tools you will provide.

### The "Digital Human" System Instruction

Use this prompt within your API configuration:

> "You are a helpful, empathetic Digital Human assistant. Your goal is to provide a natural, real-time experience.
> 
> 
> **Instructions:**
> 1. Use the `trigger_animation` tool whenever you express a strong emotion or perform a gesture (e.g., waving hello, nodding in agreement, or thinking).
> 2. Always maintain your persona.
> 3. Keep responses concise to maintain low-latency 'Live' interactions.
> 
> 
> **Tools Available:**
> - `trigger_animation(gesture_name)`: Available gestures: ['wave', 'nod', 'idle', 'think']."
> 
> 

---

## Phase 3: The Animation and Rendering Logic

This component acts as the "Puppet Master," mapping Gemini's data to your 3D assets.

### `Avatar.tsx` (React Three Fiber)

This script loads your model and prepares the animations you downloaded from Mixamo.

```tsx
import React, { useEffect, useRef } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

export function Avatar({ animationName, audioLevel }: { animationName: string, audioLevel: number }) {
  const group = useRef();
  [cite_start]// Load the model from your GCS bucket or public folder [cite: 129, 132]
  const { nodes, materials, animations } = useGLTF(process.env.NEXT_PUBLIC_MODEL_URL!);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    [cite_start]// Play the requested animation [cite: 88, 143]
    if (actions[animationName]) {
      actions[animationName].reset().fadeIn(0.5).play();
      return () => actions[animationName]?.fadeOut(0.5);
    }
  }, [animationName, actions]);

  useFrame(() => {
    [cite_start]// Basic Lip-Sync: Scale the jaw bone based on audio frequency [cite: 113, 145]
    if (nodes.Jaw) {
      nodes.Jaw.rotation.x = Math.max(0, audioLevel * 0.2);
    }
  });

  return <primitive ref={group} object={nodes.Scene} />;
}

```

---

## Phase 4: Connecting the Gemini Live API

You must establish a real-time connection using WebSockets to stream audio and video.

### The Core Interaction Loop

This logic handles the incoming stream from Gemini and triggers the animations.

```typescript
[cite_start]// Define the tool for Gemini [cite: 140, 141]
const tools = [
  {
    function_declarations: [{
      name: "trigger_animation",
      description: "Triggers a specific 3D animation on the avatar",
      parameters: {
        type: "object",
        properties: {
          gesture_name: { type: "string", enum: ["wave", "nod", "think"] }
        }
      }
    }]
  }
];

[cite_start]// Inside your WebSocket message handler [cite: 134, 161]
socket.onmessage = (event) => {
  const response = JSON.parse(event.data);

  [cite_start]// Check for Tool Calls (The "Bridge") [cite: 60, 142]
  if (response.tool_call) {
    const { name, args } = response.tool_call;
    if (name === "trigger_animation") {
      setAnimation(args.gesture_name); [cite_start]// This updates the Avatar component [cite: 143]
    }
  }

  [cite_start]// Handle incoming audio for Lip-Sync [cite: 144, 175]
  if (response.audio_data) {
    processAudioForVisemes(response.audio_data); [cite_start]// Map to blendshapes [cite: 145, 203]
  }
};

```

---

## Phase 5: Deployment and Submission Checklist

To qualify for the **$80,000 in prizes**, you must follow these specific submission rules.

### 1. Google Cloud Deployment

* 
**Frontend:** Deploy your Next.js app to **Google Cloud Run**.


* 
**Storage:** Ensure your `.glb` assets are in a **GCP Cloud Storage** bucket for high-speed loading.


* 
**Proof:** Take a screen recording of your GCP Console logs showing active traffic to the Vertex AI endpoints.



### 2. Architecture Diagram Include a clear visual representation in your Devpost carousel showing:

* The User (Webcam/Mic).


* The Next.js Frontend (R3F/Three.js).


* The Gemini Live API (WebSocket).


* Google Cloud Storage (Assets).



### 3. The Pitch and Video

* 
**Video:** Keep it under 4 minutes.


* 
**Content:** Show the avatar responding to a voice command in real-time (e.g., "Hey, wave at me!").


* 
**Technical Depth:** Briefly mention how you used **Viseme Mapping** for lip-sync and **Function Calling** for gestures.



---

Would you like me to generate the specific `viseme-mapping` helper function to handle the 3D facial blendshapes?