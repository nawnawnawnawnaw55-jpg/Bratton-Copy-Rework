import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REMOTE_DIR = 'assets/files/remote-images';
const OUTPUT_DIR = path.join(__dirname, REMOTE_DIR);

// Patterns to match in files (src attributes and background-image CSS)
const IMG_SRC_PATTERN = /<img[^>]*src="(https?:\/\/[^"]+\.(?:jpe?g|png|gif|webp|svg)[^"]*)"/gi;
const BG_IMG_PATTERN = /background-image:\s*url\(['"]?(https?:\/\/[^'"()]+\.(?:jpe?g|png|gif|webp|svg)[^'"()]*)['"]?\)/gi;
const BG_IMG_STYLE_PATTERN = /style="[^"]*background-image:\s*url\(['"]?(https?:\/\/[^'"()]+\.(?:jpe?g|png|gif|webp|svg)[^'"()]*)['"]?\)[^"]*"/gi;

// Collect all unique image URLs
const imageUrls = new Set();

// Files to scan
const jsonFiles = [];
const htmlFiles = [];
const cssFiles = [];

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!fullPath.includes('node_modules') && !fullPath.includes('.git')) {
        walkDir(fullPath);
      }
    } else {
      if (entry.name.endsWith('.json')) jsonFiles.push(fullPath);
      else if (entry.name.endsWith('.html')) htmlFiles.push(fullPath);
      else if (entry.name.endsWith('.css')) cssFiles.push(fullPath);
    }
  }
}

console.log('Scanning files for remote image URLs...');
walkDir(__dirname);

// Scan all files for image URLs
for (const file of [...jsonFiles, ...htmlFiles, ...cssFiles]) {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Match img src
    let match;
    IMG_SRC_PATTERN.lastIndex = 0;
    while ((match = IMG_SRC_PATTERN.exec(content)) !== null) {
      imageUrls.add(match[1]);
    }
    
    // Match background-image in style attributes
    BG_IMG_STYLE_PATTERN.lastIndex = 0;
    while ((match = BG_IMG_STYLE_PATTERN.exec(content)) !== null) {
      // Extract just the URL from the style attribute
      const urlMatch = match[0].match(/url\(['"]?(https?:\/\/[^'"()]+)['"]?\)/);
      if (urlMatch) {
        imageUrls.add(urlMatch[1]);
      }
    }
    
    // Match bare background-image references (in CSS or inline)
    BG_IMG_PATTERN.lastIndex = 0;
    while ((match = BG_IMG_PATTERN.exec(content)) !== null) {
      imageUrls.add(match[1]);
    }
  } catch (e) {
    console.warn(`  Warning: Could not read ${file}: ${e.message}`);
  }
}

console.log(`Found ${imageUrls.size} unique remote image URLs.`);

// Filter to only image-related URLs (not iframes, maps, etc.)
const imageHosts = ['images.pexels.com', 'ptclinic.com'];
const filteredUrls = [...imageUrls].filter(url => {
  try {
    const host = new URL(url).hostname;
    return imageHosts.some(h => host.includes(h));
  } catch { return false; }
});

console.log(`Filtered to ${filteredUrls.length} images from ${imageHosts.join(', ')}`);

// Ensure output directory exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Download function
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const protocol = parsed.protocol === 'https:' ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
        const redirectUrl = response.headers.location;
        downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }
      
      const file = fs.createWriteStream(destPath);
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    }).on('error', reject);
  });
}

// Generate a local filename from URL
function urlToFilename(url) {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/');
    const originalName = pathParts[pathParts.length - 1].split('?')[0];
    
    // Add a short hash prefix to avoid collisions
    const urlHash = hashStr(url).substring(0, 6);
    
    // Get the folder name for context
    const folderName = pathParts.length >= 2 ? pathParts[pathParts.length - 2] : '';
    
    return `${folderName}_${urlHash}_${originalName}`;
  } catch {
    return `image_${Date.now()}.jpg`;
  }
}

function hashStr(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// Download all images
console.log('\nDownloading images...');
const urlMapping = {}; // remote URL -> local path

let downloaded = 0;
let failed = 0;

for (const url of filteredUrls) {
  const filename = urlToFilename(url);
  const destPath = path.join(OUTPUT_DIR, filename);
  const localPath = `/${REMOTE_DIR}/${filename}`;
  
  if (fs.existsSync(destPath)) {
    console.log(`  EXISTS: ${filename}`);
    urlMapping[url] = localPath;
    downloaded++;
    continue;
  }
  
  try {
    await downloadFile(url, destPath);
    console.log(`  OK: ${filename}`);
    urlMapping[url] = localPath;
    downloaded++;
  } catch (err) {
    console.error(`  FAIL: ${url} - ${err.message}`);
    failed++;
  }
}

console.log(`\nDownload complete: ${downloaded} downloaded, ${failed} failed.`);

// Write the mapping file
const mappingPath = path.join(__dirname, 'image-mapping.json');
fs.writeFileSync(mappingPath, JSON.stringify(urlMapping, null, 2));
console.log(`Mapping written to image-mapping.json`);

// Now replace URLs in all files
console.log('\nReplacing remote URLs with local paths in files...');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  
  for (const [remoteUrl, localPath] of Object.entries(urlMapping)) {
    // Escape special regex chars in URL
    const escapedUrl = remoteUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedUrl, 'g');
    
    const newContent = content.replace(regex, localPath);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  }
  return false;
}

let filesUpdated = 0;
for (const file of [...jsonFiles, ...htmlFiles, ...cssFiles]) {
  try {
    if (replaceInFile(file)) {
      console.log(`  UPDATED: ${path.relative(__dirname, file)}`);
      filesUpdated++;
    }
  } catch (e) {
    console.warn(`  ERROR: ${path.relative(__dirname, file)} - ${e.message}`);
  }
}

console.log(`\nDone! Updated ${filesUpdated} files.`);
console.log(`${downloaded} images downloaded to ${REMOTE_DIR}/`);
console.log(`Mapping saved to image-mapping.json`);