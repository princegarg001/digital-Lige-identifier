import { AnimationRegistry, AnimationMeta } from "./animationRegistry.types";

/**
 * Normalizes text for consistent matching by lowercasing and splitting into core words.
 */
function normalizeText(text: string): string[] {
  if (!text) return [];
  const normalized = text.toLowerCase().replace(/[^\w\s-]/g, ' ');
  return normalized.split(/[\s-]+/).filter(t => t.length > 2 && t !== 'the' && t !== 'and' && t !== 'with');
}

/**
 * Calculates weighted Jaccard similarity between two arrays of tokens.
 * Matches the logic from the fuzzy-matching skill (longer words = higher weight).
 */
function weightedJaccardSimilarity(tokens1: string[], tokens2: string[]): number {
  if (!tokens1.length || !tokens2.length) return 0.0;
  
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  // Give heavier weight to longer, more specific descriptive words
  const weight = (t: string) => t.length >= 5 ? 2.0 : t.length >= 3 ? 1.5 : 1.0;

  let intersectionWeight = 0;
  let unionWeight = 0;

  const union = new Set([...set1, ...set2]);
  
  union.forEach(t => {
    const w = weight(t);
    unionWeight += w;
    if (set1.has(t) && set2.has(t)) {
      intersectionWeight += w;
    }
  });

  return unionWeight === 0 ? 0 : intersectionWeight / unionWeight;
}

/**
 * Quick pre-filter: do items share any salient words?
 */
function hasSalientOverlap(tokens1: string[], tokens2: string[]): boolean {
  const salient1 = tokens1.filter(t => t.length >= 3);
  const salient2 = tokens2.filter(t => t.length >= 3);
  return salient1.some(t => salient2.includes(t));
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
  const nameSim = weightedJaccardSimilarity(intentTokens, nameTokens);
  const tagsSim = weightedJaccardSimilarity(intentTokens, tagTokens);
  const emotionSim = weightedJaccardSimilarity(intentTokens, emotionTokens);
  const actionSim = weightedJaccardSimilarity(intentTokens, actionTokens);
  
  // 3. Final Weighted Score
  return (nameSim * 0.20) + (tagsSim * 0.40) + (emotionSim * 0.25) + (actionSim * 0.15);
}

/**
 * Finds the best matching animation file key for a given semantic intent from the LLM.
 * 
 * Flow:
 * 1. Checks for exact key match (O(1)).
 * 2. Tokenizes the LLM's open-ended request (e.g., "do a happy dance").
 * 3. Iterates over the registry, filtering by basic category matches.
 * 4. Ranks all candidates using multi-factor Jaccard scoring.
 * 5. Returns the highest scored ID, or a random fallback from the category if no words match.
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
    const fallbackCategoryMatches: string[] = []; // e.g. all dances if they asked for 'dance'
    
    // Extract base intent types from request for fallbacks
    const isDanceIntent = intentTokens.includes('dance') || intentTokens.includes('dancing');
    const isExpressionIntent = intentTokens.includes('expression') || intentTokens.includes('talk') || intentTokens.includes('talking');
    
    // 2 & 3. Iterate through registry and score
    for (const key of keys) {
        const anim = registry[key];
        
        // Track basic category matches for fallback
        if (anim.type) {
             if (isDanceIntent && anim.type === 'dance') fallbackCategoryMatches.push(key);
             if (isExpressionIntent && anim.type === 'expression') fallbackCategoryMatches.push(key);
        }
        
        // Calculate Semantic Score utilizing PAD metrics from emotion_map_full.json
        const score = calculateSimilarity(intentTokens, anim);
        
        if (score > highestScore) {
            highestScore = score;
            bestMatchKey = key;
        }
    }
    
    console.log(`[FuzzyMatcher] Intent '${intent}' highest matched score: ${highestScore.toFixed(3)} -> ${bestMatchKey}`);

    // If score is too low/zero, try to use a fallback category from the intent
    if (highestScore === 0) {
        if (fallbackCategoryMatches.length > 0) {
            // Pick random animation of that requested generic category
            const randomPick = fallbackCategoryMatches[Math.floor(Math.random() * fallbackCategoryMatches.length)];
            console.log(`[FuzzyMatcher] No semantic matches for '${intent}'. Falling back to random category match: ${randomPick}`);
            return randomPick;
        }
        
        // Ultimate fallback
        return "idle"; 
    }
    
    return bestMatchKey;
}
