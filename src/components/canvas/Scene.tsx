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
import { getAvatarUrl } from "@/lib/avatars";
import { useSceneConfig } from "@/hooks/SceneConfigContext";

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
 * Reads all settings from SceneConfigContext for live reactivity.
 */
function SceneInner({
  audioLevelRef,
  currentAnimation,
  skinPreset,
  debug = false,
}: SceneProps) {
  const { config, avatarRegistry } = useSceneConfig();
  const features = config.features;
  const avatarUrl = getAvatarUrl(config.avatar.model, avatarRegistry);

  return (
    <Canvas
      camera={{ position: config.camera.position as [number, number, number], fov: config.camera.fov }}
      shadows
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      {/* ── Base ambient fill ─────────────────────────────── */}
      <ambientLight intensity={0.3} />

      {/* ── Key light ── */}
      <spotLight
        position={config.lighting.keyLight.position as [number, number, number]}
        angle={0.25}
        penumbra={0.8}
        intensity={config.lighting.keyLight.intensity}
        castShadow
        shadow-mapSize={1024}
        color={config.lighting.keyLight.color}
      />

      {/* ── Fill light ── */}
      <spotLight
        position={config.lighting.fillLight.position as [number, number, number]}
        angle={0.35}
        penumbra={1}
        intensity={config.lighting.fillLight.intensity}
        color={config.lighting.fillLight.color}
      />

      {/* ── Rim light ── */}
      <pointLight
        position={config.lighting.rimLight.position as [number, number, number]}
        intensity={config.lighting.rimLight.intensity}
        color={config.lighting.rimLight.color}
      />

      <Suspense fallback={null}>
        <group
          position={config.avatar.position as [number, number, number]}
          rotation={config.avatar.rotation as [number, number, number]}
          scale={config.avatar.scale}
        >
          <Avatar
            audioLevelRef={audioLevelRef}
            avatarUrl={avatarUrl}
            currentAnimation={currentAnimation}
            skinPreset={skinPreset}
            featureToggles={features}
          />
        </group>
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
            target={config.camera.target as [number, number, number]}
          />
          <Suspense fallback={null}>
            <DebugCameraPanel />
          </Suspense>
        </>
      )}
    </Canvas>
  );
}

// Re-export as default — SceneInner already reads from context
export default function Scene(props: SceneProps) {
  return <SceneInner {...props} />;
}
