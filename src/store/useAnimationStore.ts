import { create } from "zustand";
import { AnimationRegistry } from "../lib/animationRegistry.types";

interface AnimationState {
  currentAnimation: string;
  registry: AnimationRegistry;
  isTransitioning: boolean;
  isLoadingRegistry: boolean;
  error: Error | null;

  setAnimation: (name: string) => void;
  setTransitioning: (isTransitioning: boolean) => void;
  loadRegistry: (registryData: AnimationRegistry) => void;
  setLoadingRegistry: (isLoading: boolean) => void;
  setError: (error: Error | null) => void;
}

export const useAnimationStore = create<AnimationState>((set) => ({
  currentAnimation: "idle", // Default fallback animation
  registry: {},
  isTransitioning: false,
  isLoadingRegistry: true, // Optimistically true until registry loads
  error: null,

  setAnimation: (name) => set({ currentAnimation: name }),
  setTransitioning: (isTransitioning) => set({ isTransitioning }),
  loadRegistry: (registryData) => set({ registry: registryData, isLoadingRegistry: false }),
  setLoadingRegistry: (isLoading) => set({ isLoadingRegistry: isLoading }),
  setError: (error) => set({ error }),
}));
