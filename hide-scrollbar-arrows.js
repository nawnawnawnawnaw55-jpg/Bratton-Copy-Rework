const fs = require('fs');
const path = require('path');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let results = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (fs.existsSync(path.join(fullPath, 'index.html'))) {
        results.push(path.join(fullPath, 'index.html'));
      }
      results = results.concat(walk(fullPath));
    }
  }
  return results;
}

const pages = walk('bratton-pt-v3/library').filter(f => f.endsWith('.html'));
let updated = 0;

for (const filePath of pages) {
  let html = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Check if this page has the ml-tab-nav with overflow-x:auto
  if (!html.includes('.ml-tab-nav') || !html.includes('overflow-x:auto')) {
    continue;
  }

  // Step 1: Add scrollbar-width:none to the main .ml-tab-nav rule (not inside @media)
  // Find the first .ml-tab-nav{...} rule before any @media block
  const mainRuleMatch = html.match(/(\.ml-tab-nav\s*\{[^}]*?overflow-x:\s*auto[^}]*?\})/);
  if (mainRuleMatch && !mainRuleMatch[1].includes('scrollbar-width')) {
    html = html.replace(
      mainRuleMatch[1],
      mainRuleMatch[1].replace(/\}$/, '; scrollbar-width:none}')
    );
    changed = true;
  }

  // Step 2: Add the webkit scrollbar hide rule outside the media query (if not already there)
  // Look for an existing .ml-tab-nav::-webkit-scrollbar{display:none} rule that's NOT inside @media
  const hasWebkitOutsideMedia = /\.ml-tab-nav::-webkit-scrollbar\s*\{\s*display\s*:\s*none\s*\}(?!\s*@media|\s*\})/.test(html);
  
  if (!hasWebkitOutsideMedia) {
    // Add it right before the @media block, or after the ml-tab-btn--active rule
    if (html.includes('@media(max-width:700px)')) {
      html = html.replace(
        /(@media\s*\(\s*max-width\s*:\s*700px\s*\))/,
        '.ml-tab-nav::-webkit-scrollbar{display:none}\n$1'
      );
    }
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, html);
    updated++;
    console.log('Updated: ' + path.basename(path.dirname(filePath)));
  }
}

console.log('\nTotal updated: ' + updated + ' pages');