import * as THREE from 'three';
import { PHYSICS_SMOOTHING } from "@/lib/constants";
import { OCULUS_VISEMES } from './viseme-map';
import { Lipsync } from 'wawa-lipsync';
import { createLogger } from '@/lib/logging/logger';

const log = createLogger("lipsync-engine");

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

    // 100% Native Audio Analysis Fallback
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

             if (level > 0.05) {
               // log.debug({ activeViseme, level }, "Lipsync viseme evaluated"); // Uncomment for super deep debugging
             }
          } catch (e) {
             log.error({ err: e }, "Wawa Lipsync evaluation failed");
             this.applyVolumeFallback(head, teeth, level, delta);
          }
       } else {
         this.applyVolumeFallback(head, teeth, level, delta);
       }
  }

  private applyVolumeFallback(head: THREE.SkinnedMesh, teeth: THREE.SkinnedMesh, level: number, delta: number) {
      // Absolute fallback: Volume-based jaw/mouth (if wawa isn't ready or volume is extremely low)
      const targetJaw = Math.min(1, level * PHYSICS_SMOOTHING.jaw_mult);
      const targetMouth = Math.min(1, level * PHYSICS_SMOOTHING.mouth_mult);

      this.applyMorph(head, "jawOpen", targetJaw, delta);
      this.applyMorph(head, "mouthOpen", targetMouth, delta);
      
      if (level > 0.1) {
        log.warn({ level }, "Using volume fallback for lipsync");
      }
      
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
