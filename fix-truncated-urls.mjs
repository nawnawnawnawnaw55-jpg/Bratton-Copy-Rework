import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAPPING = JSON.parse(fs.readFileSync(path.join(__dirname, 'image-mapping.json'), 'utf-8'));

const remoteUrls = Object.keys(MAPPING);

// Files known to have truncated URLs
const TARGET_FILES = [
  '_sections/medical-library---back.json',
  '_sections/medical-library---foot-&-ankle.json',
  '_sections/medical-library---knee.json',
  '_sections/medical-library---shoulder.json',
  '_sections/medical-library---wrist-&-hand.json',
  '_master-snippets.json',
];

// Build a trie-like prefix map: for any string, find the remoteUrl it's a prefix of
// Also create a reverse lookup: localPath -> remoteUrl
const localToRemote = {};
for (const [remoteUrl, localPath] of Object.entries(MAPPING)) {
  localToRemote[localPath] = remoteUrl;
}

function findMatchingRemoteUrl(truncated) {
  // Find the longest remoteUrl that starts with this truncated prefix
  let best = null;
  for (const url of remoteUrls) {
    if (url.startsWith(truncated)) {
      if (!best || url.length < best.length) {
        best = url;
      }
    }
  }
  return best;
}

function findRemoteUrlFromOriginalHtml(originalHtml) {
  // Check if originalHtml contains any local path from our mapping
  for (const [localPath, remoteUrl] of Object.entries(localToRemote)) {
    if (originalHtml.includes(localPath)) {
      return remoteUrl;
    }
  }
  return null;
}

let totalReplacements = 0;
let totalSnippetsFixed = 0;

for (const file of TARGET_FILES) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`  SKIP (not found): ${file}`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // Parse as JSON to iterate over snippets
  let data;
  try {
    data = JSON.parse(content);
  } catch (e) {
    console.log(`  ERROR parsing ${file}: ${e.message}`);
    continue;
  }

  // Handle _master-snippets.json structure (nested by section)
  function processSnippets(snippetsObj) {
    if (!snippetsObj || typeof snippetsObj !== 'object') return;

    for (const [key, snippet] of Object.entries(snippetsObj)) {
      if (!snippet || !snippet.previewContext) continue;

      const previewContext = snippet.previewContext;
      const originalHtml = snippet.originalHtml || '';

      // Find the remote URL that was replaced in originalHtml
      const remoteUrlFromHtml = findRemoteUrlFromOriginalHtml(originalHtml);

      if (remoteUrlFromHtml) {
        // Now find any truncated version of this remoteUrl in previewContext
        // Try progressively shorter prefixes of the remoteUrl
        for (let len = remoteUrlFromHtml.length; len >= 10; len--) {
          const prefix = remoteUrlFromHtml.substring(0, len);
          if (previewContext.includes(prefix)) {
            // Replace the truncated prefix with the corresponding truncated local path
            const localPath = MAPPING[remoteUrlFromHtml];
            const truncatedLocal = localPath.substring(0, len);

            snippet.previewContext = previewContext.replace(prefix, truncatedLocal);

            // Also update textLength if the replacement changed the length
            if (snippet.textLength !== undefined) {
              const lengthDiff = truncatedLocal.length - prefix.length;
              snippet.textLength += lengthDiff;
            }

            totalReplacements++;
            modified = true;
            console.log(`  ${file} :: ${key}: replaced "${prefix}" -> "${truncatedLocal}"`);
            break; // Only replace the longest match
          }
        }
      } else {
        // Fallback: try to match any truncated ptclinic URL by prefix
        const truncatedMatches = previewContext.match(/https?:\/\/ptclinic\.com\/[^"'\s]*/g);
        if (truncatedMatches) {
          for (const truncatedUrl of truncatedMatches) {
            const fullUrl = findMatchingRemoteUrl(truncatedUrl);
            if (fullUrl && MAPPING[fullUrl]) {
              const localPath = MAPPING[fullUrl];
              snippet.previewContext = previewContext.replace(truncatedUrl, localPath.substring(0, truncatedUrl.length));
              modified = true;
              totalReplacements++;
              console.log(`  ${file} :: ${key} (fallback): "${truncatedUrl}" -> partial local`);
            }
          }
        }
      }
    }
  }

  // Handle different JSON structures
  if (data.snippets) {
    processSnippets(data.snippets);
  } else if (typeof data === 'object') {
    // _master-snippets.json has nested sections
    for (const [sectionKey, sectionData] of Object.entries(data)) {
      if (sectionData && sectionData.snippets) {
        processSnippets(sectionData.snippets);
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    totalSnippetsFixed++;
    console.log(`  SAVED: ${file}`);
  } else {
    console.log(`  NO CHANGES: ${file}`);
  }
}

console.log(`\nDone! ${totalReplacements} URL replacements across ${totalSnippetsFixed} files.`);