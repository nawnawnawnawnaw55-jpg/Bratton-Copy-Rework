const fs = require('fs');
const path = require('path');

const v3LibDir = 'bratton-pt-v3/library';
const v2LibDir = 'bratton-pt-mirror-main';

const dirs = fs.readdirSync(v3LibDir, { withFileTypes: true }).filter(d => d.isDirectory());

// Known good patterns - pages that have tab content in articleArea
const results = [];

dirs.forEach(d => {
  const v3Path = path.join(v3LibDir, d.name, 'index.html');
  if (!fs.existsSync(v3Path)) {
    results.push({ dir: d.name, status: 'NO_INDEX', pTags: 0, hasContent: false, hasTabs: false, hasVideo: false });
    return;
  }
  const c = fs.readFileSync(v3Path, 'utf8');
  
  // Extract the article content area (between h1 and the body-links/disclaimer section)
  const h1End = c.indexOf('</h1>');
  const disclaimerStart = c.indexOf('Disclaimer');
  const articleSection = h1End >= 0 && disclaimerStart > h1End ? c.substring(h1End, disclaimerStart) : '';
  
  const pTags = (articleSection.match(/<p[^>]*>/g) || []).length;
  const hasTabs = articleSection.includes('ml-tab');
  const hasVideo = articleSection.includes('ml-video-wrap');
  
  // A page "has content" if it has actual article paragraphs or tabs or video
  const hasContent = pTags >= 2 || hasTabs || hasVideo;
  
  // Check if it has lingering v2 markup
  const hasV2Markup = articleSection.includes('uk-tab') || articleSection.includes('listtext') || articleSection.includes('articleArea');
  
  results.push({
    dir: d.name,
    status: hasContent ? (hasV2Markup ? 'NEEDS_CLEANUP' : 'OK') : 'MISSING_CONTENT',
    pTags,
    hasContent,
    hasTabs,
    hasVideo,
    hasV2Markup
  });
});

// Sort: missing content first
results.sort((a, b) => {
  const order = { 'NO_INDEX': 0, 'MISSING_CONTENT': 1, 'NEEDS_CLEANUP': 2, 'OK': 3 };
  return (order[a.status] || 4) - (order[b.status] || 4);
});

console.log('=== LIBRARY PAGE AUDIT ===\n');
results.forEach(r => {
  const icon = r.status === 'OK' ? '✓' : r.status === 'MISSING_CONTENT' ? '✗' : r.status === 'NEEDS_CLEANUP' ? '⚠' : '○';
  console.log(`${icon} ${r.dir.padEnd(40)} ${r.status.padEnd(18)} p:${String(r.pTags).padStart(2)} tabs:${r.hasTabs} video:${r.hasVideo}`);
});

const missing = results.filter(r => r.status === 'MISSING_CONTENT' || r.status === 'NO_INDEX');
const needsCleanup = results.filter(r => r.status === 'NEEDS_CLEANUP');
const ok = results.filter(r => r.status === 'OK');

console.log(`\n=== SUMMARY ===`);
console.log(`Total: ${results.length}`);
console.log(`  OK: ${ok.length}`);
console.log(`  Needs Cleanup: ${needsCleanup.length}`);
console.log(`  Missing Content: ${missing.length}`);
console.log(`  No Index: ${results.filter(r => r.status === 'NO_INDEX').length}`);

// Output missing list for processing
console.log(`\n=== MISSING CONTENT PAGES ===`);
missing.forEach(r => console.log(`  ${r.dir}`));