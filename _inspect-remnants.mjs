import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAPPING = JSON.parse(fs.readFileSync(path.join(__dirname, 'image-mapping.json'), 'utf-8'));

const files = [
  '_sections/medical-library---back.json',
  '_sections/medical-library---foot-&-ankle.json',
  '_sections/medical-library---knee.json',
  '_sections/medical-library---shoulder.json',
  '_sections/medical-library---wrist-&-hand.json',
  '_master-snippets.json',
];

for (const file of files) {
  const content = fs.readFileSync(path.join(__dirname, file), 'utf-8');
  const matches = content.match(/https?:\/\/ptclinic\.com[^"'\s]*/gi) || [];
  const unique = [...new Set(matches)];
  
  console.log(`\n=== ${file} ===`);
  for (const u of unique) {
    // Check if this URL exists in mapping
    const mapped = MAPPING[u];
    console.log(`  URL: ${u}`);
    console.log(`  In mapping: ${mapped ? 'YES -> ' + mapped : 'NO'}`);
    
    // Show context
    const idx = content.indexOf(u);
    if (idx >= 0) {
      const start = Math.max(0, idx - 20);
      const end = Math.min(content.length, idx + u.length + 40);
      console.log(`  Context: ...${content.substring(start, end)}...`);
    }
    console.log('');
  }
}

// Also check for any partial matches - URLs that START WITH mapping keys but are truncated
console.log('\n=== Checking for truncated URL matches ===');
for (const [remoteUrl, localPath] of Object.entries(MAPPING)) {
  for (const file of files) {
    const content = fs.readFileSync(path.join(__dirname, file), 'utf-8');
    // Check if the beginning of this URL exists but the full URL doesn't
    const prefix = remoteUrl.substring(0, 30);
    if (content.includes(prefix) && !content.includes(remoteUrl)) {
      console.log(`  ${file}: prefix "${prefix}" exists but full URL doesn't`);
    }
  }
}