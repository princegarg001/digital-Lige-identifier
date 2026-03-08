import { useGLTF } from "@react-three/drei";
import { useEffect, useState } from "react";
import * as THREE from "three";
import { useAnimationStore } from "../store/useAnimationStore";

// Type definition from our registry types
import { AnimationMeta } from "../lib/animationRegistry.types";

export function useDynamicAnimations() {
  const currentAnimationName = useAnimationStore((state) => state.currentAnimation);
  const registry = useAnimationStore((state) => state.registry);
  const [activeClip, setActiveClip] = useState<THREE.AnimationClip | null>(null);
  
  // To avoid unmounting the hook directly during suspence,
  // we could just fetch manually or use useGLTF to suspend safely 
  // if suspended. Let's just track current url.
  
  const activeMeta: AnimationMeta | undefined = registry[currentAnimationName];
  // Fallback to idle if we can't find it or haven't loaded
  const defaultIdleMeta: AnimationMeta | undefined = registry["idle_2"]; // Just picking one popular default or fallback
  
  const targetUrl = activeMeta?.url || defaultIdleMeta?.url || "/animations/feminine/idle/idle_2.glb"; // Ultimate hardcoded fallback
  
  const { animations } = useGLTF(targetUrl) as { animations: THREE.AnimationClip[] };
  
  useEffect(() => {
    if (animations && animations.length > 0) {
      const clip = animations[0].clone();
      // Important for ReadyPlayerMe models according to our skill doc
      // we must preserve the track names properly.
      clip.name = currentAnimationName;
      setActiveClip(clip);
    }
  }, [animations, currentAnimationName]);
  
  // We preload the current target so R3F doesn't block the UI thread abruptly
  useGLTF.preload(targetUrl);

  return { activeClip };
}
