"use client";

import React, { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls as DreiOrbitControls } from "@react-three/drei";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useResponsiveCamera } from "@/hooks/useResponsiveCamera";

interface SmartCameraControlsProps {
  /** The un-zoomed camera target (usually the face/head level e.g., Y=1.55) */
  target: [number, number, number];
  minDistance: number;
  maxDistance: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
  zoomTargetShift?: number;
  enableRotate?: boolean;
  enablePan?: boolean;
  makeDefault?: boolean;
  enableDamping?: boolean;
  dampingFactor?: number;
}

/** clamp a number between min and max */
function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

/**
 * SmartCameraControls wraps @react-three/drei's OrbitControls.
 * It prevents the camera near clipping plane from slicing through the avatar's face
 * when zooming in.
 * 
 * Ported directly from Visage `CameraControls.component.tsx` `updateCameraTargetOnZoom`.
 * As the distance approaches `minDistance`, the target smoothly slides downward
 * (by up to 0.6 units). This keeps the face in frame while pushing the actual camera
 * lens further away physically towards the chest/stomach area.
 */
export function SmartCameraControls({
  target,
  minDistance,
  maxDistance,
  minPolarAngle = 0,
  maxPolarAngle = Math.PI,
  zoomTargetShift = 0.6,
  enableRotate = true,
  enablePan = true,
  ...rest
}: SmartCameraControlsProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();

  // Apply responsive portrait FOV scaling logic to perfectly frame on any device
  useResponsiveCamera({ baseFov: 45, maxFov: 65 });

  // The base Y level we want to observe when zoomed out (e.g., 1.55)
  const baseTargetY = target[1];

  useFrame(() => {
    const controls = controlsRef.current;
    if (controls) {
      // Calculate current distance from camera to target
      let distance = controls.target.distanceTo(camera.position);
      distance = clamp(distance, maxDistance, minDistance);
      
      // Calculate pivot: 1.0 = fully zoomed in, 0.0 = fully zoomed out
      const pivot = (distance - minDistance) / (maxDistance - minDistance);

      // E.g. When pivot is 0 (zoomed to minDistance), we shift target.y down by zoomTargetShift.
      // This is the exact Visage anti-clipping formula.
      controls.target.set(target[0], baseTargetY - (zoomTargetShift ?? 0.6) * pivot, target[2]);
      
      controls.update();
    }
  });

  return (
    <DreiOrbitControls
      ref={controlsRef}
      enableRotate={enableRotate}
      enablePan={enablePan}
      // Start at the base target
      target={new THREE.Vector3(...target)}
      minDistance={minDistance}
      maxDistance={maxDistance}
      minPolarAngle={minPolarAngle}
      maxPolarAngle={maxPolarAngle}
      {...rest}
    />
  );
}
