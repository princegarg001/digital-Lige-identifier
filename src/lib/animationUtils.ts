import { AnimationClip } from "three";

const MIXAMO_PREFIX = "mixamorig";
const POSITION_SUFFIX = ".position";
const MIXAMO_SCALE = 0.01;

/**
 * Normalizes FBX animations, particularly from Mixamo.
 * Strips the 'mixamorig' prefix and scales position values down to match standard GLTF sizing.
 * Extracted from @readyplayerme/visage Animation.service.ts
 */
export function normaliseFbxAnimations(animations: AnimationClip[]): AnimationClip[] {
  // It's safer to clone the tracks if we are modifying them, but since we are just mutating 
  // the names and values for Three.js directly like Visage does:
  animations.forEach((clip) => {
    clip.tracks.forEach((track) => {
      const hasMixamoPrefix = track.name.includes(MIXAMO_PREFIX);
      if (hasMixamoPrefix) {
        track.name = track.name.replace(MIXAMO_PREFIX, "");
      }
      if (track.name.includes(POSITION_SUFFIX)) {
        for (let j = 0; j < track.values.length; j += 1) {
          // Scale the bound size down to match the size of the model
          track.values[j] = track.values[j] * MIXAMO_SCALE;
        }
      }
    });
  });

  return animations;
}
