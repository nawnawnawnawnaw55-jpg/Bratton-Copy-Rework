/**
 * Cross-reference and fix treatment video badges in v3 child pages
 * Compares against v3 treatment detail pages to determine which have videos
 * Also checks v2 mirror as fallback reference
 * Run: node fix-video-badges.js
 */
const fs = require('fs');
const path = require('path');

const V3_LIBRARY = './bratton-pt-v3/library';
const V2_MIRROR = './bratton-pt-mirror-main';
const DRY_RUN = false;

// ========== STEP 1: Build video availability map from treatment pages ==========
console.log('=== STEP 1: Scanning treatment pages for video presence ===\n');

const treatmentVideoMap = {}; // treatmentID -> { hasVideo: bool, source: string, name: string }

function readTreatmentPage(dirPath, dirName) {
  const indexPath = path.join(dirPath, 'index.html');
  if (!fs.existsSync(indexPath)) return null;
  return fs.readFileSync(indexPath, 'utf8');
}

function checkV3TreatmentVideo(html) {
  // Has g5-mlvideo-wrapper = has video
  if (/g5-mlvideo-wrapper/.test(html)) return true;
  // Has "No Video Available" = no video
  if (/No Video Available/.test(html)) return false;
  // Has a video embed with padding-bottom technique
  if (/padding-bottom:\s*\d+%/.test(html) && /position:relative/.test(html)) {
    // Could be video placeholder or actual video
    if (/No Video|no video/.test(html)) return false;
    return true; // has embed, assume video
  }
  return null; // unknown
}

function checkV2MirrorTreatmentVideo(dirName) {
  const mirrorPath = path.join(V2_MIRROR, dirName, 'index.html');
  if (!fs.existsSync(mirrorPath)) return null;
  const html = fs.readFileSync(mirrorPath, 'utf8');
  if (html.includes('403 Forbidden')) return null;
  if (/g5-mlvideo-wrapper/.test(html)) return true;
  if (/No Video Available/.test(html)) return false;
  if (/class='g5-mlvideo'/.test(html) || /class="g5-mlvideo"/.test(html)) return true;
  return null;
}

// Scan all v3 treatment directories
const v3Dirs = fs.readdirSync(V3_LIBRARY).filter(d => {
  const stat = fs.statSync(path.join(V3_LIBRARY, d));
  return stat.isDirectory() && d.startsWith('library_treatments_') && /\d+$/.test(d);
});

for (const dir of v3Dirs) {
  const idMatch = dir.match(/(\d+)$/);
  if (!idMatch) continue;
  const treatmentId = parseInt(idMatch[1]);
  
  const html = readTreatmentPage(path.join(V3_LIBRARY, dir), dir);
  if (!html) continue;
  
  // Extract treatment name
  const nameMatch = html.match(/<h1>(.*?)<\/h1>/);
  const name = nameMatch ? nameMatch[1].trim() : `Treatment ${treatmentId}`;
  
  let hasVideo = checkV3TreatmentVideo(html);
  let source = 'v3';
  
  // If v3 is ambiguous, check v2 mirror
  if (hasVideo === null) {
    hasVideo = checkV2MirrorTreatmentVideo(dir);
    source = hasVideo !== null ? 'v2-mirror' : 'unknown';
  }
  
  treatmentVideoMap[treatmentId] = { hasVideo, source, name };
  
  const status = hasVideo === true ? 'HAS VIDEO' : hasVideo === false ? 'NO VIDEO' : 'UNKNOWN';
  console.log(`  Treatment ${treatmentId} (${dir}): ${status} — "${name}" [source: ${source}]`);
}

console.log(`\nTotal treatment pages scanned: ${Object.keys(treatmentVideoMap).length}`);
const hasVideoCount = Object.values(treatmentVideoMap).filter(v => v.hasVideo === true).length;
const noVideoCount = Object.values(treatmentVideoMap).filter(v => v.hasVideo === false).length;
const unknownCount = Object.values(treatmentVideoMap).filter(v => v.hasVideo === null).length;
console.log(`  Has video: ${hasVideoCount}, No video: ${noVideoCount}, Unknown: ${unknownCount}\n`);

// ========== STEP 2: Scan child pages and fix video badges ==========
console.log('=== STEP 2: Scanning child pages and fixing video badges ===\n');

const childDirs = fs.readdirSync(V3_LIBRARY).filter(d => {
  const stat = fs.statSync(path.join(V3_LIBRARY, d));
  if (!stat.isDirectory()) return false;
  // Child = library_BODY_NUMBER pattern (has numeric suffix)
  const parts = d.split('_');
  if (parts.length < 3) return false;
  // Not a treatment page
  if (d.startsWith('library_treatments_')) return false;
  // Must end with a number
  return /\d+$/.test(d);
});

let totalFixed = 0;
let totalChecked = 0;

function extractTreatmentLinks(html) {
  // Match <li><a href="/library/library_treatments_N/">...content...</a></li>
  const regex = /<li>\s*<a href="\/library\/library_treatments_(\d+)\/">([\s\S]*?)<\/a>\s*<\/li>/g;
  const links = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    const treatmentId = parseInt(match[1]);
    const fullLinkContent = match[2];
    const fullMatch = match[0];
    
    // Check if already has video badge
    const hasVideoBadge = /<span class="video-badge">.*?<\/span>/.test(fullLinkContent);
    
    // Extract treatment name (without badge)
    const nameClean = fullLinkContent.replace(/<span class="video-badge">.*?<\/span>/, '').trim();
    
    links.push({
      treatmentId,
      nameClean,
      hasVideoBadge,
      fullMatch,
      startIndex: match.index,
      endIndex: match.index + match[0].length
    });
  }
  return links;
}

for (const dir of childDirs) {
  const filePath = path.join(V3_LIBRARY, dir, 'index.html');
  if (!fs.existsSync(filePath)) continue;
  
  let html = fs.readFileSync(filePath, 'utf8');
  const originalHtml = html;
  const links = extractTreatmentLinks(html);
  
  if (links.length === 0) continue;
  
  totalChecked += links.length;
  let pageHadFixes = false;
  
  for (const link of links) {
    const tvInfo = treatmentVideoMap[link.treatmentId];
    if (!tvInfo || tvInfo.hasVideo === null) {
      // Unknown — skip, don't guess
      continue;
    }
    
    const shouldHaveBadge = tvInfo.hasVideo === true;
    
    if (shouldHaveBadge && !link.hasVideoBadge) {
      // Missing video badge — add it
      const newLink = link.fullMatch.replace(
        /(<\/a>\s*<\/li>)/,
        ' <span class="video-badge">▶ Video</span>$1'
      );
      html = html.replace(link.fullMatch, newLink);
      console.log(`  FIX ${dir}: Added video badge to treatment ${link.treatmentId} (${tvInfo.name})`);
      pageHadFixes = true;
      totalFixed++;
    } else if (!shouldHaveBadge && link.hasVideoBadge) {
      // Incorrect video badge — remove it
      const newLink = link.fullMatch.replace(
        /\s*<span class="video-badge">.*?<\/span>/,
        ''
      );
      html = html.replace(link.fullMatch, newLink);
      console.log(`  FIX ${dir}: Removed video badge from treatment ${link.treatmentId} (${tvInfo.name})`);
      pageHadFixes = true;
      totalFixed++;
    }
  }
  
  if (pageHadFixes && !DRY_RUN) {
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`  → Saved ${dir}/index.html\n`);
  } else if (pageHadFixes && DRY_RUN) {
    console.log(`  → [DRY RUN] Would save ${dir}/index.html\n`);
  }
}

console.log(`\n=== COMPLETE ===`);
console.log(`Total treatment links checked: ${totalChecked}`);
console.log(`Total video badges fixed: ${totalFixed}`);
console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no files changed)' : 'LIVE (files saved)'}`);