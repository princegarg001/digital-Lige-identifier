#!/usr/bin/env python3
"""
Gemini Live API - Function Calling

Demonstrates tool/function calling with the Live API.
The model can call defined functions and you provide results back.

Requires: pip install google-genai
Environment: GOOGLE_API_KEY must be set
"""

import asyncio
import json
import os

from google import genai
from google.genai import types

MODEL = "gemini-2.5-flash-preview-native-audio-dialog"


# Define your functions/tools
TOOLS = [
    {
        "function_declarations": [
            {
                "name": "get_weather",
                "description": "Get current weather for a location",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {
                            "type": "string",
                            "description": "City name, e.g. 'San Francisco'"
                        }
                    },
                    "required": ["location"]
                }
            },
            {
                "name": "control_lights",
                "description": "Turn lights on or off",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "action": {
                            "type": "string",
                            "enum": ["on", "off"],
                            "description": "Whether to turn lights on or off"
                        },
                        "room": {
                            "type": "string",
                            "description": "Room name, e.g. 'living room'"
                        }
                    },
                    "required": ["action"]
                }
            }
        ]
    }
]


def execute_function(name: str, args: dict) -> str:
    """
    Execute a function and return the result.
    Replace with your actual implementations.
    """
    if name == "get_weather":
        # Mock implementation
        location = args.get("location", "unknown")
        return json.dumps({
            "location": location,
            "temperature": 72,
            "conditions": "sunny",
            "humidity": 45
        })

    elif name == "control_lights":
        action = args.get("action", "off")
        room = args.get("room", "all rooms")
        return json.dumps({
            "success": True,
            "message": f"Lights turned {action} in {room}"
        })

    return json.dumps({"error": f"Unknown function: {name}"})


async def function_calling_chat():
    """Run a chat session with function calling enabled."""
    client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))

    config = types.LiveConnectConfig(
        response_modalities=["TEXT"],
        tools=TOOLS,
    )

    print("Connecting to Gemini Live API with function calling...")

    async with client.aio.live.connect(model=MODEL, config=config) as session:
        print("Connected! Try asking about weather or controlling lights.\n")

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
                    # Handle text responses
                    if response.text:
                        print(response.text, end="", flush=True)

                    # Handle function calls
                    if response.tool_call:
                        for fc in response.tool_call.function_calls:
                            print(f"\n[Calling {fc.name}({fc.args})]")

                            result = execute_function(fc.name, fc.args)

                            await session.send_tool_response(
                                function_responses=[
                                    types.FunctionResponse(
                                        name=fc.name,
                                        response={"result": result}
                                    )
                                ]
                            )

                    if response.server_content and response.server_content.turn_complete:
                        print()
                        break

            except KeyboardInterrupt:
                print("\nSession ended.")
                break


# For async/non-blocking function calls, add behavior parameter:
ASYNC_TOOLS = [
    {
        "function_declarations": [
            {
                "name": "long_running_task",
                "description": "A task that takes time to complete",
                "behavior": "NON_BLOCKING",  # Don't wait for result
                "parameters": {
                    "type": "object",
                    "properties": {
                        "task_id": {"type": "string"}
                    }
                }
            }
        ]
    }
]

# Scheduling options for async functions:
# - INTERRUPT: Respond immediately when function completes
# - WHEN_IDLE: Wait until current processing finishes
# - SILENT: Use result later without interrupting


if __name__ == "__main__":
    asyncio.run(function_calling_chat())
