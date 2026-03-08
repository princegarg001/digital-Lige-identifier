import { create } from "zustand";
import { AnimationRegistry } from "../lib/animationRegistry.types";

export interface QueuedAnimation {
  id: string; // Unique ID to force React reactivity even if same animation repeats
  name: string;
  durationMs?: number;
}

interface AnimationState {
  currentAnimation: string; // Resolves to the active item in the queue
  animationQueue: QueuedAnimation[];
  registry: AnimationRegistry;
  isTransitioning: boolean;
  isLoadingRegistry: boolean;
  error: Error | null;

  setAnimation: (name: string) => void;
  playSequence: (sequence: Omit<QueuedAnimation, 'id'>[]) => void;
  advanceQueue: () => void;
  clearSequence: () => void;

  setTransitioning: (isTransitioning: boolean) => void;
  loadRegistry: (registryData: AnimationRegistry) => void;
  setLoadingRegistry: (isLoading: boolean) => void;
  setError: (error: Error | null) => void;
}

export const useAnimationStore = create<AnimationState>((set) => ({
  currentAnimation: "idle",
  animationQueue: [],
  registry: {},
  isTransitioning: false,
  isLoadingRegistry: true,
  error: null,

  // Absolute override (clears queue)
  setAnimation: (name) => set({ currentAnimation: name, animationQueue: [] }),
  
  // Stacks a sequence of animations
  playSequence: (sequenceParams) => set((state) => {
    const sequence: QueuedAnimation[] = sequenceParams.map(p => ({
       ...p,
       id: Math.random().toString(36).substring(7)
    }));
    
    // Append to existing queue so we don't interrupt ongoing sequences
    const newQueue = [...state.animationQueue, ...sequence];
    
    return {
      animationQueue: newQueue,
      // If we were idling, immediately jump to the first queued item
      currentAnimation: state.currentAnimation === "idle" && newQueue.length > 0 
        ? newQueue[0].name 
        : state.currentAnimation
    };
  }),

  // Moves to the next animation in the sequence, returns to idle if empty
  advanceQueue: () => set((state) => {
    if (state.animationQueue.length <= 1) {
      return { animationQueue: [], currentAnimation: "idle" }; // Finished queue
    }
    const nextQueue = state.animationQueue.slice(1);
    return { animationQueue: nextQueue, currentAnimation: nextQueue[0].name };
  }),

  clearSequence: () => set({ animationQueue: [], currentAnimation: "idle" }),

  setTransitioning: (isTransitioning) => set({ isTransitioning }),
  loadRegistry: (registryData) => set({ registry: registryData, isLoadingRegistry: false }),
  setLoadingRegistry: (isLoading) => set({ isLoadingRegistry: isLoading }),
  setError: (error) => set({ error }),
}));
