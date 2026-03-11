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
  viseme_sil: { mouthClose: 0.28 },
  viseme_PP: { mouthClose: 1.0, mouthPressLeft: 0.45, mouthPressRight: 0.45 },
  viseme_FF: { mouthFunnel: 0.5, jawOpen: 0.08 },
  viseme_TH: { jawOpen: 0.22, mouthFunnel: 0.3 },
  viseme_DD: { jawOpen: 0.18, mouthClose: 0.45 },
  viseme_kk: { jawOpen: 0.28 },
  viseme_CH: { mouthPucker: 0.6, jawOpen: 0.18 },
  viseme_SS: { mouthStretchLeft: 0.65, mouthStretchRight: 0.65, jawOpen: 0.1 },
  viseme_nn: { mouthClose: 0.6, jawOpen: 0.12 },
  viseme_RR: { mouthFunnel: 0.42, mouthPucker: 0.34, jawOpen: 0.16 },
  viseme_aa: { jawOpen: 0.62 },
  viseme_E: { mouthStretchLeft: 0.55, mouthStretchRight: 0.55, jawOpen: 0.2 },
  viseme_I: { mouthSmileLeft: 0.55, mouthSmileRight: 0.55, jawOpen: 0.18 },
  viseme_O: { mouthFunnel: 0.72, jawOpen: 0.23 },
  viseme_U: { mouthPucker: 0.72, jawOpen: 0.14 },
};

const LIPSYNC_LEVEL_FLOOR = 0.03;
const LIPSYNC_LEVEL_RANGE = 0.26;
const ACTIVE_VOWEL_WEIGHT = 0.58;
const ACTIVE_CONSONANT_WEIGHT = 0.5;
const ACTIVE_WEIGHT_BOOST = 0.2;

export class LipSyncEngine {
  private lastViseme = 'viseme_sil';
  private previousViseme = 'viseme_sil';
  private transitionCarry = 0;
  private warnedNoNativeVisemes = false;
  /**
   * Native audio fallback: Maps raw volume level to basic jaw and mouth shapes.
   * Dampens the movement for smoother "co-articulation".
   */
  updateFromAudioLevel(
    level: number,
    delta: number,
    nodes: Record<string, THREE.Object3D | undefined>,
    wawaLipsync: Lipsync | null = null,
  ) {
    const head = nodes.Wolf3D_Head as THREE.SkinnedMesh;
    const teeth = nodes.Wolf3D_Teeth as THREE.SkinnedMesh;
    
    if (!head || !head.morphTargetDictionary || !head.morphTargetInfluences) return;

    if (wawaLipsync) {
      try {
        wawaLipsync.processAudio();
        const detectedViseme = (wawaLipsync.viseme as string) || "viseme_sil";
        const state = (wawaLipsync as unknown as { state?: string }).state ?? "vowel";
        const levelNorm = THREE.MathUtils.clamp(
          (level - LIPSYNC_LEVEL_FLOOR) / LIPSYNC_LEVEL_RANGE,
          0,
          1,
        );
        const speakingGain = Math.pow(levelNorm, 0.85);
        const activeViseme = speakingGain < 0.04 ? "viseme_sil" : detectedViseme;

        if (activeViseme !== this.lastViseme) {
          this.previousViseme = this.lastViseme;
          this.lastViseme = activeViseme;
          this.transitionCarry = 1;
        }

        const carryLambda = state === "vowel" ? 8 : 14;
        this.transitionCarry = THREE.MathUtils.damp(this.transitionCarry, 0, carryLambda, delta);

        const baseWeight =
          state === "vowel" ? ACTIVE_VOWEL_WEIGHT : ACTIVE_CONSONANT_WEIGHT;
        const activeWeight = activeViseme === "viseme_sil"
          ? 0.22 * (1 - speakingGain * 0.4)
          : THREE.MathUtils.clamp(
              baseWeight + speakingGain * ACTIVE_WEIGHT_BOOST,
              0,
              0.82,
            );
        const carryWeight = this.previousViseme === "viseme_sil"
          ? 0
          : activeWeight * (state === "vowel" ? 0.22 : 0.16) * this.transitionCarry;
        const visemeLambda = state === "vowel" ? 14 : 22;
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
              this.applyMorph(teeth, viseme, target * 0.95, delta, visemeLambda);
            }
          }
        } else {
          this.applyArkitFromVisemes(head, this.lastViseme, this.previousViseme, activeWeight, carryWeight, delta, visemeLambda);
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
      const normalizedLevel = THREE.MathUtils.clamp((level - 0.03) / 0.3, 0, 1);
      const targetJaw = Math.min(0.45, normalizedLevel * PHYSICS_SMOOTHING.jaw_mult * 0.28);
      const targetMouth = Math.min(0.4, normalizedLevel * PHYSICS_SMOOTHING.mouth_mult * 0.24);

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

