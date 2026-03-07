/**
 * useSkinTexture — loads & caches PBR textures for a SkinPreset.
 * Returns a THREE.MeshPhysicalMaterial configured for photorealistic skin.
 *
 * Uses MeshPhysicalMaterial properties:
 *   - transmission + thickness → subsurface scattering (light through skin)
 *   - clearcoat → sebum/oil micro-layer on skin surface
 *   - sheen → silk-like micro-fiber scattering
 */

import * as THREE from "three";
import { useMemo, useEffect, useRef } from "react";
import { SkinPreset } from "@/lib/skinConfig";

export function useSkinTexture(preset: SkinPreset | null): THREE.MeshPhysicalMaterial {
  // Keep a stable material reference across renders
  const materialRef = useRef<THREE.MeshPhysicalMaterial | null>(null);

  // Create or update the material whenever the preset changes
  const material = useMemo(() => {
    if (!preset) {
      return new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#f5cba7"),
        roughness: 0.62,
      });
    }

    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(preset.color),
      roughness: preset.roughness,
      metalness: 0.0,         // Skin is NOT metallic
      // Subsurface scattering (SSS)
      thickness: preset.thickness,
      transmission: preset.transmission,
      // Oil/sebum surface layer
      clearcoat: preset.clearcoat,
      clearcoatRoughness: preset.clearcoatRoughness,
      // Micro-sheen (replaces physical sheen property)
      sheenColor: new THREE.Color(preset.sheenColor),
      sheen: 0.3,
      // Side
      side: THREE.FrontSide,
    });
  }, [preset]);

  // When a preset has an `albedo` (base64 data URL or path), load it as texture
  useEffect(() => {
    if (!preset?.albedo || !material) return;

    const loader = new THREE.TextureLoader();
    loader.load(
      preset.albedo,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        material.map = texture;
        material.needsUpdate = true;
      },
      undefined,
      (err) => {
        console.warn("[useSkinTexture] Failed to load albedo texture:", err);
      }
    );

    return () => {
      // Cleanup: remove texture when preset changes
      if (material.map) {
        material.map.dispose();
        material.map = null;
        material.needsUpdate = true;
      }
    };
  }, [preset?.albedo, material]);

  // Dispose old material when a new one replaces it
  useEffect(() => {
    const old = materialRef.current;
    materialRef.current = material;
    return () => {
      if (old && old !== material) old.dispose();
    };
  }, [material]);

  return material;
}
