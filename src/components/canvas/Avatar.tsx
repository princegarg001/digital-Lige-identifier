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
import { PHYSICS_SMOOTHING } from "@/lib/constants";
import { SkinPreset } from "@/lib/skinConfig";
import { useSkinTexture } from "@/hooks/useSkinTexture";
import { normaliseFbxAnimations } from "@/lib/animationUtils";
import { type FeatureToggles } from "@/hooks/SceneConfigContext";
import { useDynamicAnimations } from "@/hooks/useDynamicAnimations";
import { useAnimationStore } from "@/store/useAnimationStore";
import { IdleExpressionEngine } from "@/lib/idle-expression-engine";
import { GazeEngine } from "@/lib/gaze-engine";
import { LipSyncEngine } from "@/lib/lipsync-engine";
import { EmotionEngine } from "@/lib/emotion-engine";
import { useLipSyncStore } from "@/store/useLipSyncStore";
import { createLogger } from "@/lib/logging/logger";

const log = createLogger("Avatar");

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
  audioLevelRef: React.RefObject<number | null>;
  avatarUrl: string;
  currentAnimation?: string;
  currentExpression?: string;
  skinPreset?: SkinPreset | null;
  featureToggles?: FeatureToggles;
}

const DEFAULT_FEATURES: FeatureToggles = {
  lipSync: true,
  breathing: true,
  gazeDrift: true,
  blinking: true,
  hoverEffect: true,
  headMovement: true,
  googleSearch: true,
  proactiveAudio: true,
};

/**
 * Wolf3D avatar with real-time lip-sync, idle breathing,
 * MeshPhysicalMaterial skin with SSS, and gaze drift.
 */
export function Avatar({ audioLevelRef, avatarUrl, currentExpression, skinPreset = null, featureToggles = DEFAULT_FEATURES }: AvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const { scene, animations: avatarAnimations } = useGLTF(avatarUrl);

  const currentAnimationName = useAnimationStore((state) => state.currentAnimation);
  const activeQueueItems = useAnimationStore((state) => state.animationQueue);
  const { activeClip } = useDynamicAnimations();

  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as unknown as GLTFResult;

  // Visage material normalization: Prevents texture pixelation and sets specific roughness
  React.useEffect(() => {
    Object.values(materials).forEach((material) => {
      const mat = material as THREE.MeshStandardMaterial;
      if (mat.map) {
        mat.map.minFilter = THREE.LinearFilter;
        mat.depthWrite = true;
      }
      if (mat.name.toLowerCase().includes("hair")) {
        mat.roughness = 0.9; // Standard Visage hair roughness
      }
    });
  }, [materials]);

  // Get the PBR skin material with SSS
  const skinMaterial = useSkinTexture(skinPreset);

  // Combine animations and bind them to the groupRef
  // Apply Mixamo FBX normalization best practice from Visage
  const normalizedAnimations = React.useMemo(() => {
    const allAnimations = [
      ...(avatarAnimations || []),
      ...(activeClip ? [activeClip] : []),
    ];
    return normaliseFbxAnimations(allAnimations);
  }, [avatarAnimations, activeClip]);

  const { actions } = useAnimations(normalizedAnimations, groupRef);

  const previousActionRef = useRef<THREE.AnimationAction | null>(null);

  useEffect(() => {
    const actionName = currentAnimationName && actions[currentAnimationName]
      ? currentAnimationName
      : undefined;

    if (!actionName || !actions[actionName]) return;

    const currentAction = actions[actionName];

    // Retrieve custom scaling from Gemini logic
    const activeData = activeQueueItems.find(item => item.name === currentAnimationName);
    const speed = activeData?.timeScale || 1.0;
    currentAction.setEffectiveTimeScale(speed);

    // Stop the action from violently teleporting back to frame 0 when complete.
    // Instead, it physically freezes on its final frame and holds the pose
    // until the next chronological sequence item begins to crossfade!
    currentAction.setLoop(THREE.LoopOnce, 1);
     
    // eslint-disable-next-line
    currentAction.clampWhenFinished = true;

    currentAction.reset().play();
    log.debug({ animation: actionName, speed }, "Playing Avatar animation");

    // If there is an active animation currently playing, cross-fade to the new one!
    // The `true` flag enables time-warping so mismatched length loops don't warp scale.
    if (previousActionRef.current && previousActionRef.current !== currentAction) {
      log.debug({ from: previousActionRef.current.getClip().name, to: actionName }, "Crossfading Avatar animation");
      currentAction.crossFadeFrom(previousActionRef.current, 0.5, true);
    } else {
      currentAction.fadeIn(0.5);
    }

    // Keep track of what is playing so the NEXT animation can fade from it
    previousActionRef.current = currentAction;

    return () => {
       // We intentionally DO NOT fadeOut here anymore, because the incoming 
       // `crossFadeFrom` handles the weight dialing down automatically!
    };
  }, [currentAnimationName, actions, activeQueueItems]);

  const idleEngine = useRef<IdleExpressionEngine | null>(null);
  if (!idleEngine.current) idleEngine.current = new IdleExpressionEngine();
  const gazeEngine = useRef<GazeEngine | null>(null);
  if (!gazeEngine.current) gazeEngine.current = new GazeEngine();
  const lipsyncEngine = useRef<LipSyncEngine | null>(null);
  if (!lipsyncEngine.current) lipsyncEngine.current = new LipSyncEngine();
  const emotionEngine = useRef<EmotionEngine | null>(null);
  if (!emotionEngine.current) emotionEngine.current = new EmotionEngine();

  // Safeguard: Reset zero/NaN scales on bones to prevent mesh collapse
  React.useEffect(() => {
    Object.values(nodes).forEach((node) => {
      const obj = node as THREE.Object3D;
      if (obj?.scale) {
        if (
          obj.scale.x === 0 || Number.isNaN(obj.scale.x) ||
          obj.scale.y === 0 || Number.isNaN(obj.scale.y) ||
          obj.scale.z === 0 || Number.isNaN(obj.scale.z)
        ) {
          console.warn(`[Avatar] Resetting invalid scale on node: ${obj.name}`);
          obj.scale.set(1, 1, 1);
        }
      }
    });
  }, [nodes]);

  // Smoothed value for lip-sync
  const smoothedLevel = useRef(0);

  useFrame((state, delta) => {
    const camera = state.camera;
    // Race Condition Guard: wait for the head mesh to be ready
    if (!nodes.Wolf3D_Head || !nodes.Wolf3D_Teeth) return;

    const rawLevel = audioLevelRef.current ?? 0;

    // Smooth the audio level to avoid jitter
    smoothedLevel.current +=
      (rawLevel - smoothedLevel.current) * PHYSICS_SMOOTHING.lerp_factor;
    const level = smoothedLevel.current;
    
    // Trace high-frequency volumetric changes periodically if moving significantly
    if (level > 0.05 && Math.random() < 0.05) {
       log.trace({ level, rawLevel }, "Audio volume trace for Lipsync");
    }

    // Drive jaw/mouth morph targets for lip-sync using LipSyncEngine
    if (featureToggles.lipSync && lipsyncEngine.current) {
      lipsyncEngine.current.wawaLipsync = useLipSyncStore.getState().wawaLipsync;
      lipsyncEngine.current.updateFromAudioLevel(level, delta, nodes);
    }

    // Execute Emotion Engine (handles UI override, sentiments, and hover effects)
    if (emotionEngine.current) {
      /* eslint-disable */
      emotionEngine.current.update(delta, nodes, currentExpression || "idle", hovered, featureToggles as any);
      /* eslint-enable */
    }

    const isSpeaking = level > 0.05;

    // Execute new engines
    if (idleEngine.current) {
      idleEngine.current.update(delta, nodes);
    }
    
    if (featureToggles.gazeDrift && gazeEngine.current) {
      gazeEngine.current.update(delta, camera, nodes, state.pointer, isSpeaking);
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
        castShadow
        receiveShadow
        frustumCulled={false}
        geometry={nodes.Wolf3D_Hair.geometry}
        material={materials.Wolf3D_Hair}
        skeleton={nodes.Wolf3D_Hair.skeleton}
      />
      <skinnedMesh
        castShadow
        receiveShadow
        frustumCulled={false}
        geometry={nodes.Wolf3D_Glasses.geometry}
        material={materials.Wolf3D_Glasses}
        skeleton={nodes.Wolf3D_Glasses.skeleton}
      />
      <skinnedMesh
        castShadow
        receiveShadow
        frustumCulled={false}
        geometry={nodes.Wolf3D_Outfit_Top.geometry}
        material={materials.Wolf3D_Outfit_Top}
        skeleton={nodes.Wolf3D_Outfit_Top.skeleton}
      />
      <skinnedMesh
        castShadow
        receiveShadow
        frustumCulled={false}
        geometry={nodes.Wolf3D_Outfit_Bottom.geometry}
        material={materials.Wolf3D_Outfit_Bottom}
        skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton}
      />
      <skinnedMesh
        castShadow
        receiveShadow
        frustumCulled={false}
        geometry={nodes.Wolf3D_Outfit_Footwear.geometry}
        material={materials.Wolf3D_Outfit_Footwear}
        skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton}
      />
      {/* Body — uses same PBR skin material for consistency */}
      <skinnedMesh
        castShadow
        receiveShadow
        frustumCulled={false}
        geometry={nodes.Wolf3D_Body.geometry}
        material={skinMaterial || materials.Wolf3D_Body}
        skeleton={nodes.Wolf3D_Body.skeleton}
      />
      <skinnedMesh
        castShadow
        receiveShadow
        frustumCulled={false}
        name="EyeLeft"
        geometry={nodes.EyeLeft.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeLeft.skeleton}
        morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences}
      />
      <skinnedMesh
        castShadow
        receiveShadow
        frustumCulled={false}
        name="EyeRight"
        geometry={nodes.EyeRight.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeRight.skeleton}
        morphTargetDictionary={nodes.EyeRight.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeRight.morphTargetInfluences}
      />
      {/* Head — receives the full PBR MeshPhysicalMaterial with SSS (if not raw) */}
      <skinnedMesh
        castShadow
        receiveShadow
        frustumCulled={false}
        name="Wolf3D_Head"
        geometry={nodes.Wolf3D_Head.geometry}
        material={skinMaterial || materials.Wolf3D_Skin}
        skeleton={nodes.Wolf3D_Head.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences}
      />
      <skinnedMesh
        castShadow
        receiveShadow
        frustumCulled={false}
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

// Animations are dynamically loaded via useDynamicAnimations
