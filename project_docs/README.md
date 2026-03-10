# Project Documentation (`/project_docs`)

This directory serves as the technical single source of truth for the **Digital Persona** application's architectural planning, principles, and guidelines.

If you are expanding the project, please consult these documents to understand the stringent constraints and design decisions made to achieve the "Gold Standard" of Emotive Realism.

## 📚 Master Guide Architecture

To improve navigability, the documentation has been split into five core domains. Please explore the respective READMEs in their directories for specific technical details:

### 1. [Architecture (`/architecture`)](./architecture/README.md)
Governs the high-level system design, orchestration, mental models, and deployment planning of the Digital Persona.

### 2. [Gemini API (`/gemini_api`)](./gemini_api/README.md)
Everything concerning the **Google Gemini Multimodal Live API**. Includes guides on Client-to-Server Ephemeral Tokens, function calling mechanisms, avoiding proxy latency, and context window compression.

### 3. [Avatar & Animation (`/avatar_and_animation`)](./avatar_and_animation/README.md)
The holy grail logic for the **Emotive Realism**. Contains formulas for procedural life (breathing, blinking, saccades), ARKit Blendshapes mixing, and PCM-Audio driven lip-syncing (Viseme co-articulation).

### 4. [UI & Design (`/ui_and_design`)](./ui_and_design/README.md)
Next.js frontend documentation on styling. Overviews our Glassmorphism aesthetic layer, liquid button implementations, and Radix UI extensions.

### 5. [Assets (`/assets`)](./assets/README.md)
Locally stored diagrams and reference images utilized by the overarching `.md` files.

---

> [!IMPORTANT]
> If creating new features, always adhere to the principles outlined in these subdirectories. The project prioritizes **realism and response speed** over everything else. Do not introduce proxy servers that add latency to the audio stream.
