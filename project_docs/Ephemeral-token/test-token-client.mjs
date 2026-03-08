/**
 * Ephemeral Token Verification Script (Gold Standard)
 * 
 * WHAT THIS DOES:
 * 1. Simulates a backend server by using your master GEMINI_API_KEY from .env.local
 *    to request a short-lived "Ephemeral Token" (auth_tokens/...) via v1alpha.
 * 2. Simulates a client (browser) by initializing a new SDK client using that 
 *    ephemeral token and attempting to open a direct WebSocket to the Live API.
 * 3. Verifies that the the "BidiGenerateContentConstrained" handshake completes.
 * 
 * HOW TO USE:
 * 1. Ensure you have GEMINI_API_KEY in g:\MyProject\digital-persona\.env.local
 * 2. Run the script from the project root:
 *    node project_docs/empheral-token/test-token-client.mjs
 * 
 * EXPECTED SUCCESS OUTPUT:
 * - Token generated: auth_tokens/xxxx...
 * - Client created with ephemeral token. Connecting to live...
 * - WS opened
 * - Connected successfully!
 * - WS message: LiveServerMessage { setupComplete: {} }
 */

import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve .env.local path relative to project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ ERROR: No GEMINI_API_KEY found in .env.local");
  console.log("Usage: Ensure GEMINI_API_KEY=your_key is in .env.local at the project root.");
  process.exit(1);
}

// 1. Initialize the provisioner client (Server-side simulation)
// Note: apiVersion: "v1alpha" is critical for authTokens support
const ai = new GoogleGenAI({ 
    apiKey,
    httpOptions: { apiVersion: "v1alpha" } 
});

async function run() {
  console.log("🚀 Starting Ephemeral Token Verification...");
  
  try {
    // 2. Generate the token (Backend Handshake)
    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const response = await ai.authTokens.create({
      config: { 
        expireTime,
        uses: 1, // Robustness test: only allow 1 use
        newSessionExpireTime: new Date(Date.now() + 60 * 1000).toISOString()
      }
    });
    console.log("✅ Token generated:", response.name);

    // 3. Initialize the consumer client (Client-side simulation)
    // Note: apiVersion: "v1alpha" is MANDATORY when using auth_tokens/ prefix
    const client = new GoogleGenAI({ 
      apiKey: response.name, 
      httpOptions: { apiVersion: "v1alpha"} 
    });
    console.log("🔗 Client created with ephemeral token. Connecting to live...");

    await client.live.connect({
      model: "gemini-2.5-flash-native-audio-preview-12-2025", // Gold standard model
      config: { responseModalities: ["AUDIO"] },
      callbacks: {
        onopen: () => console.log("🟢 WS opened"),
        onmessage: (e) => {
          console.log("📨 WS message received:", JSON.stringify(e));
          if (e.setupComplete) {
            console.log("🎉 SUCCESS: Connection established and authenticated!");
            process.exit(0);
          }
        },
        onerror: (e) => {
          console.error("🔴 WS error details:", { message: e.message, type: e.type, error: e.error });
          process.exit(1);
        },
        onclose: (e) => {
          console.log("⚪ WS closed", e.code, e.reason);
        }
      }
    });

  } catch (err) {
    console.error("❌ Error occurred during verification:", err.message);
    if (err.response) {
       console.error("Response Details:", JSON.stringify(err.response, null, 2));
    }
    process.exit(1);
  }
}

run();
