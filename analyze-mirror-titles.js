const fs = require('fs');
const path = require('path');

const MIRROR = 'bratton-pt-mirror-main';

// Get all library dirs
const allDirs = fs.readdirSync(MIRROR).filter(d => {
  const full = path.join(MIRROR, d);
  return d.startsWith('library_') && fs.statSync(full).isDirectory();
});
console.log('Total library dirs:', allDirs.length);

// Find parent dirs (those with fewer underscores = base categories)
const baseParents = allDirs.filter(d => {
  const parts = d.split('_');
  return parts.length <= 3; // library_neck, library_shoulder, library_treatments, etc.
});
console.log('\nBase parent dirs:', baseParents.length);
baseParents.sort().forEach(d => console.log(' ', d));

// For each parent, extract the child links
console.log('\n=== CHILD LINK EXTRACTION ===\n');
baseParents.forEach(parentDir => {
  const file = path.join(MIRROR, parentDir, 'index.html');
  if (!fs.existsSync(file)) return;
  
  const raw = fs.readFileSync(file, 'utf8');
  // Find links like <a href='/library_xxx/'>Link Text</a>
  const linkRegex = /href=['"]\/library_([^'"]+\d+)['"]>([^<]+)<\/a>/gi;
  const links = [...raw.matchAll(linkRegex)];
  
  if (links.length > 0) {
    console.log(`\n${parentDir}:`);
    links.slice(0, 8).forEach(m => {
      console.log(`  library_${m[1]} -> "${m[2].trim()}"`);
    });
    if (links.length > 8) console.log(`  ... and ${links.length - 8} more`);
  }
});

// Now check: for child pages with content, what are the real H4 titles?
console.log('\n=== CHILD PAGE H4 TITLES ===\n');
allDirs.filter(d => d.split('_').length > 3).slice(0, 20).forEach(dir => {
  const file = path.join(MIRROR, dir, 'index.html');
  if (!fs.existsSync(file)) return;
  const raw = fs.readFileSync(file, 'utf8');
  if (raw.includes('403 Forbidden')) return;
  
  // Find H4 in article content
  const h4Match = raw.match(/<h4[^>]*>([^<]+)<\/h4>/i);
  if (h4Match) {
    console.log(`  ${dir}: H4="${h4Match[1].trim()}"`);
  }
});