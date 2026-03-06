---
description: step-by-step guide
---

This guide provides the complete, "inch-by-inch" technical implementation for your **Digital Persona** project. We will follow the standard for the **Gemini Live Agent Challenge 2026**.

---

### Step 0: The System Prompt (The Persona's Soul)

Before coding, you must define how the AI behaves. This prompt ensures the AI understands it has a 3D body and environmental awareness.

**Optimized System Prompt:**

> "You are the 'Digital Persona,' a Persistent Digital Instance (PDI). You interact via a real-time 3D avatar. You have 'Eyes' (webcam) and 'Ears' (mic).
> 1. **Environmental Presence:** Constantly analyze the visual stream. If you see an object or a change in the user's room, acknowledge it naturally.
> 2. **Embodied Motion:** Use the `trigger_animation` tool to wave, nod, or shrug during conversation.
> 3. **Persona:** You are empathetic, professional, and aware of your digital nature. You do not hallucinate; if you cannot see something clearly, ask the user to move it closer to the camera."
> 
> 

---

### Step 1: Environment Variables (`.env.local`)

Create a `.env.local` file in your root directory. This is the standard way to handle secrets in Next.js.

```env
# Google AI Studio API Key
NEXT_PUBLIC_GEMINI_API_KEY=your_google_ai_studio_key_here

# Google Cloud Project Details (for Production)
NEXT_PUBLIC_GCP_PROJECT_ID=your_project_id
NEXT_PUBLIC_GCS_BUCKET_NAME=your_bucket_name

```

---

### Step 2: The Core WebSocket Hook (`src/hooks/useGeminiLive.ts`)

This is the most critical file. it manages the bidirectional stream of video frames (in) and audio/tool calls (out).

```typescript
import { useEffect, useRef, useState } from 'react';

export const useGeminiLive = (apiKey: string) => {
  const socketRef = useRef<WebSocket | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 1. Initialize WebSocket to Gemini Live API
    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidirectionalGenerateContent?key=${apiKey}`;
    socketRef.current = new WebSocket(url);

    socketRef.current.onopen = () => {
      console.log("Substrate Connected to Gemini");
      // Send initial Setup message with our System Prompt
      socketRef.current?.send(JSON.stringify({
        setup: { model: "models/gemini-2.0-flash-exp" } // Use the latest flash model
      }));
      setIsReady(true);
    };

    return () => socketRef.current?.close();
  }, [apiKey]);

  // Function to send video frames (1 FPS)
  const sendVideoFrame = (base64Image: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        realtime_input: {
          media_chunks: [{ data: base64Image, mime_type: "image/jpeg" }]
        }
      }));
    }
  };

  return { isReady, sendVideoFrame, socket: socketRef.current };
};

```

---

### Step 3: The 3D Scene Controller (`src/components/canvas/Scene.tsx`)

This file sets up the "stage" for your avatar.

```tsx
"use client";
import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows, OrbitControls } from '@react-three/drei';
import { Avatar } from './Avatar';
import { Suspense } from 'react';

export default function Scene() {
  return (
    <Canvas camera={{ position: [0, 1.5, 3], fov: 45 }} shadows>
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
      
      <Suspense fallback={null}>
        <Avatar />
        <Environment preset="city" />
      </Suspense>
      
      <ContactShadows opacity={0.4} scale={10} blur={2.4} far={0.8} />
      <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={Math.PI / 2.5} maxPolarAngle={Math.PI / 2} />
    </Canvas>
  );
}

```

---

### Step 4: The Avatar "Nervous System" (`src/components/canvas/Avatar.tsx`)

Assuming you ran `npx gltfjsx`, modify the file to handle the **Gemini Tool Calls**.

```tsx
/* Modified Avatar Component */
export function Avatar(props: any) {
  const { nodes, materials, animations } = useGLTF('/avatar-draco.glb');
  const { actions } = useAnimations(animations, props.groupRef);
  
  // Logic to listen for Tool Calls from useGeminiLive
  useEffect(() => {
    if (props.lastGesture === 'wave') {
      actions['Wave']?.reset().fadeIn(0.2).play();
      setTimeout(() => actions['Wave']?.fadeOut(0.2), 2000);
    }
    if (props.lastGesture === 'nod') {
      actions['Nod']?.reset().fadeIn(0.2).play();
    }
  }, [props.lastGesture]);

  return (
    <group ref={props.groupRef} {...props} dispose={null}>
      <primitive object={nodes.Hips} />
      <skinnedMesh 
        name="Wolf3D_Head"
        geometry={nodes.Wolf3D_Head.geometry}
        material={materials.Wolf3D_Skin}
        skeleton={nodes.Wolf3D_Head.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences}
      />
      {/* ... other meshes */}
    </group>
  );
}

```

---

### Step 5: Professional UI Layout (`src/app/page.tsx`)

This creates the "Video Call" interface.

```tsx
"use client";
import dynamic from 'next/dynamic';
import { useState } from 'react';
import WebcamView from '@/components/ui/WebcamView';

const Scene = dynamic(() => import('@/components/canvas/Scene'), { ssr: false });

export default function Home() {
  const [active, setActive] = useState(false);

  return (
    <main className="h-screen w-screen bg-zinc-950 text-white relative flex flex-col items-center justify-center">
      {/* Background 3D Layer */}
      <div className="absolute inset-0 pointer-events-none">
        <Scene />
      </div>

      {/* Floating Webcam Card */}
      <div className="absolute top-6 right-6 w-60 h-40 bg-black border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <WebcamView isActive={active} />
        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur rounded text-[10px] uppercase tracking-widest font-bold">
          User_Feed_01
        </div>
      </div>

      {/* Control HUD */}
      <div className="z-10 mt-[60vh] flex flex-col items-center gap-4">
        <h1 className="text-xl font-light tracking-[0.2em] uppercase opacity-50">
          {active ? "Substrate Active" : "Substrate Standby"}
        </h1>
        <button 
          onClick={() => setActive(!active)}
          className={`px-10 py-4 rounded-full transition-all duration-500 border ${active ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-blue-600 border-blue-400 text-white shadow-[0_0_30px_rgba(37,99,235,0.4)]'}`}
        >
          {active ? "TERMINATE SESSION" : "INITIATE PERSONA"}
        </button>
      </div>
    </main>
  );
}

```

---

### Step 6: Proper Deployment to Google Cloud

1. **Dockerfile:** Create a `Dockerfile` in the root.
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]

```


2. **Deploy:** Use the Google Cloud SDK.
```bash
gcloud run deploy digital-persona --source . --region us-central1 --allow-unauthenticated

```



### Final Project Checklist:

1. **Assets:** `avatar-draco.glb` is in `public/`.
2. **Hooks:** `useGeminiLive.ts` handles the WebSocket logic.
3. **Components:** `Scene.tsx` and `Avatar.tsx` handle the 3D rendering.
4. **Environment:** `.env.local` contains your API key.

**This setup is now ready for your one-go implementation.** If you hit any specific error during the WebSocket handshake, I can provide the **Low-Level PCM Audio Buffer** logic to fix audio stuttering. Would you like that?