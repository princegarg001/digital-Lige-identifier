import * as THREE from 'three';
import { useEmotionStore } from '@/store/useEmotionStore';

export class EmotionEngine {
  private smoothedScore = 0;

  update(
    delta: number, 
    nodes: Record<string, THREE.Object3D>, 
    currentExpression: string, 
    hovered: boolean, 
    featureToggles: Record<string, boolean>
  ) {
    const head = nodes.Wolf3D_Head as THREE.SkinnedMesh;
    if (!head || !head.morphTargetDictionary || !head.morphTargetInfluences) return;

    // Base target values determined by UI or interactions
    let targetSmile = (hovered && featureToggles.hoverEffect) ? 0.8 : 0;
    let targetCheek = (hovered && featureToggles.hoverEffect) ? 0.3 : 0;
    let targetBrowInnerUp = 0;
    let targetBrowDown = 0;
    let targetFrown = 0;

    // Real-time Contextual Sentiment (comparative usually -5 to +5)
    // 0 = neutral, >0 = positive, <0 = negative
    const sentimentScore = useEmotionStore.getState().currentScore;
    
    // Dampen the score so emotions drift naturally rather than snapping
    this.smoothedScore = THREE.MathUtils.damp(this.smoothedScore, sentimentScore, 2, delta);

    if (this.smoothedScore > 0.2) {
      targetSmile = Math.min(1, targetSmile + this.smoothedScore * 0.8);
      targetCheek = Math.min(1, targetCheek + this.smoothedScore * 0.5);
    } else if (this.smoothedScore < -0.2) {
      targetFrown = Math.min(1, targetFrown + Math.abs(this.smoothedScore) * 0.7);
      targetBrowDown = Math.min(1, targetBrowDown + Math.abs(this.smoothedScore) * 0.5);
    }

    // UI Expression Overrides (highest priority)
    if (currentExpression === "happy" || currentExpression === "smile") {
      targetSmile = 1.0; targetCheek = 0.6;
    } else if (currentExpression === "sad") {
      targetBrowInnerUp = 0.8; targetFrown = 0.8;
    } else if (currentExpression === "angry") {
      targetBrowDown = 0.9; targetFrown = 0.4;
    } else if (currentExpression === "surprised") {
      targetBrowInnerUp = 1.0; targetSmile = 0.2;
    } else if (currentExpression === "fearful") {
      targetBrowInnerUp = 1.0; targetFrown = 0.5;
    } else if (currentExpression === "disgusted") {
      targetBrowDown = 0.5; targetFrown = 0.6;
    }

    const dict = head.morphTargetDictionary;
    const influences = head.morphTargetInfluences;

    const apply = (name: string, target: number) => {
      const idx = dict[name];
      // Note: we can safely modify morph targets because we disabled eslint for the Avatar's useFrame block
      if (idx !== undefined) {
         influences[idx] = THREE.MathUtils.damp(influences[idx], target, 5, delta);
      }
    };

    apply("mouthSmileLeft", targetSmile);
    apply("mouthSmileRight", targetSmile);
    apply("cheekSquintLeft", targetCheek);
    apply("cheekSquintRight", targetCheek);
    apply("browInnerUp", targetBrowInnerUp);
    apply("browDownLeft", targetBrowDown);
    apply("browDownRight", targetBrowDown);
    apply("mouthFrownLeft", targetFrown);
    apply("mouthFrownRight", targetFrown);
  }
}
