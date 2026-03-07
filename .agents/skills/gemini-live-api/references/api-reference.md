# Gemini Live API Reference

## Models

| Model | Features | Context |
|-------|----------|---------|
| `gemini-2.5-flash-preview-native-audio-dialog` | Native audio, affective dialog, thinking | 128k tokens |
| `gemini-2.5-flash-exp-native-audio-thinking-dialog` | Native audio with extended thinking | 128k tokens |

## Audio Specifications

| Parameter | Input | Output |
|-----------|-------|--------|
| Format | 16-bit PCM, little-endian | 16-bit PCM |
| Sample Rate | 16kHz (auto-resamples) | 24kHz |
| Channels | Mono | Mono |
| MIME Type | `audio/pcm;rate=16000` | `audio/pcm;rate=24000` |
| Chunk Size | 1024 bytes recommended | - |

## Session Limits

| Type | Duration | Context Window |
|------|----------|----------------|
| Audio-only | 15 minutes | 128k tokens |
| Audio + Video | 2 minutes | 128k tokens |
| Connection | ~10 minutes before reconnect needed | - |

## Configuration Options

```python
config = types.LiveConnectConfig(
    # Response format (choose one)
    response_modalities=["AUDIO"],  # or ["TEXT"]

    # System prompt
    system_instruction=types.Content(
        parts=[types.Part(text="Your instructions")]
    ),

    # Voice settings
    speech_config=types.SpeechConfig(
        voice_config=types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(
                voice_name="Puck"  # Aoede, Charon, Fenrir, Kore, Puck
            )
        )
    ),

    # Transcription
    output_audio_transcription=types.AudioTranscriptionConfig(),
    input_audio_transcription=types.AudioTranscriptionConfig(),

    # Tools (function calling, search)
    tools=[...],

    # VAD settings
    realtime_input_config=types.RealtimeInputConfig(
        automatic_activity_detection=types.AutomaticActivityDetection(
            disabled=False,
            start_of_speech_sensitivity=types.StartSensitivity.LOW,
            end_of_speech_sensitivity=types.EndSensitivity.LOW,
            silence_duration_ms=100
        )
    ),

    # Native audio features
    enable_affective_dialog=True,  # Adapts tone to user
    proactive_audio=True,          # Model decides when to respond

    # Thinking (reasoning)
    thinking_config=types.ThinkingConfig(
        thinking_budget=1024  # tokens for reasoning
    ),

    # Session management
    context_window_compression=types.ContextWindowCompressionConfig(
        trigger_tokens=16000,  # When to compress
        sliding_window_tokens=8000
    ),
    session_resumption=types.SessionResumptionConfig(
        handle="previous_session_handle"  # Resume prior session
    ),
)
```

## Available Voices

- `Aoede` - Warm, conversational
- `Charon` - Deep, authoritative
- `Fenrir` - Energetic, youthful
- `Kore` - Calm, professional
- `Puck` - Friendly, expressive (default)

## Input Methods

### send_realtime_input() - Low latency, optimized for streaming
```python
await session.send_realtime_input(
    audio=types.Blob(data=audio_bytes, mime_type="audio/pcm;rate=16000")
)
```

### send_client_content() - Deterministic ordering, multi-turn
```python
await session.send_client_content(
    turns=[types.Content(role="user", parts=[types.Part(text="Hello")])],
    turn_complete=True
)
```

## Response Handling

```python
async for response in session.receive():
    # Text content
    if response.text:
        print(response.text)

    # Audio data
    if response.data:
        play_audio(response.data)

    # Function calls
    if response.tool_call:
        for fc in response.tool_call.function_calls:
            result = execute(fc.name, fc.args)
            await session.send_tool_response(
                function_responses=[
                    types.FunctionResponse(name=fc.name, response={"result": result})
                ]
            )

    # Turn completion
    if response.server_content and response.server_content.turn_complete:
        break

    # Interruption detected
    if response.server_content and response.server_content.interrupted:
        print("User interrupted")

    # Token usage
    if response.usage_metadata:
        print(f"Tokens: {response.usage_metadata.total_token_count}")
```

## Tool Definitions

### Basic function
```python
tools = [{
    "function_declarations": [{
        "name": "get_weather",
        "description": "Get weather for a location",
        "parameters": {
            "type": "object",
            "properties": {
                "location": {"type": "string"}
            },
            "required": ["location"]
        }
    }]
}]
```

### Async/non-blocking function
```python
{
    "name": "long_task",
    "behavior": "NON_BLOCKING",
    "scheduling": "WHEN_IDLE",  # or INTERRUPT, SILENT
    ...
}
```

### Google Search grounding
```python
tools = [{"google_search": {}}]
```

## Session Resumption

```python
# Store handle from session updates
async for response in session.receive():
    if response.session_resumption_update:
        save_handle(response.session_resumption_update.handle)

# Resume later (within 2 hours)
config = types.LiveConnectConfig(
    session_resumption=types.SessionResumptionConfig(handle=saved_handle)
)
```

## Ephemeral Tokens

```python
token = client.auth_tokens.create(config={
    "uses": 1,
    "expire_time": now + timedelta(minutes=30),
    "new_session_expire_time": now + timedelta(minutes=1),
    # Optional: lock configuration
    "locked_config": {
        "model": "gemini-2.5-flash-preview-native-audio-dialog",
        "system_instruction": "You are a helpful assistant."
    }
})
# Client uses token.name as API key
```

## Supported Languages

BCP-47 codes: `en-US`, `en-GB`, `es-ES`, `es-MX`, `fr-FR`, `de-DE`, `it-IT`, `pt-BR`, `ja-JP`, `ko-KR`, `zh-CN`, `zh-TW`, `hi-IN`, `ar-XA`, `nl-NL`, `pl-PL`, `ru-RU`, `sv-SE`, `tr-TR`, `vi-VN`, `th-TH`, `id-ID`, `ms-MY`, `fil-PH`, `uk-UA`, `cs-CZ`, `el-GR`, `ro-RO`

Native audio models auto-detect language.
