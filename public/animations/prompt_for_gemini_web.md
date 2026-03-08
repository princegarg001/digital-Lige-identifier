# Advanced Gemini Vision Prompt for Animation Analysis

I am building an intelligent 3D digital persona system and need your help analyzing its raw animation files.
I have attached a batch of `.webp` files. Each file demonstrates a unique 3D avatar animation (movement, gesture, dance, or expression).

For **every single image attached**, please act as an expert animator and behavioral psychologist. Watch the animation carefully, and generate a highly detailed semantic profile. 

Output your analysis as a **single, valid JSON array** containing an object for each animation. Use the schema described below.

### Expected JSON Schema:
```json
[
  {
    "filename": "F_Dances_001", // The EXACT filename without the .webp extension
    "primary_emotion": "playful", // The core feeling (e.g., happy, sad, thoughtful, aggressive)
    "valence": "positive", // Is the emotion fundamentally positive, negative, or neutral?
    "action": "dancing", // The physical verb happening (e.g., dancing, nodding, shrugging, walking)
    "base_posture": "standing", // The starting physical posture (e.g., standing, sitting, walking, crouched)
    "intensity": 6, // An integer 1-10 describing the physical energy of the movement
    "description": "A highly energetic, continuous bouncing dance with sweeping arm movements", // 1 sentence precise description
    "semantic_tags": ["dance", "fluid", "feminine", "rhythmic", "graceful", "casual", "groove"] // 5-8 descriptive keyword tags for our fuzzy matching algorithm to score against
  }
]
```

### Strict Output Constraints:
1. ONLY output the raw, valid JSON array. Do not enclose it in ```json blocks or provide any conversational filler.
2. Ensure you create an object for *every single attached file*.
3. Be as descriptive and precise as possible with your `semantic_tags`. We are using these tags to fuzzy-match open-ended AI intent (e.g., if a user tells the avatar "do a silly jig", it needs to match against "silly", "dance", etc).
