/*
  Avatar Component — loads the Ready Player Me GLB model
  and drives lip-sync via morph targets based on audio level.
  Auto-generated mesh structure from gltfjsx, enhanced with:
  - MeshPhysicalMaterial + subsurface scattering for photorealistic skin
  - SkinPreset system for hot-swappable skin tones
  - Gaze drift (realistic look-around when listening)
*/

import * as THREE from "three";
import React, { useRef, useEffect, useState } from "react";
import { useGraph, useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { GLTF, SkeletonUtils } from "three-stdlib";
import {
  LIP_SYNC_SMOOTHING,
  LIP_SYNC_JAW_MULTIPLIER,
  LIP_SYNC_MOUTH_MULTIPLIER,
  BREATHING_SPEED,
  BREATHING_AMPLITUDE,
} from "@/lib/constants";
import { SkinPreset } from "@/lib/skinConfig";
import { useSkinTexture } from "@/hooks/useSkinTexture";
import { type FeatureToggles } from "@/hooks/SceneConfigContext";

type GLTFResult = GLTF & {
  nodes: {
    Wolf3D_Hair: THREE.SkinnedMesh;
    Wolf3D_Glasses: THREE.SkinnedMesh;
    Wolf3D_Outfit_Top: THREE.SkinnedMesh;
    Wolf3D_Outfit_Bottom: THREE.SkinnedMesh;
    Wolf3D_Outfit_Footwear: THREE.SkinnedMesh;
    Wolf3D_Body: THREE.SkinnedMesh;
    EyeLeft: THREE.SkinnedMesh;
    EyeRight: THREE.SkinnedMesh;
    Wolf3D_Head: THREE.SkinnedMesh;
    Wolf3D_Teeth: THREE.SkinnedMesh;
    Hips: THREE.Bone;
    Head?: THREE.Bone;
  };
  materials: {
    Wolf3D_Hair: THREE.MeshStandardMaterial;
    Wolf3D_Glasses: THREE.MeshStandardMaterial;
    Wolf3D_Outfit_Top: THREE.MeshStandardMaterial;
    Wolf3D_Outfit_Bottom: THREE.MeshStandardMaterial;
    Wolf3D_Outfit_Footwear: THREE.MeshStandardMaterial;
    Wolf3D_Body: THREE.MeshStandardMaterial;
    Wolf3D_Eye: THREE.MeshStandardMaterial;
    Wolf3D_Skin: THREE.MeshStandardMaterial;
    Wolf3D_Teeth: THREE.MeshStandardMaterial;
  };
};

interface AvatarProps {
  audioLevelRef: React.RefObject<number>;
  avatarUrl: string;
  currentAnimation?: string;
  skinPreset?: SkinPreset | null;
  featureToggles?: FeatureToggles;
}

const DEFAULT_FEATURES: FeatureToggles = {
  lipSync: true,
  breathing: true,
  gazeDrift: true,
  blinking: true,
  hoverEffect: true,
};

/**
 * Wolf3D avatar with real-time lip-sync, idle breathing,
 * MeshPhysicalMaterial skin with SSS, and gaze drift.
 */
export function Avatar({ audioLevelRef, avatarUrl, currentAnimation, skinPreset = null, featureToggles = DEFAULT_FEATURES }: AvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const { scene, animations: avatarAnimations } = useGLTF(avatarUrl);

  // Load official animations
  const { animations: idleAnimation } = useGLTF("/animations/idle.glb");
  const { animations: waveAnimation } = useGLTF("/animations/wave.glb");

  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as unknown as GLTFResult;

  // Get the PBR skin material with SSS
  const skinMaterial = useSkinTexture(skinPreset);

  // Combine animations and bind them to the groupRef
  const allAnimations = [
    ...(avatarAnimations || []),
    ...(idleAnimation || []).map(a => Object.assign(a, { name: 'idle' })),
    ...(waveAnimation || []).map(a => Object.assign(a, { name: 'wave' }))
  ];

  const { actions } = useAnimations(allAnimations, groupRef);

  useEffect(() => {
    const actionName = currentAnimation && actions[currentAnimation]
      ? currentAnimation
      : (actions["idle"] ? "idle" : undefined);

    if (!actionName || !actions[actionName]) return;

    actions[actionName].reset().fadeIn(0.5).play();

    return () => {
      actions[actionName]?.fadeOut(0.5);
    };
  }, [currentAnimation, actions]);

  // Smoothed value for lip-sync
  const smoothedLevel = useRef(0);
  // Gaze drift accumulators
  const gazePhaseRef = useRef(1.57); // π/2 — fixed initial phase avoids impure Math.random

  useFrame(({ camera, clock }) => {
    const rawLevel = audioLevelRef.current ?? 0;

    // Smooth the audio level to avoid jitter
    smoothedLevel.current +=
      (rawLevel - smoothedLevel.current) * LIP_SYNC_SMOOTHING;
    const level = smoothedLevel.current;

    // Drive jaw/mouth morph targets for lip-sync
    const head = nodes.Wolf3D_Head;
    const teeth = nodes.Wolf3D_Teeth;

    if (featureToggles.lipSync && head?.morphTargetDictionary && head?.morphTargetInfluences) {
      const jawIdx = head.morphTargetDictionary["jawOpen"];
      const mouthIdx = head.morphTargetDictionary["mouthOpen"];

      if (jawIdx !== undefined) {
        // eslint-disable-next-line react-hooks/immutability
        head.morphTargetInfluences[jawIdx] = Math.min(1, level * LIP_SYNC_JAW_MULTIPLIER);
      }
      if (mouthIdx !== undefined) {
        head.morphTargetInfluences[mouthIdx] = Math.min(1, level * LIP_SYNC_MOUTH_MULTIPLIER);
      }
    }

    // Teeth follow the jaw
    if (featureToggles.lipSync && teeth?.morphTargetDictionary && teeth?.morphTargetInfluences) {
      const jawIdx = teeth.morphTargetDictionary["jawOpen"];
      if (jawIdx !== undefined) {
        teeth.morphTargetInfluences[jawIdx] = Math.min(1, level * LIP_SYNC_JAW_MULTIPLIER);
      }
    }

    // ARKit Hover Smile Effect
    if (featureToggles.hoverEffect && head?.morphTargetDictionary && head?.morphTargetInfluences) {
      const smileLeftIdx = head.morphTargetDictionary["mouthSmileLeft"];
      const smileRightIdx = head.morphTargetDictionary["mouthSmileRight"];
      const cheekLeftIdx = head.morphTargetDictionary["cheekSquintLeft"];
      const cheekRightIdx = head.morphTargetDictionary["cheekSquintRight"];

      const targetSmile = hovered ? 0.8 : 0;
      const targetCheek = hovered ? 0.3 : 0;

      if (smileLeftIdx !== undefined) {
        head.morphTargetInfluences[smileLeftIdx] += (targetSmile - head.morphTargetInfluences[smileLeftIdx]) * 0.1;
      }
      if (smileRightIdx !== undefined) {
        head.morphTargetInfluences[smileRightIdx] += (targetSmile - head.morphTargetInfluences[smileRightIdx]) * 0.1;
      }
      if (cheekLeftIdx !== undefined) {
        head.morphTargetInfluences[cheekLeftIdx] += (targetCheek - head.morphTargetInfluences[cheekLeftIdx]) * 0.1;
      }
      if (cheekRightIdx !== undefined) {
        head.morphTargetInfluences[cheekRightIdx] += (targetCheek - head.morphTargetInfluences[cheekRightIdx]) * 0.1;
      }
    }

    // Subtle idle breathing — small Y oscillation on Hips
    if (featureToggles.breathing && nodes.Hips) {
      nodes.Hips.position.y =
        Math.sin(Date.now() * BREATHING_SPEED) * BREATHING_AMPLITUDE;
    }

    // ── Gaze behavior: look at camera when speaking, drift when listening ───
    if (featureToggles.gazeDrift) {
      const headNode = nodes.Head || scene.getObjectByName("Head");
      if (headNode) {
        if (level > 0.05) {
          headNode.lookAt(camera.position.x, camera.position.y, camera.position.z);
        } else {
          gazePhaseRef.current += 0.003;
          const t = gazePhaseRef.current;
          const driftX = Math.sin(t * 1.3) * 0.04;
          const driftY = Math.sin(t * 0.9) * 0.025;
          headNode.lookAt(
            camera.position.x + driftX,
            camera.position.y + driftY,
            camera.position.z
          );
        }
      }
    }


    // ── Blink (every ~4 seconds, slight randomness) ──────────────────────────
    if (featureToggles.blinking && head?.morphTargetDictionary && head?.morphTargetInfluences) {
      const blinkLeftIdx = head.morphTargetDictionary["eyeBlinkLeft"];
      const blinkRightIdx = head.morphTargetDictionary["eyeBlinkRight"];
      const blinkCycle = Math.abs(Math.sin(clock.elapsedTime * 0.8 + 1.2));
      const blinkValue = blinkCycle > 0.98 ? 1 : 0;

      if (blinkLeftIdx !== undefined) {
        head.morphTargetInfluences[blinkLeftIdx] += (blinkValue - head.morphTargetInfluences[blinkLeftIdx]) * 0.4;
      }
      if (blinkRightIdx !== undefined) {
        head.morphTargetInfluences[blinkRightIdx] += (blinkValue - head.morphTargetInfluences[blinkRightIdx]) * 0.4;
      }
    }
  });

  return (
    <group
      ref={groupRef}
      dispose={null}
      position={[0, 0, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        if (featureToggles.hoverEffect) {
          document.body.style.cursor = "pointer";
        }
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "default";
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (actions && actions["wave"]) {
          actions["wave"].reset().fadeIn(0.5).play();
          setTimeout(() => actions["wave"]?.fadeOut(0.5), 2000);
        }
      }}
      scale={(hovered && featureToggles.hoverEffect) ? 1.05 : 1}
    >
      <primitive object={nodes.Hips} />
      <skinnedMesh
        geometry={nodes.Wolf3D_Hair.geometry}
        material={materials.Wolf3D_Hair}
        skeleton={nodes.Wolf3D_Hair.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Glasses.geometry}
        material={materials.Wolf3D_Glasses}
        skeleton={nodes.Wolf3D_Glasses.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Top.geometry}
        material={materials.Wolf3D_Outfit_Top}
        skeleton={nodes.Wolf3D_Outfit_Top.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Bottom.geometry}
        material={materials.Wolf3D_Outfit_Bottom}
        skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Footwear.geometry}
        material={materials.Wolf3D_Outfit_Footwear}
        skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton}
      />
      {/* Body — uses same PBR skin material for consistency */}
      <skinnedMesh
        geometry={nodes.Wolf3D_Body.geometry}
        material={skinMaterial || materials.Wolf3D_Body}
        skeleton={nodes.Wolf3D_Body.skeleton}
      />
      <skinnedMesh
        name="EyeLeft"
        geometry={nodes.EyeLeft.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeLeft.skeleton}
        morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences}
      />
      <skinnedMesh
        name="EyeRight"
        geometry={nodes.EyeRight.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeRight.skeleton}
        morphTargetDictionary={nodes.EyeRight.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeRight.morphTargetInfluences}
      />
      {/* Head — receives the full PBR MeshPhysicalMaterial with SSS (if not raw) */}
      <skinnedMesh
        name="Wolf3D_Head"
        geometry={nodes.Wolf3D_Head.geometry}
        material={skinMaterial || materials.Wolf3D_Skin}
        skeleton={nodes.Wolf3D_Head.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Teeth"
        geometry={nodes.Wolf3D_Teeth.geometry}
        material={materials.Wolf3D_Teeth}
        skeleton={nodes.Wolf3D_Teeth.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences}
      />
    </group>
  );
}

// Preload animations (avatar model is preloaded by Scene based on config)
useGLTF.preload("/animations/idle.glb");
useGLTF.preload("/animations/wave.glb");
