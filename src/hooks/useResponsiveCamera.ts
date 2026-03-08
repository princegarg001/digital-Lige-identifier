import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { MathUtils } from "three";

interface UseResponsiveCameraProps {
  /** The base field of view when on standard desktop displays */
  baseFov?: number;
  /** The maximum field of view to scale up to on narrow mobile screens */
  maxFov?: number;
  /** Whether to enable responsive scaling */
  enabled?: boolean;
}

/**
 * A hook that dynamically adjusts the camera FOV (Field of View) based on the screen aspect ratio.
 * This ensures that on portrait/mobile screens, the avatar doesn't get awkwardly clipped at the shoulders.
 * It smoothly lerps the camera FOV values during window resize to prevent layout thrashing.
 */
export const useResponsiveCamera = ({
  baseFov = 45,
  maxFov = 65,
  enabled = true,
}: UseResponsiveCameraProps = {}) => {
  const { camera, size } = useThree();
  const targetFovRef = useRef(baseFov);

  useEffect(() => {
    if (!enabled) return;

    // Standard desktop aspect ratio is usually around 1.77 (16:9)
    // Mobile aspect ratios are generally < 1.0 (e.g. 9:16 portrait)
    const aspect = size.width / size.height;

    if (aspect < 1.0) {
      // Portrait mode: The narrower the screen, the wider the FOV needs to be to fit the avatar
      // We map an aspect of 0.5 -> maxFov, and 1.0 -> baseFov
      const scale = MathUtils.clamp(1 - aspect, 0, 1);
      targetFovRef.current = MathUtils.lerp(baseFov, maxFov, scale);
    } else {
      // Landscape mode: Stick to the designed base FOV
      targetFovRef.current = baseFov;
    }
  }, [size.width, size.height, baseFov, maxFov, enabled]);

  useFrame(() => {
    if (!enabled || !(camera instanceof THREE.PerspectiveCamera)) return;

    // Smoothly interpolate the actual camera FOV towards the target FOV
    if (Math.abs(camera.fov - targetFovRef.current) > 0.1) {
      /* eslint-disable */
      camera.fov = MathUtils.lerp(camera.fov, targetFovRef.current, 0.1);
      /* eslint-enable */
      camera.updateProjectionMatrix();
    }
  });
};
