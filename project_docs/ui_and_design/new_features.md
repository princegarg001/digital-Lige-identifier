# Digital Persona — New Features Roadmap

> Based on Gemini API capabilities audit (March 2026). Prioritized by impact and implementation effort.

---

## 🔴 Critical Fixes (Audit Findings)

### 1. Proper Function Call Dispatch & Structured Tool Results
**Current Problem**: `useGeminiLive.ts` sends a hardcoded `{ result: "ok" }` back for every tool call, regardless of what the tool actually did. The model receives no real information.

**Fix**: Implement a typed function registry that maps tool names to async handler functions. Each handler receives the parsed args and returns a real structured result that is sent back to the model.

```typescript
// Pattern to implement in useGeminiLive.ts
type ToolHandler = (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
const toolRegistry = new Map<string, ToolHandler>();
```

**API Standard**: Per Gemini docs, the model uses function results to generate its final response. Without this, function calling is effectively broken — the model is "calling" functions but learning nothing from them.

---

### 2. Voice Activity Detection (VAD) Configuration
**Current Problem**: Live session connects without explicit VAD configuration, relying on defaults.

**Fix**: Add `realtimeInputConfig` to the Live session config with explicit VAD settings for better interruption handling and turn management.

```typescript
realtimeInputConfig: {
  voiceActivityDetection: {
    disabled: false,
    startOfSpeechSensitivity: 'START_SENSITIVITY_LOW',
    endOfSpeechSensitivity: 'END_SENSITIVITY_LOW',
    prefixPaddingMs: 20,
    silenceDurationMs: 100,
  }
}
```

---

## 🟡 High-Value Features (Nice to Have)

### 3. Extended Function Tool Library
Add more tools to the `GEMINI_TOOLS` declaration to unlock richer persona behaviors:

| Tool Name | Purpose | Args |
|---|---|---|
| `search_web` | Lets persona answer factual questions via search | `query: string` |
| `set_persona_mode` | Switch focus mode (focus, casual, presentation) | `mode: string` |
| `capture_moment` | Save the current webcam frame as a "memory" | `label: string` |
| `get_time_date` | Returns current time/date for grounded responses | none |
| `display_text` | Render rich text/code on screen beside avatar | `content: string, format: string` |

These follow the same `FunctionDeclaration` pattern already established in `constants.ts`.

---

### 4. Non-Live Chat API Integration (Text Fallback Mode)
**Use Case**: When the user doesn't want a live audio session but wants to chat with the persona in text-only mode.

**Implementation**: Add a `useGeminiChat` hook using `ai.chats.create()` from `@google/genai` with full conversation history management.

```typescript
// New hook: src/hooks/useGeminiChat.ts
const chat = ai.chats.create({
  model: 'gemini-3-flash-preview',
  history: [],
  config: { systemInstruction: SYSTEM_PROMPT }
});
const response = await chat.sendMessage({ message: userText });
```

**Benefit**: Works without mic/camera permissions, lower latency for text-only queries, preserves full chat history across turns.

---

### 5. Structured Output for Persona State
**Use Case**: Instead of relying on the model to verbally describe its emotional state (for lip-sync/expression), use structured output to emit a typed emotional metadata object alongside each response.

```typescript
// Structured output schema for persona state
const personaStateSchema = {
  type: Type.OBJECT,
  properties: {
    emotion: { type: Type.STRING, enum: ['neutral', 'happy', 'thinking', 'surprised'] },
    confidence: { type: Type.NUMBER },
    shouldGesture: { type: Type.BOOLEAN }
  }
}
```

This allows the avatar animation system to be driven by model-declared state, not just audio level heuristics.

---

### 6. Ephemeral Tokens for Production Security
**Current Problem**: The API key is exposed client-side via `NEXT_PUBLIC_GEMINI_API_KEY`. This is a security risk in production.

**Fix**: Add a Next.js API route (`/api/eph-token`) that calls the Gemini token service server-side and returns short-lived ephemeral tokens to the browser.

```
Client → POST /api/eph-token → Server (using secret API key) → Gemini Token API → returns token
Client uses token (TTL ~1 min) → connects to Live API
```

**Reference**: [Ephemeral Tokens Guide](https://ai.google.dev/gemini-api/docs/ephemeral-tokens)

---

### 7. Conversation Context Compression / Session Resume
**Use Case**: Long conversations exhaust the model's context window. Add a "compress history" step that summarizes older turns using `generateContent` before re-connecting the Live session.

**Implementation Pattern**:
1. On disconnect, store last N transcript messages to `localStorage`
2. On next connect, inject compressed summary as part of `systemInstruction`
3. Allows "persistent memory" between sessions

---

### 8. Grounding with Google Search
**Use Case**: Enable the persona to answer real-time factual questions (news, events, definitions) without hallucinating.

**Implementation**: Add `googleSearch: {}` to the tools list when using non-Live `generateContent` calls.

```typescript
tools: [{ googleSearch: {} }, ...GEMINI_TOOLS]
```

> Note: Google Search grounding is available in `generateContent` but not in the Live API session tools. Use in the text-fallback chat hook (Feature #4).

---

### 9. Multimodal Document Understanding
**Use Case**: Allow users to share a PDF or image with the persona for review/explanation.

**Implementation**: Add a file upload button to the `ChatInput` component. Use `ai.files.upload()` to upload to the Files API, then send the file URI as a `Part` in the next user turn.

```typescript
const file = await ai.files.upload({ file: userFile });
// Then send as part of message:
{ fileData: { fileUri: file.uri, mimeType: file.mimeType } }
```

---

### 10. Streaming Text Responses for Chat Panel
**Current Problem**: Transcripts arrive as complete text chunks after TTS playback. The chat panel shows complete messages only.

**Fix**: For the text fallback chat (Feature #4), use `chat.sendMessageStream()` to stream token-by-token into the chat panel, creating a more dynamic typing animation effect.

```typescript
const stream = await chat.sendMessageStream({ message });
for await (const chunk of stream) {
  appendToLastMessage(chunk.text);
}
```

---

## 🟢 Experimental / Future

### 11. Code Execution Tool
Let the persona run Python code in Gemini's sandboxed environment to solve math problems, generate charts, etc.

### 12. MCP (Model Context Protocol) Integration
Connect to external MCP servers (calendar, GitHub, file system) so the persona can interact with real services using the native MCP support in `@google/genai`.

### 13. Multi-Modal Function Responses
Return images/audio from function calls (e.g., return a screenshot as the tool result so the model can "see" what it triggered), using the multimodal function response pattern from the Gemini docs.

---

## Implementation Priority

```
Phase 1 (Now):   #1 Fix tool dispatch  →  #2 VAD config
Phase 2 (Soon):  #3 More tools  →  #4 Text chat hook  →  #6 Ephemeral tokens
Phase 3 (Later): #5 Structured output  →  #7 Session resume  →  #9 Doc upload
Phase 4 (R&D):   #8 Grounding  →  #10 Streaming  →  #11-13 Experimental
```
