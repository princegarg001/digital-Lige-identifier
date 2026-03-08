import { useGLTF } from "@react-three/drei";
import { useEffect, useState } from "react";
import * as THREE from "three";
import { useAnimationStore } from "../store/useAnimationStore";

// Type definition from our registry types
import { AnimationMeta } from "../lib/animationRegistry.types";

export function useDynamicAnimations() {
  const currentAnimationName = useAnimationStore((state) => state.currentAnimation);
  const animationQueue = useAnimationStore((state) => state.animationQueue);
  const registry = useAnimationStore((state) => state.registry);
  const [activeClip, setActiveClip] = useState<THREE.AnimationClip | null>(null);
  
  const activeMeta: AnimationMeta | undefined = registry[currentAnimationName];
  const defaultIdleMeta: AnimationMeta | undefined = registry["idle_2"]; 
  
  const targetUrl = activeMeta?.url || defaultIdleMeta?.url || "/animations/feminine/idle/idle_2.glb"; 
  
  const { animations } = useGLTF(targetUrl) as { animations: THREE.AnimationClip[] };
  
  const advanceQueue = useAnimationStore((state) => state.advanceQueue);

  useEffect(() => {
    if (animations && animations.length > 0) {
      const clip = animations[0].clone();
      clip.name = currentAnimationName;
      setActiveClip(clip);
      
      // Auto-Progression Logic
      // We only run the countdown if we are actively walking through a generated sequence
      if (animationQueue.length > 0 && animationQueue[0].name === currentAnimationName) {
        const currentTask = animationQueue[0];
        
        // If the LLM requested a forced duration (e.g. 1000ms), we obey it.
        // Otherwise, we read the exact physical length of the 3D binary clip!
        const durationMs = currentTask.durationMs || (clip.duration * 1000);
        
        const timer = setTimeout(() => {
          advanceQueue();
        }, durationMs);
        
        return () => clearTimeout(timer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animations, currentAnimationName, animationQueue[0]?.id, advanceQueue]);
  
  // 1. Mandatory Preload for the current target
  useGLTF.preload(targetUrl);

  // 2. Async Background Preloading for the Upcoming Queue
  // This explicitly prevents the 3D Avatar from dropping into a Suspense/Loading 
  // state when crossfading to the next LLM-generated gesture in the sequence stack.
  useEffect(() => {
    if (animationQueue.length > 0) {
      // Look at the "next" items in the queue (skipping the currently active index 0)
      const upcomingItems = animationQueue.slice(1);
      
      upcomingItems.forEach(queuedItem => {
        const meta = registry[queuedItem.name];
        if (meta?.url) {
           useGLTF.preload(meta.url);
        }
      });
    }
  }, [animationQueue, registry]);

  return { activeClip };
}
