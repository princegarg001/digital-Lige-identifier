# Public Assets (`/public`)

This directory houses the statically served files critical to the Digital Persona runtime. Since Next.js serves files from this directory implicitly at the root path (`/`), all Three.js `<GLTFLoader>` components fetch their physical assets from here.

## 🗃 Contents

### 1. The Substrate 
- **`avatar.glb` / `.gltf`:** The Ready Player Me (RPM) 3D model. 
  - *Must* contain `MorphTargets=ARKit` (52 blendshapes) and `Oculus Visemes` (15 mouth shapes) built-in, or lip-syncing and emotional generation will crash.

### 2. Animations
- **`/animations/` (or related `.glb` motion files)**
  - Skeletal hierarchies extracted from Mixamo. These encompass `idle`, `talking`, `wave`, `agree`, etc.
  - The application dynamically matches strings outputted by the Gemini API tool calls to the file names located here. 

### 3. Maps & Data
- **`index.json` / `emotion_map_full.json`** 
  - Registries mapping API text labels to specific arrays of blendshapes or files. They allow the engine to know *which* animations exist without scanning the filesystem dynamically.

> [!WARNING]
> Do not serve compressed video files or overly heavy textures in this directory, as it will degrade the initial time-to-interactivity payload. Keep textures optimized (e.g., KTX2 / Meshopt if implemented).
