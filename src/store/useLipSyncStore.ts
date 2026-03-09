import { create } from 'zustand';
import { VisemeScheduler } from '@/lib/viseme-scheduler';
import { PhonemeGenerator } from '@/lib/phoneme-generator';
import type { Lipsync } from 'wawa-lipsync';

interface LipSyncStore {
  scheduler: VisemeScheduler;
  generator: PhonemeGenerator;
  wawaLipsync: Lipsync | null;
  setWawaLipsync: (wawa: Lipsync) => void;
  scheduleText: (text: string) => void;
  clear: () => void;
}

export const useLipSyncStore = create<LipSyncStore>((set, get) => ({
  scheduler: new VisemeScheduler(),
  generator: new PhonemeGenerator(),
  wawaLipsync: null,
  
  setWawaLipsync: (wawa) => {
     set({ wawaLipsync: wawa });
  },

  scheduleText: (text: string) => {
    const { scheduler, generator } = get();
    // 1. Generate estimated natural phonemes from the incoming text
    const visemes = generator.generate(text);
    // 2. Schedule them on the global timeline starting from right now (handled inside schedule)
    scheduler.schedule(visemes, Date.now());
  },

  clear: () => {
    const { scheduler } = get();
    // If the avatar is interrupted, clear the pending visemes
    scheduler.clear(); 
  }
}));
