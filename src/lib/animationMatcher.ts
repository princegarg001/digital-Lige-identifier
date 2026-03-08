import { AnimationRegistry, AnimationMeta } from "./animationRegistry.types";

/**
 * Basic Porter-style suffix stripping for robust matching (e.g., 'dancing' -> 'danc')
 */
function simpleStem(word: string): string {
    const w = word.toLowerCase();
    if (w.length <= 3) return w;
    if (w.endsWith('ing')) return w.slice(0, -3);
    if (w.endsWith('ed')) return w.slice(0, -2);
    if (w.endsWith('es')) return w.slice(0, -2);
    if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
    return w;
}

/**
 * Levenshtein distance for string typo correction
 */
function levenshteinSimilarity(s: string, t: string): number {
    if (!s.length) return t.length === 0 ? 1 : 0;
    if (!t.length) return 0;
    
    const matrix = [];
    for (let i = 0; i <= t.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= s.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= t.length; i++) {
        for (let j = 1; j <= s.length; j++) {
            if (t.charAt(i - 1) === s.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }
    
    const maxLen = Math.max(s.length, t.length);
    const distance = matrix[t.length][s.length];
    return 1 - (distance / maxLen);
}

/**
 * Normalizes text for consistent matching by lowercasing and splitting into core words.
 */
function normalizeText(text: string): string[] {
  if (!text) return [];
  const normalized = text.toLowerCase().replace(/[^\w\s-]/g, ' ');
  return normalized.split(/[\s-]+/).filter(t => t.length > 2 && t !== 'the' && t !== 'and' && t !== 'with');
}

/**
 * True if tokens match literally, by stem, or by >80% Levenshtein similarity (typos)
 */
function isHybridMatch(t1: string, t2: string): boolean {
    if (t1 === t2) return true;
    if (simpleStem(t1) === simpleStem(t2)) return true;
    if (levenshteinSimilarity(t1, t2) >= 0.8) return true;
    return false;
}

/**
 * Calculates weighted Jaccard similarity between two arrays of tokens using Hybrid Matches.
 */
function weightedHybridJaccardSimilarity(tokens1: string[], tokens2: string[]): number {
  if (!tokens1.length || !tokens2.length) return 0.0;
  
  // Give heavier weight to longer, more specific descriptive words
  const weight = (t: string) => t.length >= 5 ? 2.0 : t.length >= 3 ? 1.5 : 1.0;

  let intersectionWeight = 0;
  let unionWeight = 0;

  // Use a string set for union to avoid massive duplication
  const unionSet = new Set([...tokens1, ...tokens2]);
  const union = Array.from(unionSet);
  
  union.forEach(t => {
    const w = weight(t);
    unionWeight += w;
    
    const hasInT1 = tokens1.some(t1 => isHybridMatch(t, t1));
    const hasInT2 = tokens2.some(t2 => isHybridMatch(t, t2));
    
    if (hasInT1 && hasInT2) {
      intersectionWeight += w;
    }
  });

  return unionWeight === 0 ? 0 : intersectionWeight / unionWeight;
}

/**
 * Quick pre-filter: do items share any salient words (checking hybrid stems)?
 */
function hasSalientOverlap(tokens1: string[], tokens2: string[]): boolean {
  const salient1 = tokens1.filter(t => t.length >= 3);
  const salient2 = tokens2.filter(t => t.length >= 3);
  return salient1.some(t1 => salient2.some(t2 => isHybridMatch(t1, t2)));
}

/**
 * Calculates the multi-factor similarity score between an LLM's requested string and an animation profile.
 */
function calculateSimilarity(intentTokens: string[], anim: AnimationMeta): number {
  if (!anim) return 0;
  
  // Extract all searchable text from the animation metadata
  const nameTokens = normalizeText(anim.name || "");
  const emotionTokens = normalizeText(anim.primary_emotion || "");
  const actionTokens = normalizeText(anim.action || "");
  const tagTokens = (anim.semantic_tags || []).flatMap(t => normalizeText(t));
  const descTokens = normalizeText(anim.description || "");
  
  // Combine all animation tokens into a single heavily-weighted semantic profile
  const semanticProfile = [
      ...emotionTokens, 
      ...actionTokens, 
      ...tagTokens,
      ...descTokens
  ];
  
  // 1. Salient Overlap Filter - if there are absolutely no shared words, don't bother scoring deeply
  if (!hasSalientOverlap(intentTokens, [...nameTokens, ...semanticProfile])) {
    return 0;
  }

  // 2. Multi-Factor Scoring Weightings
  // Giving massive priority to semantic tags and primary actions
  const nameSim = weightedHybridJaccardSimilarity(intentTokens, nameTokens);
  const tagsSim = weightedHybridJaccardSimilarity(intentTokens, tagTokens);
  const emotionSim = weightedHybridJaccardSimilarity(intentTokens, emotionTokens);
  const actionSim = weightedHybridJaccardSimilarity(intentTokens, actionTokens);
  
  // 3. Final Weighted Score
  return (nameSim * 0.20) + (tagsSim * 0.40) + (emotionSim * 0.25) + (actionSim * 0.15);
}

/**
 * Finds the best matching animation file key for a given semantic intent from the LLM.
 */
export function findBestAnimationMatch(intent: string, registry: AnimationRegistry): string {
    const keys = Object.keys(registry);
    if (!keys.length) return "idle";
    
    const cleanIntent = intent.trim().toLowerCase();
    
    // 1. Direct key match (O(1)) - Fast path
    if (registry[cleanIntent]) {
        console.log(`[FuzzyMatcher] Exact match found for '${intent}'`);
        return cleanIntent;
    }
    
    // Normalize intent for fuzzy matching
    const intentTokens = normalizeText(intent);
    if (intentTokens.length === 0) return "idle";
    
    // Setup Tracking Variables
    let bestMatchKey = "idle";
    let highestScore = 0;
    const fallbackCategoryMatches: string[] = []; 
    
    const isDanceIntent = intentTokens.some(t => isHybridMatch(t, 'dance'));
    const isExpressionIntent = intentTokens.some(t => isHybridMatch(t, 'talk') || isHybridMatch(t, 'expression'));
    
    // 2 & 3. Iterate through registry and score
    for (const key of keys) {
        const anim = registry[key];
        
        if (anim.type) {
             if (isDanceIntent && anim.type === 'dance') fallbackCategoryMatches.push(key);
             if (isExpressionIntent && anim.type === 'expression') fallbackCategoryMatches.push(key);
        }
        
        const score = calculateSimilarity(intentTokens, anim);
        
        if (score > highestScore) {
            highestScore = score;
            bestMatchKey = key;
        }
    }
    
    console.log(`[FuzzyMatcher] Intent '${intent}' highest matched score: ${highestScore.toFixed(3)} -> ${bestMatchKey}`);

    if (highestScore === 0) {
        if (fallbackCategoryMatches.length > 0) {
            const randomPick = fallbackCategoryMatches[Math.floor(Math.random() * fallbackCategoryMatches.length)];
            console.log(`[FuzzyMatcher] No semantic matches for '${intent}'. Falling back to random category match: ${randomPick}`);
            return randomPick;
        }
        return "idle"; 
    }
    
    return bestMatchKey;
}
