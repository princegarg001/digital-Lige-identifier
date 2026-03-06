# Google Live API (Gemini Multimodal Live) Setup Guide

This guide explains how to obtain the necessary environment variables to power your Digital Persona.

## 1. Getting your Gemini API Key
To connect to the Gemini Multimodal Live API, you need a Google AI Studio API key.

1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Review and accept the Terms of Service if prompted.
4. On the left navigation bar, click on **"Get API key"**.
5. Click the **"Create API key"** button. You can choose to link it to an existing Google Cloud Project or create a new one.
6. Copy the generated API string safely.

## 2. Environment Configuration
Create a `.env.local` file in the root of your Next.js project. Add the following variables:

```env
# Required: Your Gemini API Key from Google AI Studio
NEXT_PUBLIC_GEMINI_API_KEY=your_copied_api_key_here

# Required: The path to your compressed GLB model
NEXT_PUBLIC_MODEL_URL=/models/avatar-draco.glb
```

## 3. Important Notes on Live API
- The Live API operates entirely over WebSockets (`wss://`).
- The endpoint is: `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidirectionalGenerateContent?key=YOUR_API_KEY`.
- **Latency & Streaming**: To maintain low latency, video should ideally be streamed at 1 frame per second (as base64 JPEG chunks).
- **Audio Constraints**: The API expects 16-bit PCM (16kHz) audio chunks for Voice Input. Providing audio in this format prevents stuttering and latency.
