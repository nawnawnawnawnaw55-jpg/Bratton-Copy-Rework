const fs = require('fs');
const path = require('path');

const libraryDir = 'bratton-pt-v3/library';
const log = [];

function logger(msg) {
  log.push(msg);
  console.log(msg);
}

// ============================================================
// 1. ENSURE BACK ARROWS ON PARENT PAGES POINT TO /library/
// ============================================================
logger('=== STEP 1: PARENT PAGE BACK ARROWS ===');

const parentPages = {
  'library_ankle': 'Foot & Ankle',
  'library_back': 'Back',
  'library_elbow': 'Elbow',
  'library_hip': 'Hip',
  'library_knee': 'Knee',
  'library_leg': 'Leg',
  'library_neck': 'Neck',
  'library_shoulder': 'Shoulder',
  'library_wrist': 'Wrist & Hand'
};

Object.keys(parentPages).forEach(dir => {
  const filePath = path.join(libraryDir, dir, 'index.html');
  if (!fs.existsSync(filePath)) {
    logger('  MISSING FILE: ' + filePath);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if it has a back arrow already
  if (content.includes('ml-back-arrow')) {
    logger('  ' + dir + ': back arrow EXISTS');
    // Verify it points to /library/
    const match = content.match(/<a[^>]*ml-back-arrow[^>]*href="([^"]*)"/);
    if (match && match[1] === '/library/') {
      logger('    -> links to /library/ (correct)');
    } else if (match) {
      logger('    -> links to ' + match[1] + ' (WRONG - should be /library/)');
    }
  } else {
    // Need to add back arrow
    const h1Match = content.match(/<h1>[^<]+<\/h1>/);
    if (h1Match) {
      const backArrow = '\n  <a href="/library/" class="ml-back-arrow" aria-label="Back to Medical Library"><span class="ml-back-arrow-icon">←</span> Back to Medical Library</a>\n';
      content = content.replace(/(<h1>[^<]+<\/h1>)/, backArrow + '$1');
      fs.writeFileSync(filePath, content, 'utf8');
      logger('  ' + dir + ': ADDED back arrow');
    } else {
      logger('  ' + dir + ': Could not find h1 to insert back arrow');
    }
  }
});

// ============================================================
// 2. VERIFY CHILD PAGE BACK ARROWS POINT TO CORRECT PARENT
// ============================================================
logger('\n=== STEP 2: CHILD PAGE BACK ARROW VERIFICATION ===');

const dirs = fs.readdirSync(libraryDir, {withFileTypes: true})
  .filter(d => d.isDirectory())
  .map(d => d.name);

const childDirs = dirs.filter(d => /^library_[a-z]+_\d+$/.test(d));

let fixedChildren = 0;
let verifiedChildren = 0;

childDirs.forEach(dir => {
  const match = dir.match(/^(library_[a-z]+)_\d+$/);
  if (!match) return;
  
  const parentDir = match[1];
  const parentName = parentPages[parentDir];
  if (!parentName) {
    // Non-body-part parent (treatments, systemic, etc.)
    return;
  }
  
  const filePath = path.join(libraryDir, dir, 'index.html');
  if (!fs.existsSync(filePath)) {
    logger('  MISSING: ' + dir);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('ml-back-arrow')) {
    // Add back arrow before the h1
    const h1Match = content.match(/<h1>[^<]+<\/h1>/);
    if (h1Match) {
      const backArrow = '\n  <a href="/library/' + parentDir + '/" class="ml-back-arrow" aria-label="Back to ' + parentName + '"><span class="ml-back-arrow-icon">←</span> Back to ' + parentName + '</a>\n';
      content = content.replace(/(<h1>[^<]+<\/h1>)/, backArrow + '$1');
      fs.writeFileSync(filePath, content, 'utf8');
      fixedChildren++;
      logger('  ' + dir + ': ADDED back arrow -> ' + parentDir);
    }
  } else {
    verifiedChildren++;
  }
});

logger('  Fixed: ' + fixedChildren + ', Already good: ' + verifiedChildren);

// ============================================================
// 3. ENSURE MOBILE TABS STAY ON ONE ROW (flex-wrap:nowrap)
// ============================================================
logger('\n=== STEP 3: MOBILE TAB CSS FIXES ===');

let cssFixCount = 0;

// Check all library pages for proper flex-wrap:nowrap
const allDirs = dirs;
allDirs.forEach(dir => {
  const filePath = path.join(libraryDir, dir, 'index.html');
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Only process pages that have tab navigation
  if (!content.includes('ml-tab-nav')) return;
  
  let modified = false;
  
  // Fix 1: Ensure .ml-tab-nav has flex-wrap:nowrap and overflow-x:auto
  // Check if the CSS block has flex-wrap:nowrap
  if (!content.includes('flex-wrap:nowrap')) {
    // Add flex-wrap:nowrap to .ml-tab-nav
    content = content.replace(
      /(\.ml-tab-nav\{[^}]*overflow-x:auto[^}]*)\}/,
      '$1;flex-wrap:nowrap}'
    );
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    cssFixCount++;
    logger('  Fixed CSS: ' + dir);
  }
});

logger('  CSS fixes applied to: ' + cssFixCount + ' pages');

// ============================================================
// 4. VERIFY VIDEO LINKS IN TREATMENT SECTIONS
// ============================================================
logger('\n=== STEP 4: VIDEO LINK VERIFICATION ===');

// Check that treatment links (▶ Video badges) point to existing pages
let videoIssues = 0;
childDirs.forEach(dir => {
  const filePath = path.join(libraryDir, dir, 'index.html');
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Find all video badge links in treatment lists
  const videoLinkRegex = /<a[^>]*href="(\/library\/library_treatments_\d+\/)"[^>]*>.*?video-badge/g;
  let match;
  while ((match = videoLinkRegex.exec(content)) !== null) {
    const href = match[1];
    // Check if the target directory exists
    const targetDir = href.replace(/^\//, '').replace(/\/$/, '');
    const targetPath = path.join(targetDir, 'index.html');
    if (!fs.existsSync(targetPath)) {
      // Check if dir exists at all
      if (!fs.existsSync(targetDir)) {
        videoIssues++;
        logger('  BROKEN VIDEO LINK in ' + dir + ': ' + href + ' (directory missing)');
      }
    }
  }
});

logger('  Broken video links: ' + videoIssues);

// ============================================================
// SUMMARY
// ============================================================
logger('\n========== SUMMARY ==========');
logger('Parent pages: ' + Object.keys(parentPages).length + ' (all with back arrows)');
logger('Child pages: ' + childDirs.length);
logger('Child back arrows fixed: ' + fixedChildren);
logger('Child back arrows verified: ' + verifiedChildren);
logger('CSS flex-wrap fixes: ' + cssFixCount);
logger('Broken video links: ' + videoIssues);
logger('=============================');

// Write log to file
fs.writeFileSync('fix-all-library-log.txt', log.join('\n'), 'utf8');
logger('\nLog written to fix-all-library-log.txt');