const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'Bratton-Copy-Rework', '_preview-context');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

let totalFiles = 0;
let filesWithBrokenRefs = 0;
const brokenByType = {};

files.forEach(f => {
  const c = fs.readFileSync(path.join(dir, f), 'utf8');
  totalFiles++;
  
  // Find all src= and href= attributes
  const refs = [];
  const srcRe = /(?:src|href)\s*=\s*["']([^"']+)["']/g;
  let m;
  while ((m = srcRe.exec(c)) !== null) {
    refs.push({ attr: m[0].startsWith('src') ? 'src' : 'href', value: m[1] });
  }
  
  // Check each ref
  refs.forEach(r => {
    if (r.value.startsWith('http://') || r.value.startsWith('https://') || r.value.startsWith('//')) {
      // External URLs are fine
      return;
    }
    if (r.value.startsWith('data:')) {
      // Data URIs are fine
      return;
    }
    if (r.value.startsWith('#')) {
      // Anchor links are fine
      return;
    }
    if (r.value.startsWith('/')) {
      // Absolute paths won't work from the copy editor
      const type = 'absolute-path';
      if (!brokenByType[type]) brokenByType[type] = [];
      brokenByType[type].push({ file: f, value: r.value });
      filesWithBrokenRefs++;
    } else {
      const type = 'relative-path';
      if (!brokenByType[type]) brokenByType[type] = [];
      brokenByType[type].push({ file: f, value: r.value });
      filesWithBrokenRefs++;
    }
  });
});

console.log('Total files:', totalFiles);
console.log('Files with broken refs:', filesWithBrokenRefs);
for (const [type, items] of Object.entries(brokenByType)) {
  console.log(`  ${type}: ${items.length} occurrences`);
  items.slice(0, 10).forEach(i => console.log(`    ${i.file}: ${i.value}`));
  if (items.length > 10) console.log(`    ... and ${items.length - 10} more`);
}