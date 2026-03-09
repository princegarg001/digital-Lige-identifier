/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const ANIMATIONS_DIR = __dirname;
const INDEX_JSON_PATH = path.join(ANIMATIONS_DIR, 'index.json');
const EMOTION_MAP_PATH = path.join(ANIMATIONS_DIR, 'emotion_map_full.json');

// --- STRATEGY ---
// 1. Crawl all .glb files in the animations directory to build the base registry.
// 2. Load the emotion_map_full.json for semantic data.
// 3. Merge semantic data into the registry where URLs match.
// 4. Write back to index.json.

function crawlDirectory(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      crawlDirectory(filePath, fileList);
    } else if (file.endsWith('.glb')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function buildBaseRegistry() {
  const glbFiles = crawlDirectory(ANIMATIONS_DIR);
  const registry = {};

  for (const filePath of glbFiles) {
    const relativePath = path.relative(ANIMATIONS_DIR, filePath).replace(/\\/g, '/');
    const url = `/animations/${relativePath}`;
    
    // The previous script created keys like: "masculine_dance_m_dances_001"
    let key = relativePath.split('.')[0].replace(/\//g, '_').toLowerCase();
    
    // Determine type (dance, idle, expression, or misc)
    const lowerPath = relativePath.toLowerCase();
    let type = 'misc';
    if (lowerPath.includes('/dance/') || lowerPath.includes('dance')) {
        type = 'dance';
    } else if (lowerPath.includes('/idle/') || lowerPath.includes('idle')) {
        type = 'idle';
    } else if (lowerPath.includes('/expression') || lowerPath.includes('expression') || lowerPath.includes('talking')) {
        type = 'expression';
    }

    registry[key] = {
      name: key,
      url: url,
      type: type
    };
  }

  return registry;
}

function main() {
  console.log('1) Crawling directory for .glb files...');
  const registry = buildBaseRegistry();
  const totalGlbs = Object.keys(registry).length;
  console.log(`Found ${totalGlbs} .glb files.`);

  console.log('2) Loading emotion_map_full.json...');
  let emotionMapData = [];
  try {
      const content = fs.readFileSync(EMOTION_MAP_PATH, 'utf-8');
      emotionMapData = JSON.parse(content);
  } catch {
      console.warn('Could not load emotion_map_full.json or it is empty. Proceeding without enrichment.');
  }

  let matchCount = 0;

  console.log('3) Merging semantic data into registry...');
  for (const group of emotionMapData) {
    const location = group.location; // e.g., "masculine/dance"
    const animations = group.animations || [];

    for (const animMeta of animations) {
      const filename = animMeta.filename; // e.g., "M_Dances_001"
      // Construct the expected URL matching what is in index.json
      const expectedUrl = `/animations/${location}/${filename}.glb`;

      // Find the corresponding entry in index.json
      let matchedKey = null;
      for (const [key, value] of Object.entries(registry)) {
        if (value.url === expectedUrl || value.url.toLowerCase() === expectedUrl.toLowerCase()) {
          matchedKey = key;
          break;
        }
      }

      if (matchedKey) {
        registry[matchedKey] = {
          ...registry[matchedKey],
          primary_emotion: animMeta.primary_emotion,
          valence: animMeta.valence,
          action: animMeta.action,
          base_posture: animMeta.base_posture,
          intensity: animMeta.intensity,
          description: animMeta.description,
          semantic_tags: animMeta.semantic_tags
        };
        matchCount++;
      } else {
        console.warn(`WARNING: Could not find matching entry in discovered .glb files for ${expectedUrl}`);
      }
    }
  }

  console.log(`Successfully merged metadata for ${matchCount} out of ${totalGlbs} total animations.`);

  // Save the updated index.json
  console.log(`4) Writing updated index.json...`);
  fs.writeFileSync(INDEX_JSON_PATH, JSON.stringify(registry, null, 2), 'utf-8');
  console.log('Done!');
}

main();
