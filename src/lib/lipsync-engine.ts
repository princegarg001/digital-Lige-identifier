import * as THREE from 'three';
import { PHYSICS_SMOOTHING } from "@/lib/constants";
import { OCULUS_VISEMES } from './viseme-map';
import { Lipsync } from 'wawa-lipsync';
import { createLogger } from '@/lib/logging/logger';

const log = createLogger("lipsync-engine");

const ARKIT_MOUTH_TARGETS = [
  "jawOpen",
  "mouthClose",
  "mouthFunnel",
  "mouthPucker",
  "mouthSmileLeft",
  "mouthSmileRight",
  "mouthStretchLeft",
  "mouthStretchRight",
  "mouthPressLeft",
  "mouthPressRight",
  "mouthLowerDownLeft",
  "mouthLowerDownRight",
] as const;

const ARKIT_VISEME_MAP: Record<string, Partial<Record<(typeof ARKIT_MOUTH_TARGETS)[number], number>>> = {
  viseme_sil: { mouthClose: 0.2 },
  viseme_PP: { mouthClose: 1.0, mouthPressLeft: 0.5, mouthPressRight: 0.5 },
  viseme_FF: { mouthFunnel: 0.65, jawOpen: 0.15 },
  viseme_TH: { jawOpen: 0.35, mouthFunnel: 0.35 },
  viseme_DD: { jawOpen: 0.3, mouthClose: 0.3 },
  viseme_kk: { jawOpen: 0.45 },
  viseme_CH: { mouthPucker: 0.7, jawOpen: 0.25 },
  viseme_SS: { mouthStretchLeft: 0.8, mouthStretchRight: 0.8, jawOpen: 0.2 },
  viseme_nn: { mouthClose: 0.55, jawOpen: 0.2 },
  viseme_RR: { mouthFunnel: 0.5, mouthPucker: 0.4, jawOpen: 0.25 },
  viseme_aa: { jawOpen: 1.0 },
  viseme_E: { mouthStretchLeft: 0.6, mouthStretchRight: 0.6, jawOpen: 0.35 },
  viseme_I: { mouthSmileLeft: 0.65, mouthSmileRight: 0.65, jawOpen: 0.4 },
  viseme_O: { mouthFunnel: 0.85, jawOpen: 0.35 },
  viseme_U: { mouthPucker: 0.85, jawOpen: 0.25 },
};

export class LipSyncEngine {
  public wawaLipsync: Lipsync | null = null;
  private lastViseme = 'viseme_sil';
  private previousViseme = 'viseme_sil';
  private transitionCarry = 0;
  private warnedNoNativeVisemes = false;
  /**
   * Native audio fallback: Maps raw volume level to basic jaw and mouth shapes.
   * Dampens the movement for smoother "co-articulation".
   */
  updateFromAudioLevel(level: number, delta: number, nodes: Record<string, THREE.Object3D>) {
    const head = nodes.Wolf3D_Head as THREE.SkinnedMesh;
    const teeth = nodes.Wolf3D_Teeth as THREE.SkinnedMesh;
    
    if (!head || !head.morphTargetDictionary || !head.morphTargetInfluences) return;

    if (this.wawaLipsync) {
      try {
        this.wawaLipsync.processAudio();
        const activeViseme = (this.wawaLipsync.viseme as string) || "viseme_sil";
        const state = (this.wawaLipsync as unknown as { state?: string }).state ?? "vowel";
        const speakingGain = THREE.MathUtils.clamp((level - 0.01) * 2.4, 0, 1);

        if (activeViseme !== this.lastViseme) {
          this.previousViseme = this.lastViseme;
          this.lastViseme = activeViseme;
          this.transitionCarry = 1;
        }

        const carryLambda = state === "vowel" ? 8 : 14;
        this.transitionCarry = THREE.MathUtils.damp(this.transitionCarry, 0, carryLambda, delta);

        const activeWeight = speakingGain;
        const carryWeight = this.previousViseme === "viseme_sil"
          ? 0
          : speakingGain * 0.35 * this.transitionCarry;
        const visemeLambda = state === "vowel" ? 16 : 24;
        const useNativeVisemes = this.hasNativeVisemes(head);
        if (!useNativeVisemes && !this.warnedNoNativeVisemes) {
          this.warnedNoNativeVisemes = true;
          log.warn("Avatar has no native Oculus viseme targets; using ARKit fallback mapping.");
        }

        if (useNativeVisemes) {
          for (const viseme of OCULUS_VISEMES) {
            let target = 0;
            if (viseme === this.lastViseme) target = activeWeight;
            else if (viseme === this.previousViseme) target = carryWeight;

            this.applyMorph(head, viseme, target, delta, visemeLambda);
            if (teeth && teeth.morphTargetDictionary && teeth.morphTargetInfluences) {
              this.applyMorph(teeth, viseme, target * 1.1, delta, visemeLambda);
            }
          }
        } else {
          this.applyArkitFromVisemes(head, this.lastViseme, this.previousViseme, activeWeight, carryWeight, delta, visemeLambda);
        }

        // Layer tiny jaw support so closed-mouth visemes still read as speech.
        this.applyMorph(head, "jawOpen", activeWeight * 0.55, delta, 18);
        this.applyMorph(head, "mouthFunnel", activeWeight * 0.2, delta, 18);
        if (teeth && teeth.morphTargetDictionary && teeth.morphTargetInfluences) {
          this.applyMorph(teeth, "jawOpen", activeWeight * 0.6, delta, 18);
        }
        return;
      } catch (e) {
        log.error({ err: e }, "Wawa Lipsync evaluation failed");
      }
    }

    this.applyVolumeFallback(head, teeth, level, delta);
  }

  private applyVolumeFallback(head: THREE.SkinnedMesh, teeth: THREE.SkinnedMesh, level: number, delta: number) {
      // Absolute fallback: Volume-based jaw/mouth (if wawa isn't ready or volume is extremely low)
      const targetJaw = Math.min(1, level * PHYSICS_SMOOTHING.jaw_mult);
      const targetMouth = Math.min(1, level * PHYSICS_SMOOTHING.mouth_mult);

      this.applyMorph(head, "jawOpen", targetJaw, delta);
      this.applyMorph(head, "mouthFunnel", targetMouth * 0.6, delta);
      this.applyMorph(head, "mouthPucker", targetMouth * 0.4, delta);
      
      if (teeth && teeth.morphTargetDictionary && teeth.morphTargetInfluences) {
        this.applyMorph(teeth, "jawOpen", targetJaw * 1.1, delta);
      }
  }

  private hasNativeVisemes(mesh: THREE.SkinnedMesh): boolean {
    const dict = mesh.morphTargetDictionary;
    if (!dict) return false;
    return dict.viseme_aa !== undefined || dict.viseme_PP !== undefined;
  }

  private applyArkitFromVisemes(
    mesh: THREE.SkinnedMesh,
    activeViseme: string,
    previousViseme: string,
    activeWeight: number,
    carryWeight: number,
    delta: number,
    lambda: number,
  ) {
    const accum: Partial<Record<(typeof ARKIT_MOUTH_TARGETS)[number], number>> = {};
    for (const target of ARKIT_MOUTH_TARGETS) {
      accum[target] = 0;
    }

    const blendViseme = (viseme: string, weight: number) => {
      const mapping = ARKIT_VISEME_MAP[viseme];
      if (!mapping || weight <= 0) return;
      for (const [target, mix] of Object.entries(mapping)) {
        const key = target as (typeof ARKIT_MOUTH_TARGETS)[number];
        accum[key] = Math.min(1, (accum[key] ?? 0) + weight * (mix ?? 0));
      }
    };

    blendViseme(activeViseme, activeWeight);
    blendViseme(previousViseme, carryWeight);

    for (const target of ARKIT_MOUTH_TARGETS) {
      this.applyMorph(mesh, target, accum[target] ?? 0, delta, lambda);
    }
  }

  private applyMorph(
    mesh: THREE.SkinnedMesh,
    name: string,
    target: number,
    delta: number,
    lambda: number = 25,
  ) {
    const dict = mesh.morphTargetDictionary;
    const influences = mesh.morphTargetInfluences;
    if (dict && influences && dict[name] !== undefined) {
      const idx = dict[name];
      influences[idx] = THREE.MathUtils.damp(influences[idx], target, lambda, delta);
    }
  }
}
