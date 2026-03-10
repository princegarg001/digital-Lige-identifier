# Source (`/src`) Directory

The `src/` directory forms the main brain and body of the **Digital Persona** Application. It combines a Next.js 14+ standard App Router with specialized components for Real-time WebSockets, WebGL 3D rendering, and native PCM audio streaming.

## 🏗 Directory Architecture

### `/app`
- Contains `page.tsx`, the primary orchestrator that mounts the Video Call Layout, Floating Debug Panels, Chat interfaces, and the 3D `<Scene />`.

### `/components`
- **`/canvas`**: React Three Fiber components (`Scene.tsx`, `Avatar.tsx`). Contains the raw WebGL rendering logic. This is where the Ready Player Me morph targets are manipulated inside the high-performance 60FPS `useFrame` hook to simulate procedural breathing, blinking, and lip-syncing.
- **`/call` & `/chat`**: React UI overlays for session controls, connecting to the API, sending chat fallbacks, displaying the webcam feed (PiP), and toggling the mic/camera.
- **`/ui`**: Reusable generic parts (tailored buttons, panels, etc.).

### `/hooks`
- The core integration with **Gemini Multimodal Live API**:
  - `useGeminiLive.ts`: Manages the Client-to-Server Ephemeral WebSocket connection. 
  - `useSessionManager.ts`: Abstracted lifecycle manager handling connect/disconnect states and routing tool calls.
- **Animation System:** `useAnimationRegistry.ts` manages the catalog of available `.glb` animations and interpolations.

### `/store`
- Uses **Zustand** for state management (`useAnimationStore.ts`, `useEmotionStore.ts`). 
- **Why Zustand?** High-frequency operations like changing lip-sync values or triggering a wave animation cannot rely on standard React `useState` because it would cause the whole UI layer to re-render. Zustand uses transient updates directly bound to Three.js refs for extreme performance.

### `/lib`
- Specialized utility scripts.
  - `animationMatcher.ts`: Matches semantic tool call inputs (like `"agree"`) to the physical 3D animation files available.
  - `skinConfig.ts`: Scene lighting and material configurations.

---

> [!TIP]
> **To Developers:** Modifying the raw connection logic or audio resampling should be done in `/hooks/useGeminiLive.ts`. Modifying how the avatar physically behaves (blinking curves, breathing sine waves) should be isolated entirely within `/components/canvas/Avatar.tsx`.
