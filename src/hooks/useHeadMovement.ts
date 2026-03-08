import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MathUtils } from "three";

export interface HeadMovementNodes {
  Neck?: THREE.Bone | THREE.Object3D;
  Head?: THREE.Bone | THREE.Object3D;
  RightEye?: THREE.Bone | THREE.Object3D;
  LeftEye?: THREE.Bone | THREE.Object3D;
  [key: string]: THREE.Object3D | undefined;
}

export interface UseHeadMovementProps {
  nodes: HeadMovementNodes;
  isHalfBody?: boolean;
  distance?: number;
  activeRotation?: number;
  rotationMargin?: THREE.Vector2;
  enabled?: boolean;
}

const mapRange = (value: number, inMin: number, inMax: number, outMin: number, outMax: number) =>
  ((MathUtils.clamp(value, inMax, inMin) - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;

/**
 * Avatar head and eye movement relative to cursor.
 * Ported from Visage library.
 */
export const useHeadMovement = ({
  nodes,
  isHalfBody = false,
  distance = 2,
  activeRotation = 0.2,
  rotationMargin = new THREE.Vector2(5, 10),
  enabled = false
}: UseHeadMovementProps) => {
  const rad = Math.PI / 180;
  // We use refs to persist values across frames without triggering re-renders
  const currentPos = new THREE.Vector2(0, 0);
  const targetPos = new THREE.Vector2(0, 0);
  
  const activeDistance = distance - (isHalfBody ? 1 : 0);
  const eyeRotationOffsetX = isHalfBody ? 90 * rad : 0;
  const neckBoneRotationOffsetX = (isHalfBody ? -5 : 10) * rad;

  useFrame((state) => {
    if (!enabled || !nodes.Neck || !nodes.Head || !nodes.RightEye || !nodes.LeftEye) {
      return;
    }

    const cameraToHeadDistance = state.camera.position.distanceTo(nodes.Head.position);
    const cameraRotation = Math.abs(state.camera.rotation.z);

    // If camera is close enough and not heavily rotated, track mouse
    if (cameraToHeadDistance < activeDistance && cameraRotation < activeRotation) {
      targetPos.x = mapRange(state.pointer.y, -0.5, 1, rotationMargin.x * rad, -rotationMargin.x * rad);
      targetPos.y = mapRange(state.pointer.x, -0.5, 0.5, -rotationMargin.y * rad, rotationMargin.y * rad);
    } else {
      targetPos.set(0, 0);
    }

    currentPos.x = MathUtils.lerp(currentPos.x, targetPos.x, 0.05);
    currentPos.y = MathUtils.lerp(currentPos.y, targetPos.y, 0.05);

    nodes.Neck.rotation.x = currentPos.x + neckBoneRotationOffsetX;
    nodes.Neck.rotation.y = currentPos.y;

    nodes.Head.rotation.x = currentPos.x;
    nodes.Head.rotation.y = currentPos.y;

    nodes.RightEye.rotation.x = currentPos.x - eyeRotationOffsetX;
    nodes.LeftEye.rotation.x = currentPos.x - eyeRotationOffsetX;

    if (isHalfBody) {
      nodes.RightEye.rotation.z = currentPos.y * 2 + Math.PI;
      nodes.LeftEye.rotation.z = currentPos.y * 2 + Math.PI;
    } else {
      nodes.RightEye.rotation.y = currentPos.y * 2;
      nodes.LeftEye.rotation.y = currentPos.y * 2;
    }
  });
};
