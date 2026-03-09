import { phonemize } from 'phonemize';
import { phonemeToVisemeMap } from './viseme-map';

export interface ScheduledViseme {
  /** Expected duration of this viseme. */
  durationMs: number;
  viseme: string;
  weight: number;
}
/**
 * PhonemeGenerator
 * Converts English text into phonemes and maps them to a viseme timeline.
 */
export class PhonemeGenerator {
  
  /**
   * Returns a sequence of ScheduledVisemes with estimated natural durations.
   * This timeline is concatenated by the VisemeScheduler.
   */
  public generate(text: string): ScheduledViseme[] {
    const phonemesStr = phonemize(text);
    if (!phonemesStr) return [];
    
    // Depending on phonemize output format, we might need to clean/split it.
    const phonemes = phonemesStr.split(/[ -]/).filter(Boolean);
    
    const timeline: ScheduledViseme[] = [];
    
    for (const p of phonemes) {
      const key = p.toUpperCase().replace(/[^A-Z]/g, ''); 
      const viseme = phonemeToVisemeMap[key] || 'viseme_sil';
      
      // Assign realistic phoneme durations
      let durationMs = 80;
      if (viseme === 'viseme_sil') {
         durationMs = 250; // pause
      } else if (['viseme_aa', 'viseme_O', 'viseme_U', 'viseme_I', 'viseme_E'].includes(viseme)) {
         durationMs = 100; // vowels are held slightly longer
      } else {
         durationMs = 60; // crisp consonants
      }

      timeline.push({
        durationMs,
        viseme,
        weight: viseme === 'viseme_sil' ? 0 : 0.8 + Math.random() * 0.2 // subtle variation
      });
    }

    // Add brief silence at the end of the chunk
    timeline.push({
      durationMs: 150,
      viseme: 'viseme_sil',
      weight: 0
    });

    return timeline;
  }
}
