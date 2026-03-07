#!/usr/bin/env python3
"""
Gemini Live API - Audio Chat with Microphone and Speaker

Real-time voice conversation with Gemini using microphone input and speaker output.
Requires: pip install google-genai pyaudio

Environment: GOOGLE_API_KEY must be set
"""

import asyncio
import os
import sys

from google import genai
from google.genai import types

# Audio configuration
FORMAT = "int16"
SEND_SAMPLE_RATE = 16000
RECEIVE_SAMPLE_RATE = 24000
CHUNK_SIZE = 1024

MODEL = "gemini-2.5-flash-preview-native-audio-dialog"


def get_audio_io():
    """Initialize PyAudio input/output streams."""
    try:
        import pyaudio
    except ImportError:
        print("PyAudio not installed. Run: pip install pyaudio")
        sys.exit(1)

    pya = pyaudio.PyAudio()

    mic_stream = pya.open(
        format=pyaudio.paInt16,
        channels=1,
        rate=SEND_SAMPLE_RATE,
        input=True,
        frames_per_buffer=CHUNK_SIZE,
    )

    speaker_stream = pya.open(
        format=pyaudio.paInt16,
        channels=1,
        rate=RECEIVE_SAMPLE_RATE,
        output=True,
        frames_per_buffer=CHUNK_SIZE,
    )

    return pya, mic_stream, speaker_stream


async def audio_chat(system_instruction: str = None):
    """
    Run an interactive audio chat session.

    Args:
        system_instruction: Optional system prompt to configure assistant behavior
    """
    client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))

    config = types.LiveConnectConfig(
        response_modalities=["AUDIO"],
    )

    if system_instruction:
        config.system_instruction = types.Content(
            parts=[types.Part(text=system_instruction)]
        )

    pya, mic_stream, speaker_stream = get_audio_io()
    audio_queue = asyncio.Queue()

    async def send_audio(session):
        """Continuously send microphone audio to the session."""
        while True:
            try:
                data = await asyncio.to_thread(mic_stream.read, CHUNK_SIZE, exception_on_overflow=False)
                await session.send_realtime_input(
                    audio=types.Blob(data=data, mime_type=f"audio/pcm;rate={SEND_SAMPLE_RATE}")
                )
            except Exception as e:
                print(f"Send error: {e}")
                break

    async def receive_audio(session):
        """Receive and queue audio from the session."""
        async for response in session.receive():
            if response.data:
                await audio_queue.put(response.data)
            if response.server_content and response.server_content.turn_complete:
                print("\n[Turn complete]")

    async def play_audio():
        """Play queued audio through speakers."""
        while True:
            data = await audio_queue.get()
            await asyncio.to_thread(speaker_stream.write, data)

    print("Connecting to Gemini Live API...")
    print("Speak into your microphone. Press Ctrl+C to exit.\n")

    try:
        async with client.aio.live.connect(model=MODEL, config=config) as session:
            print("Connected! Start speaking...\n")

            await asyncio.gather(
                send_audio(session),
                receive_audio(session),
                play_audio(),
            )
    except KeyboardInterrupt:
        print("\nSession ended.")
    finally:
        mic_stream.stop_stream()
        mic_stream.close()
        speaker_stream.stop_stream()
        speaker_stream.close()
        pya.terminate()


if __name__ == "__main__":
    system_prompt = sys.argv[1] if len(sys.argv) > 1 else "You are a helpful assistant."
    asyncio.run(audio_chat(system_prompt))
