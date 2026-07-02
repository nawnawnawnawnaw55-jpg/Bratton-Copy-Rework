/**
 * Bulk fix script for all v3 library child pages
 * Fixes:
 *   1. Mobile tabs: flex-wrap:wrap → nowrap + overflow-x:auto
 *   2. Back arrow navigation: adds ← Back to [Body Area] link
 * Run: node fix-all-library-pages.js
 */
const fs = require('fs');
const path = require('path');

const LIBRARY_DIR = './bratton-pt-v3/library';
const DRY_RUN = false; // Set true to preview changes without writing

// Display name map for body areas
const BODY_AREA_NAMES = {
  ankle: 'Foot & Ankle',
  back: 'Back',
  elbow: 'Elbow',
  exercise: 'Exercises',
  hip: 'Hip',
  knee: 'Knee',
  leg: 'Leg',
  md: 'For Physicians',
  neck: 'Neck',
  shoulder: 'Shoulder',
  systemic: 'Systemic',
  wrist: 'Wrist & Hand',
  treatments: 'Treatments',
};

function getParentName(childDirName) {
  // library_shoulder_26 → shoulder, library_knee_16 → knee, library_treatments_2 → treatments
  const parts = childDirName.split('_');
  if (parts.length >= 2) {
    // Find the body area name (second token, or join if multi-word)
    // library_back_1 -> back
    // library_ankle_12 -> ankle
    const bodyKey = parts[1];
    return BODY_AREA_NAMES[bodyKey] || (bodyKey.charAt(0).toUpperCase() + bodyKey.slice(1));
  }
  return 'Medical Library';
}

function getParentDir(childDirName) {
  // library_shoulder_26 → library_shoulder
  // library_treatments_2 → library_treatments
  // library_back_1 → library_back
  const parts = childDirName.split('_');
  const lastNum = parseInt(parts[parts.length - 1]);
  if (!isNaN(lastNum)) {
    // Remove the numeric suffix to get parent
    return parts.slice(0, parts.length - 1).join('_');
  }
  return childDirName; // fallback
}

function fixMobileTabs(html) {
  // Replace flex-wrap:wrap with flex-wrap:nowrap
  let fixed = html.replace(
    /(\.ml-tab-nav\s*\{[^}]*?flex-wrap\s*:\s*)wrap(\s*[;}])/g,
    '$1nowrap$2'
  );
  
  // Add overflow-x:auto to ml-tab-nav if not present
  if (!fixed.match(/\.ml-tab-nav\s*\{[^}]*overflow-x\s*:\s*auto/)) {
    fixed = fixed.replace(
      /(\.ml-tab-nav\s*\{)/,
      '$1\n    overflow-x:auto;'
    );
  }
  
  return fixed;
}

function addBackArrow(html, parentDirName, parentDisplayName) {
  // Check if back arrow already exists
  if (/ml-back-arrow/.test(html)) return html;
  
  const parentHref = `/library/${parentDirName}/`;
  
  const backArrowHTML = `<a href="${parentHref}" class="ml-back-arrow" aria-label="Back to ${parentDisplayName}"><span class="ml-back-arrow-icon">←</span> Back to ${parentDisplayName}</a>\n`;
  
  // Insert after <div class="library-article"> and before <h1>
  // Pattern: <div class="library-article">\n  <h1>
  html = html.replace(
    /(<div class="library-article">\s*\n)(\s*<h1)/,
    '$1  ' + backArrowHTML + '$2'
  );
  
  // Add CSS for back arrow if not present
  if (!html.includes('.ml-back-arrow')) {
    const backArrowCSS = `
    .ml-back-arrow{display:inline-flex;align-items:center;gap:6px;color:var(--primary);text-decoration:none;font-weight:600;font-size:0.9rem;margin-bottom:12px;transition:color .2s}
    .ml-back-arrow:hover{color:var(--accent)}
    .ml-back-arrow-icon{font-size:1.1rem}`;
    
    // Insert before the closing </style> tag
    html = html.replace(
      /(\s*)<\/style>/,
      backArrowCSS + '\n$1</style>'
    );
  }
  
  return html;
}

function fixBack71TabLabels(html) {
  // library_back_71 has tab 2 labeled "Resources" instead of "Goals"
  // Fix: swap labels so tab order is Overview, Treatments, Goals, Resources
  html = html.replace(
    /(<button[^>]*data-ml-tab="[^"]*2"[^>]*>)\s*Resources\s*(<\/button>)/,
    '$1Goals$2'
  );
  html = html.replace(
    /(<button[^>]*data-ml-tab="[^"]*3"[^>]*>)\s*Goals\s*(<\/button>)/,
    '$1Resources$2'
  );
  return html;
}

function processChildPage(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const childDirName = path.basename(path.dirname(filePath));
  const parentDirName = getParentDir(childDirName);
  const parentDisplayName = getParentName(childDirName);
  const relPath = filePath.replace(/^\.\/bratton-pt-v3\//, '');
  
  let modified = html;
  let changes = [];
  
  // Fix 1: Mobile tabs
  if (/flex-wrap\s*:\s*wrap/.test(modified)) {
    modified = fixMobileTabs(modified);
    changes.push('mobile-tabs: wrap→nowrap');
  }
  if (!/overflow-x\s*:\s*auto/.test(modified) && modified.includes('.ml-tab-nav')) {
    modified = fixMobileTabs(modified); // adds overflow-x:auto
    changes.push('mobile-tabs: added overflow-x:auto');
  }
  
  // Fix 2: Back arrow
  if (!modified.includes('ml-back-arrow')) {
    // Verify parent exists
    const parentPath = path.join(LIBRARY_DIR, parentDirName, 'index.html');
    if (fs.existsSync(parentPath)) {
      modified = addBackArrow(modified, parentDirName, parentDisplayName);
      changes.push(`back-arrow: ← Back to ${parentDisplayName}`);
    } else {
      console.log(`  ⚠️  Parent not found for ${childDirName} → ${parentDirName} — skipping back arrow`);
    }
  }
  
  // Fix 3: library_back_71 tab labels
  if (childDirName === 'library_back_71') {
    modified = fixBack71TabLabels(modified);
    changes.push('tab-labels: fixed Goals/Resources swap');
  }
  
  if (changes.length > 0) {
    console.log(`  ✅ ${relPath}`);
    changes.forEach(c => console.log(`     - ${c}`));
    
    if (!DRY_RUN) {
      fs.writeFileSync(filePath, modified, 'utf8');
    }
  }
  
  return changes.length;
}

function findLibraryPages(dir) {
  const result = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.startsWith('library_')) {
      const htmlFile = path.join(dir, entry.name, 'index.html');
      if (fs.existsSync(htmlFile)) {
        result.push(htmlFile);
      }
    }
  }
  return result;
}

// Main
console.log('🔧 Bratton PT Library Page Fixer\n');
console.log('='.repeat(60));
if (DRY_RUN) console.log('⚠️  DRY RUN — no files will be modified\n');

const pages = findLibraryPages(LIBRARY_DIR);
console.log(`Found ${pages.length} library pages\n`);

// Only process child pages (those with tabs)
let fixedCount = 0;
for (const p of pages) {
  const html = fs.readFileSync(p, 'utf8');
  const hasTabs = /class="ml-tab-nav"/.test(html);
  if (hasTabs) {
    const changes = processChildPage(p);
    if (changes > 0) fixedCount++;
  }
}

console.log('\n' + '='.repeat(60));
console.log(`${DRY_RUN ? 'Would have fixed' : 'Fixed'} ${fixedCount} child pages`);
console.log('='.repeat(60));

if (!DRY_RUN) {
  console.log('\nRun node scan-library-pages.js to verify fixes.');
}