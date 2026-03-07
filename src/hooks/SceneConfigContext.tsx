"use client";

import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import initialConfig from "@/config/camera.json";

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
  };
  lighting: {
    keyLight: LightConfig;
    fillLight: LightConfig;
    rimLight: LightConfig;
  };
}

export interface FeatureToggles {
  lipSync: boolean;
  breathing: boolean;
  gazeDrift: boolean;
  blinking: boolean;
  hoverSmile: boolean;
}

interface SceneConfigContextValue {
  config: SceneConfig;
  features: FeatureToggles;
  updateConfig: (patch: Partial<SceneConfig>) => void;
  setConfig: (full: SceneConfig) => void;
  toggleFeature: (key: keyof FeatureToggles) => void;
  setFeatures: (f: FeatureToggles) => void;
}

/* ─── Defaults ─────────────────────────────────────────────────────────────── */

const DEFAULT_FEATURES: FeatureToggles = {
  lipSync: true,
  breathing: true,
  gazeDrift: true,
  blinking: true,
  hoverSmile: true,
};

const SceneConfigCtx = createContext<SceneConfigContextValue | null>(null);

/* ─── Provider ─────────────────────────────────────────────────────────────── */

export function SceneConfigProvider({ children }: { children: ReactNode }) {
  const [config, _setConfig] = useState<SceneConfig>(initialConfig as SceneConfig);
  const [features, setFeatures] = useState<FeatureToggles>(DEFAULT_FEATURES);

  const updateConfig = useCallback((patch: Partial<SceneConfig>) => {
    _setConfig((prev) => ({
      ...prev,
      ...patch,
      // Deep merge nested objects
      camera: patch.camera ? { ...prev.camera, ...patch.camera } : prev.camera,
      avatar: patch.avatar ? { ...prev.avatar, ...patch.avatar } : prev.avatar,
      lighting: patch.lighting ? { ...prev.lighting, ...patch.lighting } : prev.lighting,
    }));
  }, []);

  const setConfig = useCallback((full: SceneConfig) => {
    _setConfig(full);
  }, []);

  const toggleFeature = useCallback((key: keyof FeatureToggles) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <SceneConfigCtx.Provider
      value={{ config, features, updateConfig, setConfig, toggleFeature, setFeatures }}
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
