import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

/**
 * GazeEngine
 * Replaces the old useHeadMovement hook.
 * Handles head orientation and eye saccades with noise for lifelike motion.
 */
export class GazeEngine {
  private noise2D = createNoise2D();
  private time = 0;
  private currentPos = new THREE.Vector2(0, 0);
  private targetPos = new THREE.Vector2(0, 0);

  update(delta: number, camera: THREE.Camera, nodes: Record<string, THREE.Object3D>, pointer: THREE.Vector2, isSpeaking: boolean) {
    this.time += delta;

    const head = nodes.Head as THREE.Bone;
    const neck = nodes.Neck as THREE.Bone;
    const rightEye = nodes.RightEye as THREE.Bone;
    const leftEye = nodes.LeftEye as THREE.Bone;

    if (!head || !neck || !rightEye || !leftEye) return;

    // Saccade noise for eyes (1/f simulated)
    const eyeJitterX = (this.noise2D(this.time * 2, 0) * 0.5 + this.noise2D(this.time * 5, 10) * 0.1) * 0.03;
    const eyeJitterY = (this.noise2D(10, this.time * 2) * 0.5 + this.noise2D(0, this.time * 5) * 0.1) * 0.03;

    // Head movement driven by noise during speech
    let speechHeadMotionX = 0;
    let speechHeadMotionY = 0;
    if (isSpeaking) {
      speechHeadMotionX = Math.sin(this.time * 2) * 0.01;
      speechHeadMotionY = Math.sin(this.time * 1.5) * 0.015;
    }

    // Determine target based on pointer
    const rad = Math.PI / 180;
    const rotationMargin = new THREE.Vector2(5, 10);

    // Follow pointer slightly
    this.targetPos.x = THREE.MathUtils.clamp(pointer.y, -0.5, 1) * (-rotationMargin.x * rad);
    this.targetPos.y = THREE.MathUtils.clamp(pointer.x, -0.5, 0.5) * (rotationMargin.y * rad);

    // Smoothly interpolate current head rotation towards target
    this.currentPos.x = THREE.MathUtils.damp(this.currentPos.x, this.targetPos.x, 3, delta);
    this.currentPos.y = THREE.MathUtils.damp(this.currentPos.y, this.targetPos.y, 3, delta);

    // Apply rotations
    const neckBoneRotationOffsetX = 10 * rad;

    neck.rotation.x = this.currentPos.x + neckBoneRotationOffsetX;
    neck.rotation.y = this.currentPos.y;

    head.rotation.x = this.currentPos.x + speechHeadMotionX;
    head.rotation.y = this.currentPos.y + speechHeadMotionY;

    // Eyes follow head but have independent jitter
    rightEye.rotation.x = this.currentPos.x + eyeJitterX;
    rightEye.rotation.y = this.currentPos.y * 2 + eyeJitterY;

    leftEye.rotation.x = this.currentPos.x + eyeJitterX;
    leftEye.rotation.y = this.currentPos.y * 2 + eyeJitterY;
  }
}
