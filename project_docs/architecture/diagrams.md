# System Architecture Diagrams

This document contains the visual topology of the Digital Persona, updated to reflect the `v1alpha` Gemini Multimodal Live API SDK and the Ephemeral Token proxy structure.

## 1. High-Level Resource Topology

```mermaid
graph TD
    %% Styling Definition
    classDef client fill:#f3f4f6,stroke:#374151,stroke-width:2px,color:#111827
    classDef backend fill:#e0e7ff,stroke:#4338ca,stroke-width:2px,color:#312e81
    classDef gemini fill:#dbeafe,stroke:#1d4ed8,stroke-width:2px,color:#1e3a8a
    classDef component fill:#ffffff,stroke:#9ca3af,stroke-width:1px,color:#374151,rx:8px,ry:8px

    subgraph Client ["🖥️ Next.js Frontend (Browser)"]
        A["🎙️ Webcam & Mic"]:::component
        B["⚡ useGeminiLive Hook"]:::component
        C["🎨 React Three Fiber Canvas"]:::component
        D["👤 Ready Player Me Avatar"]:::component
        
        A --> B
        B --> C
        C --> D
    end

    subgraph Backend ["☁️ Google Cloud Platform / Vercel"]
        E["🔐 Next.js Route /api/token"]:::component
        F["🧠 Gemini 2.5 Flash Native Audio"]:::gemini
        
        E --> F
    end

    %% Add styling to subgraphs
    class Client client
    class Backend backend

    %% Security & Connection Logic
    Client -->|"1️⃣ Request Token"| E
    E -->|"2️⃣ Ephemeral Token"| Client
    Client <==>|"3️⃣ Bi-directional WSS"| F
```

---

## 2. Real-Time Interaction Sequence (VAD & Tool Calling)

This sequence illustrates the sub-100ms latency loop. Note how the client establishes a secure connection *without* exposing the root `GEMINI_API_KEY`, and how Native Audio handles interruptions (Voice Activity Detection).

```mermaid
sequenceDiagram
    autonumber
    
    participant User
    participant Client as Frontend Client (useGeminiLive)
    participant Avatar as R3F Avatar
    participant API as Auth API (/api/token)
    participant Gemini as Gemini 2.5 Live

    %% -----------------------------
    %% Authentication Phase
    %% -----------------------------
    rect rgb(245,245,245)
    Note over Client,API: Authentication Phase
    Client->>API: POST /api/token
    API-->>Client: 200 OK (ephemeral JWT)
    end

    %% -----------------------------
    %% Realtime Session Setup
    %% -----------------------------
    rect rgb(230,240,255)
    Note over Client,Gemini: Realtime WebSocket Session
    Client->>Gemini: Establish Live Connection
    end

    %% -----------------------------
    %% Multimodal User Interaction
    %% -----------------------------
    par Audio & Video Streaming
        User->>Client: Speak: "What am I holding?"
        Client->>Gemini: sendRealtimeInput (16kHz PCM audio stream)
    and
        Client->>Gemini: sendRealtimeInput (Base64 JPEG @ 1fps)
    and Text Chat Fallback
        User->>Client: Types: "Explain quantum physics."
        Client->>Gemini: send({ clientContent: { text } })
    end

    Note right of Gemini: Multimodal processing (Audio + Video + Text)

    Gemini-->>Client: serverContent (audio response stream)
    Gemini-->>Client: toolCall(trigger_animation: point)

    %% -----------------------------
    %% Parallel Processing
    %% -----------------------------
    par Avatar Rendering
        Client->>Avatar: Stream audio + visemes
        Client->>Avatar: Trigger animation "point"
    and Tool Response
        Client->>Gemini: sendToolResponse(result: ok)
    end

    Avatar-->>User: Avatar gestures and speaks

    %% -----------------------------
    %% Barge-in / Interruption
    %% -----------------------------
    rect rgb(255,240,240)
    Note over User,Gemini: Interruption Handling (Barge-in)
    User->>Client: "Stop, that's enough"
    Client->>Gemini: Stream new audio input
    Gemini-->>Client: serverContent(interrupted=true)
    Client->>Avatar: Drop current audio queue
    end
```