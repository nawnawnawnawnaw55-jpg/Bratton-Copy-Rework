import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAPPING = JSON.parse(fs.readFileSync(path.join(__dirname, 'image-mapping.json'), 'utf-8'));

// Build an array of [ remoteUrl, localPath ] pairs, sorted longest-first to avoid partial-replace collisions
const pairs = Object.entries(MAPPING).sort((a, b) => b[0].length - a[0].length);

// Files to scan
const SCAN_EXTENSIONS = new Set(['.html', '.css', '.js', '.mjs', '.json']);

// Directories/files to skip
const SKIP_DIRS = new Set(['node_modules', '.git', 'assets/files/remote-images', '_preview-context']);
const SKIP_FILES = new Set(['image-mapping.json', 'fix-all-remote-urls.mjs', 'download-images.mjs', 'verify-images.mjs']);

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collectFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const rel = path.relative(__dirname, fullPath);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(rel) && rel !== '' && !rel.split(path.sep).some(p => SKIP_DIRS.has(p))) {
        results.push(...collectFiles(fullPath));
      }
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (SCAN_EXTENSIONS.has(ext) && !SKIP_FILES.has(rel)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

console.log('Collecting files to scan...');
const allFiles = collectFiles(__dirname);
console.log(`Found ${allFiles.length} files to scan.\n`);

let filesModified = 0;
let totalReplacements = 0;

for (const filePath of allFiles) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    continue; // skip binary/unreadable
  }

  let modified = false;
  let newContent = content;

  for (const [remoteUrl, localPath] of pairs) {
    const escaped = escapeRegex(remoteUrl);
    // Also handle partial/truncated URLs (e.g., with truncated query params in previewContext)
    // We'll match the base URL up to common break points
    const regex = new RegExp(escaped, 'g');
    const count = (newContent.match(regex) || []).length;

    if (count > 0) {
      newContent = newContent.replace(regex, localPath);
      modified = true;
      totalReplacements += count;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    filesModified++;
    console.log(`  UPDATED: ${path.relative(__dirname, filePath)}`);
  }
}

console.log(`\nDone! Modified ${filesModified} files with ${totalReplacements} total replacements.`);

// Final verification: scan for any remaining remote ptclinic.com or images.pexels.com URLs
console.log('\n── Final scan for remaining remote URLs ──');
const REMAINING_PATTERNS = [
  /https?:\/\/images\.pexels\.com/gi,
  /https?:\/\/ptclinic\.com/gi,
  /https?:\/\/[^"'\s]*pexels[^"'\s]*/gi,
];

let remainingFiles = 0;
for (const filePath of allFiles) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch { continue; }

  for (const pattern of REMAINING_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      console.log(`  REMAINING in ${path.relative(__dirname, filePath)}:`);
      for (const m of matches) {
        console.log(`    -> ${m}`);
      }
      remainingFiles++;
      break;
    }
  }
}

if (remainingFiles === 0) {
  console.log('  CLEAN! No remote image URLs remain.');
} else {
  console.log(`  ${remainingFiles} files still have remote URLs (see above).`);
}

// Also verify images exist on disk
console.log('\n── Checking downloaded image files ──');
const remoteDir = path.join(__dirname, 'assets', 'files', 'remote-images');
let diskPass = 0;
let diskFail = 0;

for (const localPath of Object.values(MAPPING)) {
  const fullPath = path.join(__dirname, localPath.replace(/^\//, ''));
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).size > 0) {
    diskPass++;
  } else {
    console.log(`  MISSING/EMPTY: ${localPath}`);
    diskFail++;
  }
}
console.log(`  ${diskPass} OK, ${diskFail} missing/empty`);