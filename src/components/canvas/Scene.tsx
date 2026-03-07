"use client";

import { Canvas } from "@react-three/fiber";
import {
  Environment,
  ContactShadows,
  OrbitControls,
  Center,
} from "@react-three/drei";
import React, { Suspense, lazy } from "react";
import { Avatar } from "./Avatar";
import { SkinPreset } from "@/lib/skinConfig";

const DebugCameraPanel = lazy(() => import("./DebugCameraPanel"));

interface SceneProps {
  audioLevelRef: React.RefObject<number>;
  currentAnimation?: string;
  skinPreset?: SkinPreset | null;
  /** When true, enables OrbitControls + live debug panel. Default: false */
  debug?: boolean;
}

/**
 * 3D canvas — video-call style 3-point lighting rig.
 * Cinematic but real-time fast; no orbit/float for video-call realism.
 *
 * Pass `debug={true}` to enable OrbitControls and the live camera debug panel.
 * Run `localStorage.getItem('scene_camera_debug')` to see persisted position.
 */
export default function Scene({
  audioLevelRef,
  currentAnimation,
  skinPreset,
  debug = false,
}: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, -0.4, 0.8], fov: 38 }}
      shadows
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      {/* ── Base ambient fill ─────────────────────────────── */}
      <ambientLight intensity={0.3} />

      {/* ── Key light: main face illumination (warm white) ── */}
      <spotLight
        position={[1, 1.2, 1]}
        angle={0.25}
        penumbra={0.8}
        intensity={1.8}
        castShadow
        shadow-mapSize={1024}
        color="#fff5e0"
      />

      {/* ── Fill light: soft left bounce (cool white) ──────── */}
      <spotLight
        position={[-1, 0.5, 1]}
        angle={0.35}
        penumbra={1}
        intensity={0.7}
        color="#d0e8ff"
      />

      {/* ── Rim light: hair/edge separation (neutral white) ── */}
      <pointLight
        position={[0, 1.2, -1]}
        intensity={0.9}
        color="#ffffff"
      />

      <Suspense fallback={null}>
        <Center top>
          <Avatar
            audioLevelRef={audioLevelRef}
            currentAnimation={currentAnimation}
            skinPreset={skinPreset}
          />
        </Center>
        {/* Studio preset: neutral grey background IBL — best for skin tones */}
        <Environment preset="studio" />
      </Suspense>

      <ContactShadows
        opacity={0.35}
        scale={10}
        blur={2.4}
        far={0.8}
        position={[0, -1.8, 0]}
        color="#22d3ee"
      />

      {/* ── Debug mode: OrbitControls + live camera panel ── */}
      {debug && (
        <>
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.05}
            enableZoom={true}
            enablePan={true}
            target={[0, -0.4, 0]}
          />
          <Suspense fallback={null}>
            <DebugCameraPanel />
          </Suspense>
        </>
      )}
    </Canvas>
  );
}
