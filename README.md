<div align="center">
  <h1>Digital Persona 🤖🎭</h1>
  <p><strong>A Persistent, Emotionally Reactive 3D Avatar Powered by Gemini 2.5 Flash Native Audio.</strong></p>
</div>

> **Bird's Eye View:** A fully embodied 3D digital instance built for the Google Gemini Live Agent Challenge. It merges the Gemini Live Multimodal API with a React Three Fiber driven Ready Player Me avatar, achieving sub-100ms conversational latency with procedural "life-like" ARKit blendshape expressions.

---

## 📖 Overview

Digital Persona is a state-of-the-art multimodal AI implementation. It does not simply return text; it is an **embodied entity** capable of sustaining natural face-to-face interactions. Utilizing a Next.js 16 Client-to-Server WebSockets architecture, the avatar leverages **Google's Gemini Multimodal Live API** to hear, see, and express emotions natively. 

The application utilizes native audio, Voice Activity Detection (Barge-in), Session Managment, and Ephemeral Tokens for secure, low-latency browser streaming.

---

## 🌟 The Vision

Text assistants are a thing of the past. The future of AI interaction requires a *Substrate* (the 3D Model), a *Brain* (Gemini 2.5 Flash), and a *Body* (R3F Scene) acting in unison. Digital Persona pushes the envelope by prioritizing **Emotive Realism**. The system doesn't just play canned animations; it incorporates procedural life behaviors—natural blinking, breathing, saccades (micro eye-movements), and context-aware ARKit emotional blending—yielding an almost human-like interactive experience.

---

## 🚀 Key Features

### 1. **Zero-Latency Conversational Architecture**
- **Client-to-Server WebSockets:** Uses Ephemeral Tokens provisioned by a Next.js backend, dropping the proxy overhead. The frontend connects directly to Gemini for pure audio streaming.
- **Interruption Handling (VAD):** Employs Gemini's native Voice Activity Detection. If a user interrupts ("barge-in"), the avatar instantly discards audio buffers, cancels animations, and listens.

### 2. **Emotive Realism & Lip-Syncing**
- **Co-articulation:** Combines ARKit blendshapes and Oculus Visemes for smooth phoneme transitions, rather than robotic mouth snaps.
- **Procedural "Life":** Features involuntary micro-twitches, asymmetric eyelid speeds during blinking (~100ms close, ~150ms open), and a sine-wave driven respiratory rate (~6 breaths/min).
- **Affective Responses:** Gemini maps sentiment to ARKit expressions (e.g., pulling `browDownRight`, `mouthFrownLeft` for sadness) concurrently with audio delivery.

### 3. **Deep Multimodal Awareness**
- **Video Framing (1 FPS):** Captures the user's physical environment via webcam, allowing the AI to ground its answers based on what it literally "sees".
- **Real-Time Function Calling (The Nervous System):** Exposes `trigger_animation`, `set_persona_mode`, `set_expression`, `display_text` to the model over the WebSocket, enabling physical gesticulations based on conversational intent.

---

## 🛠 Technology Stack

- **Framework:** Next.js 16, React 19
- **3D Rendering:** Three.js, React Three Fiber (`@react-three/fiber`), `@react-three/drei`
- **AI Core:** `@google/genai` (Unified SDK), Gemini 2.5 Flash Native Audio
- **Audio Processing:** 16-bit PCM, 16kHz Mono WebSockets Streaming
- **UI / Styling:** Tailwind CSS v4, Framer Motion, Radix UI
- **State Management:** Zustand (for transient high-FPS 3D render loops)

---

## ⚙️ Getting Started

### Prerequisites
- Node.js (v20+)
- Google Cloud Project with the **Gemini API** enabled (`GEMINI_API_KEY`)

### Installation

1. **Clone & Install Dependencies**
   ```bash
   git clone <repo-url>
   cd digital-persona
   npm install
   ```

2. **Configure Environment Variables**
   Create a `.env.local` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Validate the Substrate (Avatar Model)**
   Ensure the avatar and animations are correctly placed:
   ```bash
   npm run setup-avatar
   ```

4. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Navigate to [http://localhost:3000](http://localhost:3000). *(Make sure to grant Microphone & Camera permissions!)*

---

## 📂 Project Structure Overview

- [`/public`](./public/README.md) - Contains the Avatar `.glb` file, animations (`.fbx` / `.glb`), and global assets. 
- [`/src`](./src/README.md) - Main application source code. Home to the `useGeminiLive` session manager, Three.js components, and React UI overlays.
- [`/project_docs`](./project_docs/README.md) - The master guide. Contains organized subdirectories for `/architecture`, `/gemini_api`, `/avatar_and_animation`, and `/ui_and_design`.
- `/scripts` - Node scripts for validating and fetching required 3D resources.

> [!NOTE] 
> Dive into the individual subdirectories for specialized `README.md` files explaining their granular internal operations.
