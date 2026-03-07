"use client";

import { Canvas } from "@react-three/fiber";
import {
  Environment,
  ContactShadows,
  OrbitControls,
} from "@react-three/drei";
import React, { Suspense, lazy } from "react";
import { Avatar } from "./Avatar";
import { SkinPreset } from "@/lib/skinConfig";
import cameraConfig from "@/config/camera.json";

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
      camera={{ position: cameraConfig.camera.position as [number, number, number], fov: cameraConfig.camera.fov }}
      shadows
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      {/* ── Base ambient fill ─────────────────────────────── */}
      <ambientLight intensity={0.3} />

      {/* ── Key light: main face illumination (warm white) ── */}
      <spotLight
        position={cameraConfig.lighting.keyLight.position as [number, number, number]}
        angle={0.25}
        penumbra={0.8}
        intensity={cameraConfig.lighting.keyLight.intensity}
        castShadow
        shadow-mapSize={1024}
        color={cameraConfig.lighting.keyLight.color}
      />

      {/* ── Fill light: soft left bounce (cool white) ──────── */}
      <spotLight
        position={cameraConfig.lighting.fillLight.position as [number, number, number]}
        angle={0.35}
        penumbra={1}
        intensity={cameraConfig.lighting.fillLight.intensity}
        color={cameraConfig.lighting.fillLight.color}
      />

      {/* ── Rim light: hair/edge separation (neutral white) ── */}
      <pointLight
        position={cameraConfig.lighting.rimLight.position as [number, number, number]}
        intensity={cameraConfig.lighting.rimLight.intensity}
        color={cameraConfig.lighting.rimLight.color}
      />

      <Suspense fallback={null}>
        <group
          position={cameraConfig.avatar.position as [number, number, number]}
          rotation={cameraConfig.avatar.rotation as [number, number, number]}
          scale={cameraConfig.avatar.scale}
        >
          <Avatar
            audioLevelRef={audioLevelRef}
            currentAnimation={currentAnimation}
            skinPreset={skinPreset}
          />
        </group>
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
            target={cameraConfig.camera.target as [number, number, number]}
          />
          <Suspense fallback={null}>
            <DebugCameraPanel />
          </Suspense>
        </>
      )}
    </Canvas>
  );
}
