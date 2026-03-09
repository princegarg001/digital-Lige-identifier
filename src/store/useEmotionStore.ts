import { create } from 'zustand';
import Sentiment from 'sentiment';

interface EmotionStore {
  sentimentAnalyzer: Sentiment;
  currentScore: number;
  analyzeText: (text: string) => void;
}

export const useEmotionStore = create<EmotionStore>((set, get) => ({
  sentimentAnalyzer: new Sentiment(),
  currentScore: 0,
  
  analyzeText: (text: string) => {
    if (!text.trim()) return;
    const { sentimentAnalyzer } = get();
    // Calculate sentiment score. comparative is normalized by word count.
    const result = sentimentAnalyzer.analyze(text);
    
    // Only update if it found meaningful words
    if (result.words.length > 0) {
      set({ currentScore: result.comparative });
    }
  }
}));
