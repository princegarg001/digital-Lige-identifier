"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import initialConfig from "@/config/camera.json";
import { type AvatarEntry, DEFAULT_AVATARS, fetchAvatarRegistry } from "@/lib/avatars";

/* ─── Types ────────────────────────────────────────────────────────────────── */

export interface LightConfig {
  position: [number, number, number];
  intensity: number;
  color: string;
}

export interface SceneConfig {
  camera: {
    position: [number, number, number];
    fov: number;
    target: [number, number, number];
  };
  avatar: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: number;
    model: string;
  };
  lighting: {
    keyLight: LightConfig;
    fillLight: LightConfig;
    rimLight: LightConfig;
  };
  features: FeatureToggles;
}

export interface FeatureToggles {
  lipSync: boolean;
  breathing: boolean;
  gazeDrift: boolean;
  blinking: boolean;
  hoverEffect: boolean;
}

interface SceneConfigContextValue {
  config: SceneConfig;
  updateConfig: (patch: Partial<SceneConfig>) => void;
  setConfig: (full: SceneConfig) => void;
  toggleFeature: (key: keyof FeatureToggles) => void;
  avatarRegistry: AvatarEntry[];
}

/* ─── Defaults ─────────────────────────────────────────────────────────────── */

const DEFAULT_FEATURES: FeatureToggles = {
  lipSync: true,
  breathing: true,
  gazeDrift: true,
  blinking: true,
  hoverEffect: true,
};

const SceneConfigCtx = createContext<SceneConfigContextValue | null>(null);

/* ─── Provider ─────────────────────────────────────────────────────────────── */

export function SceneConfigProvider({ children }: { children: ReactNode }) {
  // Ensure default features exist if loading from older JSON without them
  const initial: SceneConfig = {
    ...initialConfig,
    features: {
      ...DEFAULT_FEATURES,
      ...((initialConfig as Record<string, unknown>).features as Partial<FeatureToggles> || {}),
    },
  } as SceneConfig;

  const [config, _setConfig] = useState<SceneConfig>(initial);

  const updateConfig = useCallback((patch: Partial<SceneConfig>) => {
    _setConfig((prev) => ({
      ...prev,
      ...patch,
      camera: patch.camera ? { ...prev.camera, ...patch.camera } : prev.camera,
      avatar: patch.avatar ? { ...prev.avatar, ...patch.avatar } : prev.avatar,
      lighting: patch.lighting ? { ...prev.lighting, ...patch.lighting } : prev.lighting,
      features: patch.features ? { ...prev.features, ...patch.features } : prev.features,
    }));
  }, []);

  const setConfig = useCallback((full: SceneConfig) => {
    _setConfig(full);
  }, []);

  const toggleFeature = useCallback((key: keyof FeatureToggles) => {
    _setConfig((prev) => ({
      ...prev,
      features: { ...prev.features, [key]: !prev.features[key] },
    }));
  }, []);

  // Load avatar registry from public/avatars/index.json
  const [avatarRegistry, setAvatarRegistry] = useState<AvatarEntry[]>(DEFAULT_AVATARS);
  useEffect(() => {
    fetchAvatarRegistry().then(setAvatarRegistry);
  }, []);

  return (
    <SceneConfigCtx.Provider
      value={{ config, updateConfig, setConfig, toggleFeature, avatarRegistry }}
    >
      {children}
    </SceneConfigCtx.Provider>
  );
}

/* ─── Hook ─────────────────────────────────────────────────────────────────── */

export function useSceneConfig() {
  const ctx = useContext(SceneConfigCtx);
  if (!ctx) throw new Error("useSceneConfig must be used within <SceneConfigProvider>");
  return ctx;
}
