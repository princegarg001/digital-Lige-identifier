# Ready Player Me Avatar Integration Guidelines

## Overview
This project uses **Ready Player Me (RPM)** avatars rendered via `@react-three/fiber` and `@react-three/drei`. RPM avatars provide a fantastic baseline for characters but require specific steps to unlock advanced features like facial expressions (ARKit) and skeletal animations.

## Core Principles

1. **Separation of Avatar and Animations**
   RPM avatars (`.glb` files) downloaded from the user dashboard **do not contain skeletal animations**. Instead of merging animations into the avatar file using Blender, we download standalone animation files from the official RPM Animation Library and apply them dynamically at runtime in React Three Fiber.
   - **Why?** It keeps file sizes small, allows us to swap avatars instantly without re-processing them in external tools, and scales gracefully.

2. **ARKit Blendshapes for Expressions**
   By default, RPM avatars only come with basic lip-sync blendshapes. To get full facial expressions (smiling, frowning, eye movement), the avatar **must** be downloaded with the ARKit payload.

## Setup Pipeline

### 1. Downloading the Avatar
When downloading an avatar from the Ready Player Me hub, you must append `?morphTargets=ARKit` to the `.glb` URL.
Example: `https://models.readyplayer.me/69aaa1126e4b038c0e57c67a.glb?morphTargets=ARKit`

Save this file into the `public/` directory (e.g., `public/69aaa1126e4b038c0e57c67a.glb`).

### 2. Environment Configuration
Update your `.env.local` to point the system to your new avatar file:
```env
NEXT_PUBLIC_AVATAR_GLB=69aaa1126e4b038c0e57c67a.glb
```

### 3. Validation
We enforce ARKit compliance programmatically. Run the following command to verify your newly downloaded avatar is ready for use:
```bash
npm run validate-avatar
```
*If this fails, re-download the avatar ensuring the `?morphTargets=ARKit` query parameter is attached.*

### 4. Animations
Animations are stored in `public/animations/`. The provided scripts automatically download the official "Idle" and "Wave" animations. You can trigger this via:
```bash
npm run setup-avatar
```

## How it works in Code (`Avatar.tsx`)

The `Avatar.tsx` component is the orchestrator:
1. It uses `useGLTF` to load the main avatar mesh defined by `NEXT_PUBLIC_AVATAR_GLB`.
2. It uses another `useGLTF` to load the animations (`/animations/idle.glb` and `/animations/wave.glb`).
3. It extracts the `actions` using Drei's `useAnimations` and binds them to the main avatar's `groupRef`.
4. It reads the microphone `audioLevelRef` and directly manipulates the ARKit blendshapes (`jawOpen`, `mouthClose`, `mouthSmileLeft`) inside `useFrame` for 60FPS lip-syncing and expression reactions.
