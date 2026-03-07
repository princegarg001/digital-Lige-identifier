"use client";

import { Canvas } from "@react-three/fiber";
import {
  Environment,
  ContactShadows,
  OrbitControls,
  Float,
  Center,
} from "@react-three/drei";
import React, { Suspense } from "react";
import { Avatar } from "./Avatar";

interface SceneProps {
  audioLevelRef: React.RefObject<number>;
  currentAnimation?: string;
}

/**
 * 3D canvas scene with dual-colored lighting, environment, and the Avatar.
 * Receives `audioLevelRef` (not state) to avoid re-renders on every audio frame.
 */
export default function Scene({
  audioLevelRef,
  currentAnimation,
}: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, -0.4, 0.8], fov: 38 }}
      shadows
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.5} />
      <spotLight
        position={[5, 10, 5]}
        angle={0.15}
        penumbra={1}
        intensity={1.5}
        castShadow
        shadow-mapSize={1024}
        color="#22d3ee"
      />
      <spotLight
        position={[-5, 8, -5]}
        angle={0.2}
        penumbra={1}
        intensity={0.8}
        color="#34d399"
      />
      <pointLight position={[0, 2, 4]} intensity={0.5} color="#ffffff" />

      <Suspense fallback={null}>
        <Float
          speed={1}
          rotationIntensity={0.1}
          floatIntensity={0.2}
          floatingRange={[-0.012, 0.012]}
        >
          <Center top>
            <Avatar audioLevelRef={audioLevelRef} currentAnimation={currentAnimation} />
          </Center>
        </Float>
        <Environment preset="city" />
      </Suspense>

      <ContactShadows
        opacity={0.3}
        scale={10}
        blur={2.4}
        far={0.8}
        position={[0, -1.8, 0]}
        color="#22d3ee"
      />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        enableZoom={true}
        enablePan={true}
        target={[0, -0.4, 0]}
      />
    </Canvas>
  );
}
