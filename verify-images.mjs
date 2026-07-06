import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:3000';

// ── 1. Read the image mapping ────────────────────────────────────────────────
const mappingPath = path.join(__dirname, 'image-mapping.json');
if (!fs.existsSync(mappingPath)) {
  console.error('ERROR: image-mapping.json not found. Run download-images.mjs first.');
  process.exit(1);
}

const urlMapping = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));
const remoteUrls = Object.keys(urlMapping);
const localPaths = Object.values(urlMapping);

console.log(`Loaded mapping: ${remoteUrls.length} images\n`);

// ── 2. Verify all image files exist on disk ──────────────────────────────────
let diskPass = 0;
let diskFail = 0;

console.log('── Step 1: Check image files exist on disk ──');
for (const localPath of localPaths) {
  const fullPath = path.join(__dirname, localPath.replace(/^\//, ''));
  if (fs.existsSync(fullPath)) {
    const stat = fs.statSync(fullPath);
    if (stat.size > 0) {
      diskPass++;
    } else {
      console.log(`  EMPTY: ${localPath} (0 bytes)`);
      diskFail++;
    }
  } else {
    console.log(`  MISSING: ${localPath}`);
    diskFail++;
  }
}
console.log(`  Disk check: ${diskPass} OK, ${diskFail} FAILED\n`);

// ── 3. Scan all files for remaining remote URLs ──────────────────────────────
const REMOTE_PATTERNS = [
  /https?:\/\/images\.pexels\.com/gi,
  /https?:\/\/ptclinic\.com.*\.(jpe?g|png|gif|webp|svg)/gi,
];

// Files/dirs to exclude from the scan (false positives we expect)
const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.git',
  'assets/files/remote-images',
  '_preview-context',
]);

const EXCLUDE_FILES = new Set([
  'image-mapping.json',
]);

let filesWithRemote = [];
let filesScanned = 0;

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const rel = path.relative(__dirname, fullPath);
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(rel) && !rel.includes('node_modules') && !rel.includes('.git')) {
        scanDir(fullPath);
      }
    } else if (/\.(html|json|css|js|mjs)$/.test(entry.name)) {
      if (EXCLUDE_FILES.has(rel)) continue;
      filesScanned++;
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        for (const pattern of REMOTE_PATTERNS) {
          pattern.lastIndex = 0;
          const matches = content.match(pattern);
          if (matches && matches.length > 0) {
            filesWithRemote.push({
              file: rel,
              urls: matches
            });
            break;
          }
        }
      } catch (e) {
        // ignore binary/encoding errors
      }
    }
  }
}

console.log('── Step 2: Scan for remaining remote image URLs ──');
scanDir(__dirname);

if (filesWithRemote.length === 0) {
  console.log(`  CLEAN! No remote image URLs found in ${filesScanned} files.\n`);
} else {
  console.log(`  WARNING: ${filesWithRemote.length} files still contain remote URLs:`);
  for (const item of filesWithRemote) {
    console.log(`    ${item.file}`);
    for (const u of item.urls) {
      console.log(`      -> ${u}`);
    }
  }
  console.log('');
}

// ── 4. Verify images are accessible via http://localhost:3000 ─────────────────
console.log('── Step 3: Verify images load via localhost:3000 ──');

function checkUrl(url) {
  return new Promise((resolve) => {
    const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
    const options = {
      headers: { 'Accept': '*/*' }
    };
    http.get(fullUrl, options, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        res.resume();
        resolve({ url, status: res.statusCode, ok: true });
      } else {
        res.resume();
        resolve({ url, status: res.statusCode, ok: false });
      }
    }).on('error', (e) => {
      resolve({ url, error: e.message, ok: false });
    });
  });
}

// Test ALL local image paths (not just a sample)
console.log(`  Testing ${localPaths.length} images against ${BASE_URL}...`);

let httpPass = 0;
let httpFail = 0;

// Run in batches of 10
const BATCH_SIZE = 10;
for (let i = 0; i < localPaths.length; i += BATCH_SIZE) {
  const batch = localPaths.slice(i, i + BATCH_SIZE);
  const results = await Promise.all(batch.map(p => checkUrl(p)));
  for (const r of results) {
    if (r.ok) {
      httpPass++;
    } else {
      console.log(`  FAIL: ${r.url} -> HTTP ${r.status || 'error'} ${r.error || ''}`);
      httpFail++;
    }
  }
}

console.log(`  HTTP check: ${httpPass} OK, ${httpFail} FAILED\n`);

// ── 5. Verify pages serve updated content (no remote image URLs) ─────────────
console.log('── Step 4: Verify pages serve updated content ──');

// Use library pages that are known to contain remote images (which should now be local)
const pageTests = [
  '/library/library_knee_16/index.html',
  '/library/library_shoulder_26/index.html',
  '/library/library_hip_7/index.html',
  '/library/library_knee_17/index.html',
  '/library/library_ankle_12/index.html',
];

function checkPage(url) {
  const fullUrl = `${BASE_URL}${url}`;
  function doGet(targetUrl, remaining) {
    return new Promise((resolve) => {
      const options = { headers: { 'Accept': 'text/html' } };
      http.get(targetUrl, options, (res) => {
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location && remaining > 0) {
          res.resume();
          const redirectUrl = res.headers.location.startsWith('http')
            ? res.headers.location
            : `${BASE_URL}${res.headers.location}`;
          doGet(redirectUrl, remaining - 1).then(resolve);
        } else {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            const hasRemoteImg = /https?:\/\/(?:images\.pexels\.com|ptclinic\.com)/i.test(body);
            const hasLocalImg = /\/assets\/files\/remote-images\//i.test(body);
            resolve({
              page: url,
              status: res.statusCode,
              hasRemoteImgs: hasRemoteImg,
              hasLocalImgs: hasLocalImg,
              ok: res.statusCode === 200 && !hasRemoteImg && hasLocalImg
            });
          });
        }
      }).on('error', (e) => {
        resolve({ page: url, error: e.message, ok: false });
      });
    });
  }
  return doGet(fullUrl, 3);
}

let pagePass = 0;
let pageFail = 0;

for (const pageUrl of pageTests) {
  const result = await checkPage(pageUrl);
  if (result.ok) {
    console.log(`  OK: ${result.page} (${result.status}, local imgs found, no remote imgs)`);
    pagePass++;
  } else if (result.error) {
    console.log(`  FAIL: ${result.page} - ${result.error}`);
    pageFail++;
  } else {
    console.log(`  FAIL: ${result.page} (${result.status}, remote: ${result.hasRemoteImgs}, local: ${result.hasLocalImgs})`);
    pageFail++;
  }
}
console.log(`  Page check: ${pagePass} OK, ${pageFail} FAILED\n`);

// ── 6. Summary ──────────────────────────────────────────────────────────────
const totalPass = (diskFail === 0) && (filesWithRemote.length === 0) && (httpFail === 0) && (pageFail === 0);

console.log('═══════════════════════════════════════════════');
console.log('            VERIFICATION SUMMARY');
console.log('═══════════════════════════════════════════════');
console.log(`  Local files on disk:  ${diskPass}/${diskPass + diskFail} present`);
console.log(`  Remote URLs in code:  ${filesWithRemote.length > 0 ? 'FOUND (' + filesWithRemote.length + ' files)' : 'NONE'}`);
console.log(`  HTTP image serving:   ${httpPass}/${httpPass + httpFail} OK`);
console.log(`  Page content check:   ${pagePass}/${pagePass + pageFail} OK`);
console.log('═══════════════════════════════════════════════');

if (totalPass) {
  console.log('  RESULT: ALL CHECKS PASSED ✓');
  process.exit(0);
} else {
  console.log('  RESULT: SOME CHECKS FAILED ✗');
  process.exit(1);
}