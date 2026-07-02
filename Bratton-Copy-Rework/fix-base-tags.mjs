// fix-base-tags.mjs – Add <base href="/Bratton-Copy-Rework/"> to all HTML files
// that don't already have a <base> tag, so relative paths resolve correctly on GitHub Pages.
import { readFileSync, writeFileSync } from 'node:fs';
import { globSync } from 'node:fs';

// Read all files recursively
import { readdirSync, statSync } from 'node:fs';

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = dir + '/' + entry.name;
    if (entry.isDirectory() && entry.name !== '.git' && entry.name !== 'node_modules' && entry.name !== '_preview-context') {
      yield* walk(full);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      yield full;
    }
  }
}

let fixed = 0;
let skipped = 0;

for (const file of walk('.')) {
  // Normalize path
  const normalized = file.replace(/^\.\\/, '').replace(/\\/g, '/');
  
  let content = readFileSync(file, 'utf8');
  
  // Skip if already has a <base> tag
  if (/<base\s/i.test(content)) {
    skipped++;
    continue;
  }
  
  // Skip if no <head> (shouldn't happen but be safe)
  if (!/<head/i.test(content)) {
    skipped++;
    continue;
  }
  
  // Insert base tag right after the opening <head> tag (or after the first <head ...>)
  content = content.replace(/(<head[^>]*>)/i, '$1\n<base href="/Bratton-Copy-Rework/">');
  
  writeFileSync(file, content, 'utf8');
  console.log('Fixed:', normalized);
  fixed++;
}

console.log(`\nDone. Fixed: ${fixed}, Skipped: ${skipped}`);