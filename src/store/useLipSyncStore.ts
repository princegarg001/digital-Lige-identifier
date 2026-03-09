import { create } from 'zustand';
import type { Lipsync } from 'wawa-lipsync';

interface LipSyncStore {
  wawaLipsync: Lipsync | null;
  setWawaLipsync: (wawa: Lipsync) => void;
  clear: () => void;
}

export const useLipSyncStore = create<LipSyncStore>((set) => ({
  wawaLipsync: null,
  
  setWawaLipsync: (wawa) => {
     set({ wawaLipsync: wawa });
  },

  clear: () => {
    // Currently no internal timeline to clear, managed strictly by AudioStreamer
  }
}));
