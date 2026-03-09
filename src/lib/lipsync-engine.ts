import * as THREE from 'three';
import { PHYSICS_SMOOTHING } from "@/lib/constants";
import { useLipSyncStore } from '@/store/useLipSyncStore';
import { OCULUS_VISEMES } from './viseme-map';
import { Lipsync } from 'wawa-lipsync';

export class LipSyncEngine {
  public wawaLipsync: Lipsync | null = null;
  private lastViseme: string = '';
  private currentWeight: number = 0;
  /**
   * Native audio fallback: Maps raw volume level to basic jaw and mouth shapes.
   * Dampens the movement for smoother "co-articulation".
   */
  updateFromAudioLevel(level: number, delta: number, nodes: Record<string, THREE.Object3D>) {
    const head = nodes.Wolf3D_Head as THREE.SkinnedMesh;
    const teeth = nodes.Wolf3D_Teeth as THREE.SkinnedMesh;
    
    if (!head || !head.morphTargetDictionary || !head.morphTargetInfluences) return;

    // Phase 4: Text-driven visemes
    const weights = useLipSyncStore.getState().scheduler.getWeights(Date.now());
    let hasTextVisemes = false;

    // Apply text visemes
    for (const viseme of OCULUS_VISEMES) {
       const weight = weights[viseme];
       if (weight > 0.05) {
          hasTextVisemes = true;
          this.applyMorph(head, viseme, weight, delta);
          if (teeth && teeth.morphTargetDictionary && teeth.morphTargetInfluences) {
             this.applyMorph(teeth, viseme, weight * 1.1, delta);
          }
       } else {
          // Fade out unused visemes
          this.applyMorph(head, viseme, 0, delta);
          if (teeth && teeth.morphTargetDictionary && teeth.morphTargetInfluences) {
             this.applyMorph(teeth, viseme, 0, delta);
          }
       }
    }

    // Phase 3 Fallback: if no text visemes are active, use volume-based jaw/mouth
    if (!hasTextVisemes) {
       if (this.wawaLipsync && level > 0.01) {
          try {
             this.wawaLipsync.processAudio();
             const activeViseme = (this.wawaLipsync.viseme as string).replace('viseme_', '');
             
             if (activeViseme !== this.lastViseme) {
                this.lastViseme = activeViseme;
                this.currentWeight = 1.0;
             }
             
             // Dampen weight over time for natural release
             this.currentWeight = THREE.MathUtils.damp(this.currentWeight, 0, 5, delta);

             for (const viseme of OCULUS_VISEMES) {
                const target = (viseme === activeViseme) ? Math.min(1.0, this.currentWeight + level) : 0;
                this.applyMorph(head, viseme, target, delta);
                if (teeth && teeth.morphTargetDictionary && teeth.morphTargetInfluences) {
                   this.applyMorph(teeth, viseme, target * 1.1, delta);
                }
             }
          } catch (e) {
             console.warn("Wawa Lipsync evaluation failed", e);
             this.applyVolumeFallback(head, teeth, level, delta);
          }
       } else {
         this.applyVolumeFallback(head, teeth, level, delta);
       }
    }
  }

  private applyVolumeFallback(head: THREE.SkinnedMesh, teeth: THREE.SkinnedMesh, level: number, delta: number) {
      // Absolute fallback: Volume-based jaw/mouth (if wawa isn't ready or volume is extremely low)
      const targetJaw = Math.min(1, level * PHYSICS_SMOOTHING.jaw_mult);
      const targetMouth = Math.min(1, level * PHYSICS_SMOOTHING.mouth_mult);

      this.applyMorph(head, "jawOpen", targetJaw, delta);
      this.applyMorph(head, "mouthOpen", targetMouth, delta);
      
      if (teeth && teeth.morphTargetDictionary && teeth.morphTargetInfluences) {
        this.applyMorph(teeth, "jawOpen", targetJaw * 1.1, delta);
      }
  }

  private applyMorph(mesh: THREE.SkinnedMesh, name: string, target: number, delta: number) {
    const dict = mesh.morphTargetDictionary;
    const influences = mesh.morphTargetInfluences;
    if (dict && influences && dict[name] !== undefined) {
      const idx = dict[name];
      // Faster damping for lip sync (e.g. lambda = 25)
      influences[idx] = THREE.MathUtils.damp(influences[idx], target, 25, delta);
    }
  }
}
