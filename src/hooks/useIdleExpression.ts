import { useCallback, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';

export const expressions = {
  blink: [
    { morphTarget: 'eyesClosed', morphTargetIndex: -1, offset: 0, duration: 0.2 },
    { morphTarget: 'eyeSquintLeft', morphTargetIndex: -1, offset: 0, duration: 0.2 },
    { morphTarget: 'eyeSquintRight', morphTargetIndex: -1, offset: 0, duration: 0.2 }
  ]
};

type ExpressionKey = keyof typeof expressions;

/**
 * Animates avatars facial expressions when morphTargets=ARKit,Eyes Extra is provided.
 * Ported from Visage's `useIdleExpression` in `Models.service.tsx`.
 * Provides much more lifelike randomized blinking/squinting than a simple sine wave.
 */
export const useIdleExpression = (
  expression: ExpressionKey,
  headMesh?: THREE.SkinnedMesh,
  enabled: boolean = true
) => {
  const selectedExpression = expression in expressions ? expressions[expression] : undefined;
  const duration = useRef<number>(Number.POSITIVE_INFINITY);

  // Map string morphTarget names to actual array integer indices
  useEffect(() => {
    if (headMesh?.morphTargetDictionary && selectedExpression) {
      for (let i = 0; i < selectedExpression.length; i++) {
        selectedExpression[i].morphTargetIndex =
          headMesh.morphTargetDictionary[selectedExpression[i].morphTarget] ?? -1;
      }
    }
  }, [selectedExpression, headMesh?.morphTargetDictionary]);

  const animateExpression = useCallback(
    (delta: number) => {
      const influences = headMesh?.morphTargetInfluences;
      if (influences && selectedExpression) {
        duration.current += delta;

        for (let i = 0; i < selectedExpression.length; i++) {
          const section = selectedExpression[i];

          // Ensure the morph target actually exists on this mesh
          if (section.morphTargetIndex === -1) continue;

          if (duration.current < section.duration + section.offset) {
            if (duration.current > section.offset) {
              const pivot = ((duration.current - section.offset) / section.duration) * Math.PI;
              /* eslint-disable */
              influences[section.morphTargetIndex] = Math.sin(pivot);
              /* eslint-enable */
            }
          } else {
            influences[section.morphTargetIndex] = 0;
          }
        }
      }
    },
    [headMesh, selectedExpression]
  );

  // The random interval loop
  useEffect(() => {
    if (!selectedExpression || !enabled) return;
    
    let timeoutId: ReturnType<typeof setTimeout>;

    const loop = () => {
      duration.current = 0;
      // Visage default: trigger between every 3 to 6 seconds randomly
      const delay = Math.random() * 3000 + 3000;
      timeoutId = setTimeout(loop, delay);
    };

    // start the loop
    timeoutId = setTimeout(loop, 3000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [selectedExpression, enabled]);

  useFrame((_, delta) => {
    if (enabled && headMesh && selectedExpression) {
      animateExpression(delta);
    }
  });
};
