This structured meta-prompt is engineered using the **Lyra 4-D Methodology** (Context, Mission, Constraints, and Tone) and **Role-Based Prompting** techniques. It is designed to act as your "Lead Architect" to build the **Digital Persona** application precisely as outlined in your technical guides and architectural diagrams.

---

## The Lyra-Optimized Meta-Prompt

**Role:** Lead AI Architect & Multimodal Systems Engineer.

**Mission:** Architect and provide the full-stack implementation for a persistent 3D Digital Persona using Next.js 15, Three.js, and the Gemini 3 Live API for the 2026 Gemini Live Agent Challenge.

1. Context & Foundation 

* 
**The Substrate:** A Ready Player Me `.glb` model with ARKit blendshapes.


* 
**The Brain:** Gemini 3 Flash via the Multimodal Live API (WebSockets).


* 
**The Vision:** Real-time environmental awareness via webcam feed analysis.


* 
**The Body:** A Three.js / React Three Fiber scene with skeletal animations.



2. Detailed Instruction Sequences 

* 
**Step 1 (Environment):** Configure the `.env.local` for Gemini API keys and Google Cloud Project IDs.


* 
**Step 2 (Orchestration):** Write a custom hook (`useGeminiLive.ts`) that handles the bidirectional WSS stream of 16-bit PCM audio and JPEG video frames.


* 
**Step 3 (The Bridge):** Implement **Function Calling** to translate Gemini's JSON tool calls (e.g., `trigger_animation`) into Three.js state changes.


* 
**Step 4 (Fidelity):** Implement real-time lip-sync using viseme-mapping of the audio output to the model's morph targets.



3. Strategic Constraints & Tradeoffs 

* 
**Latency:** Prioritize sub-100ms response times.


* 
**Scale:** Use Google Cloud Run for backend containerization and Cloud Storage for asset delivery.


* 
**Stability:** Use a Temporal Buffer to prevent animation/audio desync.


* 
**Safety:** Ground all responses in the visual context to prevent hallucinations.



4. Deliverable Format 

* Provide clean, modular TypeScript code for each file.


* Include a C4 Container and Sequence diagram for the submission.


* Draft a 200-character "Bird’s Eye View" pitch and a technical Devpost description.



---

## Implementation Guide for the Builder

To use this meta-prompt effectively in your IDE, follow these steps in order:

### 1. Initialize the Core Stack

> **Action:** Input the meta-prompt above into your AI assistant.
> **Expected Output:** A structured breakdown of the `useGeminiLive` hook and the `Avatar.tsx` logic.

### 2. The "Substrate" Setup

* 
**Assets:** Ensure `avatar.glb` is in `/public/`.


* 
**Command:** Run `npx gltfjsx public/avatar.glb --transform --types` to create your component.



### 3. The Live Loop (WebSocket Heartbeat)

Ensure your code follows this sequence:

1. 
**Frontend** captures webcam frame.


2. 
**Frontend** sends interleaved frame + audio to **Gemini**.


3. 
**Gemini** returns a Tool Call + Audio.


4. 
**Avatar** plays animation and speaks.



---

**Would you like me to generate the specific `Avatar.tsx` file now that utilizes the Ready Player Me morph targets for the lip-syncing logic we defined?**

# Avatar link
https://models.readyplayer.me/69aaa1126e4b038c0e57c67a.glb?morphTargets=ARKit