---
name: gemini-live-api
description: Build real-time voice and video applications with Google's Gemini Live API. Use when implementing bidirectional audio/video streaming, voice assistants, conversational AI with interruption handling, or any application requiring low-latency multimodal interaction with Gemini models. Covers WebSocket streaming, voice activity detection (VAD), function calling during conversations, session management/resumption, and ephemeral tokens for secure client-side connections.
---

# Gemini Live API

Real-time bidirectional streaming API for voice/video conversations with Gemini.

## Quick Start

```python
from google import genai
from google.genai import types

client = genai.Client(api_key="YOUR_API_KEY")
config = types.LiveConnectConfig(response_modalities=["AUDIO"])

async with client.aio.live.connect(
    model="gemini-2.5-flash-preview-native-audio-dialog",
    config=config
) as session:
    # Send audio
    await session.send_realtime_input(
        audio=types.Blob(data=audio_bytes, mime_type="audio/pcm;rate=16000")
    )
    # Receive responses
    async for response in session.receive():
        if response.data:
            play_audio(response.data)
```

## Core Patterns

### Audio Chat (Mic + Speaker)
Use `scripts/audio_chat.py` for complete microphone-to-speaker implementation with PyAudio.

### Text Chat via Live API
Use `scripts/text_chat.py` for text-based streaming conversations.

### Function Calling
Use `scripts/function_calling.py` for tool integration:
```python
config = types.LiveConnectConfig(
    response_modalities=["TEXT"],
    tools=[{
        "function_declarations": [{
            "name": "get_weather",
            "description": "Get weather for location",
            "parameters": {"type": "object", "properties": {"location": {"type": "string"}}}
        }]
    }]
)
# Handle tool_call in response, send result via session.send_tool_response()
```

### Ephemeral Tokens (Client-Side Auth)
Use `scripts/generate_token.py` for secure browser/mobile connections:
```python
token = client.auth_tokens.create(config={
    "uses": 1,
    "expire_time": now + timedelta(minutes=30),
    "new_session_expire_time": now + timedelta(minutes=1)
})
# Client uses token.name as API key
```

## Key Configuration

| Setting | Options |
|---------|---------|
| `response_modalities` | `["AUDIO"]` or `["TEXT"]` (not both) |
| Audio input | 16-bit PCM, 16kHz, mono |
| Audio output | 24kHz |
| Session limit | 15 min audio-only, 2 min with video |

### Voice Selection
```python
speech_config=types.SpeechConfig(
    voice_config=types.VoiceConfig(
        prebuilt_voice_config=types.PrebuiltVoiceConfig(
            voice_name="Puck"  # Aoede, Charon, Fenrir, Kore, Puck
        )
    )
)
```

### Interruption Handling (VAD)
Automatic by default. Check `response.server_content.interrupted` for interruptions.

### Session Resumption
Save `response.session_resumption_update.handle`, pass to new session within 2 hours.

## Resources

- **`scripts/audio_chat.py`** - Full mic/speaker streaming example
- **`scripts/text_chat.py`** - Text-based Live API chat
- **`scripts/function_calling.py`** - Tool/function calling pattern
- **`scripts/generate_token.py`** - Ephemeral token generation
- **`references/api-reference.md`** - Complete configuration options, models, audio specs
