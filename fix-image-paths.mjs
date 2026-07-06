import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'fs';
import { readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';

// Recursively find all .html files
function findHtmlFiles(dir) {
  const results = [];
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    if (entry.startsWith('.') || entry === 'node_modules' || entry === '_preview-context') continue;
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        results.push(...findHtmlFiles(fullPath));
      } else if (entry.endsWith('.html')) {
        results.push(fullPath);
      }
    } catch (e) {
      // skip
    }
  }
  return results;
}

const htmlFiles = findHtmlFiles('.');
console.log(`Found ${htmlFiles.length} HTML files`);

let fixedCount = 0;
let changesCount = 0;

for (const file of htmlFiles) {
  let content = readFileSync(file, 'utf8');
  const original = content;

  // Fix image src paths that start with /assets/ or /files/
  // Remove leading / so they become relative to the base href
  // This applies to: src="/assets/..." and src="/files/..."
  content = content.replace(/src="\/assets\//g, 'src="assets/');
  content = content.replace(/src="\/files\//g, 'src="files/');

  // Also fix background-image url() references if any
  // content = content.replace(/url\("\/assets\//g, 'url("assets/');
  // content = content.replace(/url\("\/files\//g, 'url("files/');

  // Also fix CSS href paths
  content = content.replace(/href="\/css\//g, 'href="css/');
  
  // Also fix JS paths
  content = content.replace(/src="\/js\//g, 'src="js/');

  // Fix favicon
  content = content.replace(/href="\/favicon\.ico"/g, 'href="favicon.ico"');
  content = content.replace(/href="\/favicon\.svg"/g, 'href="favicon.svg"');

  // Fix template fetches
  content = content.replace(/fetch\('\/templates\//g, "fetch('templates/");

  if (content !== original) {
    writeFileSync(file, content, 'utf8');
    changesCount++;
    console.log(`Fixed: ${file}`);
  }

  fixedCount++;
}

console.log(`\nDone! Fixed ${changesCount} files out of ${htmlFiles.length} total.`);