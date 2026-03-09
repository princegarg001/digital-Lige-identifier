import { OCULUS_VISEMES } from './viseme-map';
import type { ScheduledViseme } from './phoneme-generator';

export class VisemeScheduler {
  private timeline: { timeMs: number, viseme: string, weight: number }[] = [];
  private lastScheduledTimeMs: number = 0;
  
  /**
   * Schedules a sequence of visemes to play concurrently with the audio.
   * By concatenating new schedules onto the end of the previous schedule,
   * we prevent rapid text chunks from overwriting each other.
   * 
   * @param newVisemes The natural duration viseme sequence
   * @param currentTimeMs The current AudioContext time or Date.now()
   */
  public schedule(newVisemes: ScheduledViseme[], currentTimeMs: number = Date.now()) {
    // Start either right now, or at the end of the last scheduled chunk, whichever is later.
    // This allows a fast burst of text to queue up seamlessly.
    let startMs = Math.max(currentTimeMs, this.lastScheduledTimeMs);
    
    // Safety check: if audio has progressed way past the last scheduled text,
    // don't schedule new text in the past. Always jump forward to current time.
    if (this.lastScheduledTimeMs < currentTimeMs) {
       startMs = currentTimeMs;
    }

    const adjusted = newVisemes.map(v => {
      const event = {
        timeMs: startMs,
        viseme: v.viseme,
        weight: v.weight
      };
      startMs += v.durationMs;
      return event;
    });
    
    this.timeline.push(...adjusted);
    // Sort chronology in case of any overlap quirks
    this.timeline.sort((a, b) => a.timeMs - b.timeMs);
    
    this.lastScheduledTimeMs = startMs;
  }

  /**
   * Get the interpolated weights for all oculous visemes at the given playback time.
   */
  public getWeights(currentTimeMs: number): Record<string, number> {
    const weights = Object.fromEntries(OCULUS_VISEMES.map(v => [v, 0]));
    
    // Find current active viseme block based on the real-time AudioContext current time
    let currentIndex = -1;
    for (let i = 0; i < this.timeline.length; i++) {
       const tMs = this.timeline[i].timeMs || 0;
       if (currentTimeMs >= tMs) {
          currentIndex = i;
       } else {
          break;
       }
    }

    if (currentIndex >= 0 && currentIndex < this.timeline.length) {
      const current = this.timeline[currentIndex];
      const curTimeMs = current.timeMs || 0;
      weights[current.viseme] = current.weight;
      
      // Co-articulation / anticipation of the next phoneme
      if (currentIndex + 1 < this.timeline.length) {
         const next = this.timeline[currentIndex + 1];
         const nxtTimeMs = next.timeMs || 0;
         const diff = nxtTimeMs - curTimeMs;
         // If the next phoneme happens within 200ms, start blending it early
         if (diff > 0 && diff <= 200) {
            const progress = (currentTimeMs - curTimeMs) / diff;
            weights[next.viseme] += next.weight * Math.pow(progress, 2); // easing
         }
      }
    }

    // Clean up old timeline entries (keep last 5 for safety)
    if (currentIndex > 20) {
      this.timeline = this.timeline.slice(currentIndex - 5);
    }
    
    return weights;
  }

  /**
   * Clear the timeline (e.g. on interruption)
   */
  public clear() {
     this.timeline = [];
     this.lastScheduledTimeMs = 0;
  }
}
