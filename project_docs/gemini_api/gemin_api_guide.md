Based on the Google Cloud blog post and official documentation, here is the complete documentation for the **Gemini Live API on Vertex AI**, formatted as a Markdown file.

---

# Gemini Live API: Features & Implementation Guide (Vertex AI)

The Gemini Live API (powered by the **Gemini 2.5 Flash Native Audio** model) enables low-latency, real-time, multimodal interactions. Unlike traditional STT-LLM-TTS pipelines, it uses a **native audio architecture** where a single model processes raw audio, leading to human-like response times and emotional intelligence.

---

## 🚀 Key Features

### 1. Native Audio Processing

* **Low Latency:** Eliminates the delay caused by converting speech to text and back. Response times are typically sub-second.
* **Affective Dialogue:** The model understands acoustic nuances like tone, emotion, and pace. It can de-escalate stressful calls or match a user's excitement.

### 2. Real-Time Multimodality

* **Vision + Voice:** You can stream live video (e.g., a user's camera or screen) while talking. The model can "see" and "hear" simultaneously to provide context-aware advice.
* **Bidirectional Streaming:** Uses WebSockets for continuous, two-way communication of text, audio, and visual data.

### 3. Proactive Audio & Interaction

* **Barge-in (Interruption Handling):** The model detects when a user starts speaking and can immediately stop its current generation.
* **Smarter VAD:** Moves beyond basic Voice Activity Detection (VAD) to decide when to interject and when to remain a "silent co-listener."

### 4. Advanced Tool Integration

* **Function Calling:** The agent can execute code or call external APIs (e.g., `process_refund`, `check_inventory`) mid-conversation.
* **Grounding:** Integration with Google Search for real-time world knowledge.

### 5. Enterprise-Grade Stability

* **GA Release:** Available as a Generally Available (GA) feature on Vertex AI with multi-region support and high availability.

---

## 🛠 Technical Specifications

| Category | Details |
| --- | --- |
| **Model ID** | `gemini-live-2.5-flash-native-audio` |
| **Protocol** | Stateful WebSocket (WSS) |
| **Input Audio** | 16-bit PCM, 16kHz, Little-endian |
| **Output Audio** | 16-bit PCM, 24kHz, Little-endian |
| **Video Input** | JPEG frames (typically 1 FPS recommended) |
| **Max Session** | Long-running sessions supported via Context Window Compression |

---

## 💻 Implementation Guide (Python)

### 1. Recommended Architecture

For production, use a **Secure Proxy** pattern:
`User App (Frontend) <-> Backend Server (Node/Python) <-> Gemini Live API (Vertex AI)`
This keeps your Google Cloud credentials secure and allows for session persistence.

### 2. Basic Setup

```python
import asyncio
from google import genai
from google.genai import types

# Initialize Client
client = genai.Client(vertexai=True, project="your-project-id", location="us-central1")
model_id = "gemini-live-2.5-flash-native-audio"

async def start_live_session():
    config = {
        "response_modalities": ["AUDIO"],
        "speech_config": {"voice_name": "Puck"}, # Choose from Puck, Charon, Kore, etc.
        "system_instruction": "You are a helpful assistant. Be concise."
    }
    
    async with client.aio.live.connect(model=model_id, config=config) as session:
        print("Connected to Gemini Live...")
        
        # Example: Sending an audio chunk (simulated)
        # await session.send_realtime_input(audio=types.Blob(data=audio_bytes, mime_type='audio/pcm;rate=16000'))

        async for message in session.receive():
            if message.server_content:
                # Handle audio output
                if message.server_content.model_turn:
                    for part in message.server_content.model_turn.parts:
                        if part.inline_data:
                            # Play audio data (24kHz PCM)
                            pass

```

### 3. Implementing Tool Use (Function Calling)

You can define tools in the initial setup message:

```python
tools = [{
    "function_declarations": [{
        "name": "get_weather",
        "description": "Get current weather for a city",
        "parameters": {
            "type": "OBJECT",
            "properties": {"location": {"type": "STRING"}},
            "required": ["location"]
        }
    }]
}]

# Include in session config
config["tools"] = tools

```

---

## 💡 Best Practices

1. **Audio Chunking:** Send audio in small chunks (**20ms to 100ms**) to minimize latency. Do not buffer 1+ seconds of audio before sending.
2. **Interruption Logic:** When you receive a `server_content` message with `"interrupted": true`, immediately clear your local client-side playback buffer so the AI doesn't keep "talking over" the user.
3. **Resampling:** Ensure your frontend captures audio at 44.1/48kHz but resamples to **16kHz** before sending to the API.
4. **System Instructions:** Use a clear persona. If you want a specific accent, specify both the accent and the output language (e.g., "British accent for an English speaker").
5. **Thinking Budget:** For complex reasoning, you can enable "thinking" by setting a `thinkingBudget` (tokens used for internal reasoning before speaking).

---

The Gemini Live API is a powerful, stateful WebSocket-based API designed to facilitate low-latency, real-time voice and video interactions with Gemini models. It enables applications to process continuous streams of audio, video, or text input and respond with immediate, human-like spoken or text-based outputs, creating highly natural conversational experiences.

Here's a detailed breakdown of its features:

Real-time Interaction and Multimodality
The core strength of the Live API lies in its real-time, bidirectional streaming capabilities.

Low-latency Real-time Interaction: Engineered for rapid responses, making it ideal for conversational AI applications where quick turn-taking is crucial.
Multimodal Support: The API allows the model to "see, hear, and speak," processing continuous streams of:
Audio: Raw 16-bit PCM audio (16kHz, little-endian) as input, and raw 16-bit PCM audio (24kHz, little-endian) as output.
Video: Images/video streamed at 1 frame per second (FPS).
Text: Text input and output.
Advanced Audio Capabilities
The Live API offers sophisticated features for voice-based interactions, particularly with models like Gemini 2.5 Flash Native Audio.

High Audio Quality: Delivers natural and realistic-sounding speech with 30 HD voices across 24 languages.
Multilingual Support: Seamlessly switches between 70 languages during a conversation without needing prior configuration.
Affective Dialog: Interprets subtle acoustic nuances like tone and emotion from raw audio to adapt its response style, which can be used to de-escalate calls or adopt an empathetic tone.
Proactive Audio (Preview): The model intelligently decides when to respond and when to remain a silent co-listener, preventing unnecessary interruptions.
Improved Barge-in (Voice Activity Detection - VAD): Allows users to interrupt the model at any time for more responsive interactions. VAD detects when a person is speaking and cancels ongoing generation if an interruption occurs. It can be configured for sensitivity or disabled.
Accurate Transcriptions: Provides significantly enhanced and accurate text transcripts of both user input and model output.
Tool Use and Integration
The Live API integrates with various tools to extend the model's capabilities beyond simple conversation.

Function Calling: Supports connecting to external APIs and tools, enabling the Live API to perform real-world actions. Functions must be declared at the beginning of the session, and asynchronous function calling is supported to avoid blocking conversations.
Grounding with Google Search: Can be enabled during session configuration to improve accuracy and reduce hallucinations by grounding responses in current web events and facts.
Code Execution: The model can generate and execute Python code in a sandbox environment to solve problems or process data.
Session Management
The Live API is session-based, using WebSockets for persistent connections and continuous streaming.

Session Memory: The model retains memory of all interactions within a single session, recalling previously heard or seen information.
Context Window Compression: Can be enabled to extend session duration beyond default limits (e.g., 15 minutes for audio-only, 2 minutes for audio + video).
Session Resumption: Allows a single session to remain active across multiple connections, preventing termination if the WebSocket connection resets.
Key Considerations and Limitations
Server-to-Server Communication: The Gemini Live API is primarily designed for server-to-server communication. For client-to-server implementations in web and mobile apps, it's recommended to use integrations from partners like Daily, or Firebase AI Logic client SDKs for security and other services.
Session Duration: The default maximum session duration is 10 minutes.
Video Frame Rate: Video input is processed at 1 FPS, which may not be suitable for use cases requiring analysis of fast-changing video.
Function Calling with Audio: Audio inputs and outputs can negatively impact the model's ability to use function calling.
Token Count: Token count is not currently supported for the Live API.
Authentication: Client authentication should be routed through an intermediate application server for secure access to the Live API.
The Gemini Live API (BidiGenerateContent) is a stateful WebSocket-based API that distinguishes itself from standard generateContent (single response) and streamGenerateContent (chunked response) APIs by focusing on real-time, bidirectional communication.



## 🔗 Resources

* [Google Cloud Blog Post](https://cloud.google.com/blog/topics/developers-practitioners/how-to-use-gemini-live-api-native-audio-in-vertex-ai)
* [Vertex AI Documentation](https://cloud.google.com/vertex-ai/generative-ai/docs/live-api)
* [Sample Github Demos](https://github.com/GoogleCloudPlatform/generative-ai/tree/main/gemini/multimodal-live-api)