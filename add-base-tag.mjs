import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_TAG = '<base href="/Bratton-Copy-Rework/">';

function collectHtmlFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const rel = path.relative(__dirname, fullPath);
    if (entry.isDirectory()) {
      if (!rel.includes('node_modules') && !rel.includes('.git') && !rel.startsWith('_preview-context') && !rel.startsWith('_assets')) {
        results.push(...collectHtmlFiles(fullPath));
      }
    } else if (entry.name.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

console.log('Collecting HTML files...');
const htmlFiles = collectHtmlFiles(__dirname);
console.log(`Found ${htmlFiles.length} HTML files.\n`);

let filesModified = 0;

for (const filePath of htmlFiles) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Skip if already has a base tag
  if (/<base\s/i.test(content)) {
    continue;
  }
  
  // Insert base tag right after the <head> opening tag
  if (content.includes('<head>')) {
    content = content.replace('<head>', '<head>\n' + BASE_TAG);
    fs.writeFileSync(filePath, content, 'utf-8');
    filesModified++;
    console.log(`✓ ${path.relative(__dirname, filePath)}`);
  }
}

console.log(`\n${filesModified} files modified.`);