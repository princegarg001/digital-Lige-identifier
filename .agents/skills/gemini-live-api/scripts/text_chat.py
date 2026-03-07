#!/usr/bin/env python3
"""
Gemini Live API - Text Chat

Simple text-based chat using the Live API's bidirectional streaming.
Demonstrates multi-turn conversations without audio.

Requires: pip install google-genai
Environment: GOOGLE_API_KEY must be set
"""

import asyncio
import os
import sys

from google import genai
from google.genai import types

MODEL = "gemini-2.5-flash-preview-native-audio-dialog"


async def text_chat(system_instruction: str = None):
    """
    Run an interactive text chat session using Live API.

    Args:
        system_instruction: Optional system prompt to configure assistant behavior
    """
    client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))

    config = types.LiveConnectConfig(
        response_modalities=["TEXT"],
    )

    if system_instruction:
        config.system_instruction = types.Content(
            parts=[types.Part(text=system_instruction)]
        )

    print("Connecting to Gemini Live API...")

    async with client.aio.live.connect(model=MODEL, config=config) as session:
        print("Connected! Type your messages. Press Ctrl+C to exit.\n")

        while True:
            try:
                user_input = await asyncio.to_thread(input, "You: ")
                if not user_input.strip():
                    continue

                await session.send_client_content(
                    turns=[
                        types.Content(
                            role="user",
                            parts=[types.Part(text=user_input)]
                        )
                    ],
                    turn_complete=True
                )

                print("Assistant: ", end="", flush=True)
                async for response in session.receive():
                    if response.text:
                        print(response.text, end="", flush=True)
                    if response.server_content and response.server_content.turn_complete:
                        print()
                        break

            except KeyboardInterrupt:
                print("\nSession ended.")
                break


async def send_conversation_history(session, history: list[dict]):
    """
    Send prior conversation history to establish context.

    Args:
        session: Active Live API session
        history: List of {"role": "user"|"model", "text": "..."} dicts
    """
    turns = [
        types.Content(
            role=turn["role"],
            parts=[types.Part(text=turn["text"])]
        )
        for turn in history
    ]
    await session.send_client_content(turns=turns, turn_complete=True)


if __name__ == "__main__":
    system_prompt = sys.argv[1] if len(sys.argv) > 1 else None
    asyncio.run(text_chat(system_prompt))
