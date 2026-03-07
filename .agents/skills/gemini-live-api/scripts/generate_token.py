#!/usr/bin/env python3
"""
Gemini Live API - Ephemeral Token Generation

Generate short-lived tokens for secure client-side WebSocket connections.
Use these instead of exposing API keys in client applications.

Requires: pip install google-genai
Environment: GOOGLE_API_KEY must be set (server-side only)
"""

import datetime
import json
import os

from google import genai
from google.genai import types


def generate_ephemeral_token(
    uses: int = 1,
    expire_minutes: int = 30,
    session_start_minutes: int = 1,
    locked_config: dict = None
) -> dict:
    """
    Generate an ephemeral token for client-side Live API access.

    Args:
        uses: Number of times token can be used (default: 1)
        expire_minutes: Token validity duration in minutes (default: 30)
        session_start_minutes: Window to start session in minutes (default: 1)
        locked_config: Optional config constraints to lock (model, temperature, etc.)

    Returns:
        dict with 'token' and 'expires_at' fields
    """
    client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))

    now = datetime.datetime.now(datetime.timezone.utc)

    config = {
        "uses": uses,
        "expire_time": now + datetime.timedelta(minutes=expire_minutes),
        "new_session_expire_time": now + datetime.timedelta(minutes=session_start_minutes),
    }

    # Lock configuration if specified (keeps system instructions server-side)
    if locked_config:
        config["locked_config"] = locked_config

    token = client.auth_tokens.create(config=config)

    return {
        "token": token.name,
        "expires_at": config["expire_time"].isoformat(),
        "session_start_expires_at": config["new_session_expire_time"].isoformat(),
        "uses": uses
    }


def generate_locked_token(
    model: str,
    system_instruction: str = None,
    response_modalities: list = None,
) -> dict:
    """
    Generate a token with locked configuration.

    This keeps sensitive settings (like system instructions) server-side
    while allowing client-side WebSocket connections.

    Args:
        model: Model ID to lock
        system_instruction: System prompt to lock
        response_modalities: Allowed modalities (TEXT, AUDIO)

    Returns:
        dict with token details
    """
    locked_config = {
        "model": model,
    }

    if system_instruction:
        locked_config["system_instruction"] = system_instruction

    if response_modalities:
        locked_config["response_modalities"] = response_modalities

    return generate_ephemeral_token(locked_config=locked_config)


# Example: Flask/FastAPI endpoint for token generation
"""
from flask import Flask, jsonify
app = Flask(__name__)

@app.route('/api/gemini-token', methods=['POST'])
def get_token():
    # Authenticate your user first!
    token_data = generate_ephemeral_token(
        uses=1,
        expire_minutes=30
    )
    return jsonify(token_data)
"""


if __name__ == "__main__":
    # Example usage
    token_data = generate_ephemeral_token()
    print("Generated ephemeral token:")
    print(json.dumps(token_data, indent=2))
    print("\nUse this token as your API key for client-side WebSocket connections.")
    print("The token will expire in 30 minutes and can only be used once.")
