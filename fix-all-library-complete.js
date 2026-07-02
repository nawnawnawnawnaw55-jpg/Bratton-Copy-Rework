const fs = require('fs');
const path = require('path');

const libraryDir = 'bratton-pt-v3/library';
const log = [];

function logger(msg) {
  log.push(msg);
  console.log(msg);
}

// Read all directories
const dirs = fs.readdirSync(libraryDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

// ============================================================
// CATEGORIZE PAGES
// ============================================================

// Parent pages (body-part categories with sub-pages)
const parentPages = {
  'library_ankle': { name: 'Foot & Ankle', display: 'Foot & Ankle' },
  'library_back': { name: 'Back', display: 'Back' },
  'library_elbow': { name: 'Elbow', display: 'Elbow' },
  'library_hip': { name: 'Hip', display: 'Hip' },
  'library_knee': { name: 'Knee', display: 'Knee' },
  'library_leg': { name: 'Leg', display: 'Leg' },
  'library_neck': { name: 'Neck', display: 'Neck' },
  'library_shoulder': { name: 'Shoulder', display: 'Shoulder' },
  'library_wrist': { name: 'Wrist & Hand', display: 'Wrist & Hand' },
};

// Additional parent pages
const extraParentPages = {
  'library_treatments': { name: 'Treatments', display: 'Treatments', parent: '/library/' },
  'library_systemic': { name: 'Systemic Conditions', display: 'Systemic Conditions', parent: '/library/' },
  'library_md': { name: 'MD Resources', display: 'MD Resources', parent: '/library/' },
  'library_privacy': { name: 'Privacy', display: 'Privacy', parent: '/library/' },
  'library_exercise_58': null, // child-like directory
  'library_exercise_60': null,
  'library_exercise_61': null,
  'library_exercise_62': null,
  'library_directions_4031': null,
};

// ============================================================
// 1. FIX ALL MISSING BACK ARROWS
// ============================================================
logger('=== STEP 1: BACK ARROWS ON CHILD PAGES ===');

let arrowsAdded = 0;
let arrowsVerified = 0;

// Map directory name -> its parent category
function getParentCategory(dirName) {
  // Body part children: library_ankle_12 -> library_ankle
  const bodyMatch = dirName.match(/^(library_[a-z]+)_\d+$/);
  if (bodyMatch) {
    const parentDir = bodyMatch[1];
    const parentInfo = parentPages[parentDir];
    if (parentInfo) {
      return { parentDir, displayName: parentInfo.display };
    }
  }
  
  // Systemic children
  if (dirName.startsWith('library_systemic_') && /^\d+$/.test(dirName.replace('library_systemic_', ''))) {
    return { parentDir: 'library_systemic', displayName: 'Systemic Conditions' };
  }
  
  // Treatments children
  if (dirName.startsWith('library_treatments_') && /^\d+$/.test(dirName.replace('library_treatments_', ''))) {
    if (dirName === 'library_treatments_2') {
      return { parentDir: 'library_treatments', displayName: 'Treatments' };
    }
    return { parentDir: 'library_treatments', displayName: 'Treatments' };
  }
  
  // Privacy bar children
  if (dirName.startsWith('library_privacybar_')) {
    return { parentDir: 'library_privacy', displayName: 'Privacy' };
  }
  
  // Other special ones
  if (dirName === 'library_firstVisit') return { parentDir: 'library_treatments', displayName: 'Treatments', overrideURL: '/library/library_treatments/' };
  if (dirName === 'library_health') return { parentDir: 'library', displayName: 'Medical Library', overrideURL: '/library/' };
  if (dirName === 'library_nl_all') return { parentDir: 'library', displayName: 'Medical Library', overrideURL: '/library/' };
  if (dirName.startsWith('library_directions_')) return { parentDir: 'library', displayName: 'Medical Library', overrideURL: '/library/' };
  if (dirName.startsWith('library_md_')) return { parentDir: 'library_md', displayName: 'MD Resources' };
  if (dirName.startsWith('library_exercise_')) return { parentDir: 'library', displayName: 'Medical Library', overrideURL: '/library/' };
  
  return null;
}

// Process ALL directories that could have back arrows (everything except the top-level index and main parents)
const skipDirs = new Set(['library_ankle', 'library_back', 'library_elbow', 'library_hip', 
  'library_knee', 'library_leg', 'library_neck', 'library_shoulder', 'library_wrist',
  'library_treatments', 'library_systemic', 'library_md', 'library_privacy']);

dirs.forEach(dir => {
  if (dir === 'index.html') return;
  if (skipDirs.has(dir)) {
    // These are parent pages - they should have back arrow to /library/
    const filePath = path.join(libraryDir, dir, 'index.html');
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('ml-back-arrow')) {
      arrowsVerified++;
      return;
    }
    // Add back arrow pointing to /library/
    const backArrowHTML = '\n  <a href="/library/" class="ml-back-arrow" aria-label="Back to Medical Library"><span class="ml-back-arrow-icon">←</span> Back to Medical Library</a>\n';
    // Insert before the first h1 or at start of article
    if (content.includes('<h1>')) {
      content = content.replace(/(<h1>)/, backArrowHTML + '$1');
      fs.writeFileSync(filePath, content, 'utf8');
      arrowsAdded++;
      logger('  ' + dir + ': ADDED back arrow -> /library/');
    }
    return;
  }
  
  const parentInfo = getParentCategory(dir);
  if (!parentInfo) {
    // Skip top-level library index
    if (dir === 'index') return;
    // Check if this is one of the lookup dirs with an index
    const filePath = path.join(libraryDir, dir, 'index.html');
    if (fs.existsSync(filePath)) {
      // Unknown child - add link to /library/
      let content = fs.readFileSync(filePath, 'utf8');
      if (!content.includes('ml-back-arrow')) {
        const backArrowHTML = '\n  <a href="/library/" class="ml-back-arrow" aria-label="Back to Medical Library"><span class="ml-back-arrow-icon">←</span> Back to Medical Library</a>\n';
        if (content.includes('<h1>')) {
          content = content.replace(/(<h1>)/, backArrowHTML + '$1');
          fs.writeFileSync(filePath, content, 'utf8');
          arrowsAdded++;
          logger('  ' + dir + ': ADDED back arrow -> /library/ (unknown parent)');
        }
      } else {
        arrowsVerified++;
      }
    }
    return;
  }
  
  // Process the child page
  const filePath = path.join(libraryDir, dir, 'index.html');
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('ml-back-arrow')) {
    arrowsVerified++;
    return;
  }
  
  // Determine URL
  let parentURL;
  if (parentInfo.overrideURL) {
    parentURL = parentInfo.overrideURL;
  } else {
    parentURL = '/library/' + parentInfo.parentDir + '/';
  }
  
  const backArrowHTML = '\n  <a href="' + parentURL + '" class="ml-back-arrow" aria-label="Back to ' + parentInfo.displayName + '"><span class="ml-back-arrow-icon">←</span> Back to ' + parentInfo.displayName + '</a>\n';
  
  // Insert before the first h1 (or at start of .library-article div)
  if (content.includes('<h1>')) {
    content = content.replace(/(<h1>)/, backArrowHTML + '$1');
  } else if (content.includes('<div class="library-article">')) {
    content = content.replace(/(<div class="library-article">)/, '$1' + backArrowHTML);
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  arrowsAdded++;
  logger('  ' + dir + ': ADDED back arrow -> ' + parentURL);
});

logger('\nBack arrows added: ' + arrowsAdded);
logger('Back arrows already present: ' + arrowsVerified);

// ============================================================
// 2. FIX MOBILE TABS - ENSURE flex-wrap:nowrap + overflow-x:auto
// ============================================================
logger('\n=== STEP 2: MOBILE TAB CSS FIXES ===');

let cssFixed = 0;
dirs.forEach(dir => {
  const filePath = path.join(libraryDir, dir, 'index.html');
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Only process pages with tab navigation
  if (!content.includes('ml-tab-nav')) return;
  
  let modified = false;
  
  // Check that .ml-tab-nav has flex-wrap:nowrap
  // The pattern in most pages is: .ml-tab-nav{ overflow-x:auto;display:flex; ... }
  if (!content.includes('flex-wrap:nowrap')) {
    // Find the .ml-tab-nav CSS rule and add flex-wrap:nowrap
    content = content.replace(
      /(\.ml-tab-nav\s*\{[^}]*?)(\})/s,
      '$1flex-wrap:nowrap$2'
    );
    modified = true;
  }
  
  // Ensure mobile media query doesn't override with wrap
  // Check for @media(max-width:700px) section
  if (content.includes('@media(max-width:700px)') || content.includes('@media (max-width:700px)')) {
    // Ensure .ml-tab-nav in mobile keeps nowrap
    if (content.includes('flex-wrap:wrap') || content.includes('flex-wrap: wrap')) {
      content = content.replace(/flex-wrap\s*:\s*wrap/g, 'flex-wrap:nowrap');
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    cssFixed++;
    logger('  CSS fixed: ' + dir);
  }
});

logger('\nCSS fixes applied: ' + cssFixed + ' pages');

// ============================================================
// 3. VERIFY ALL TREATMENT VIDEO LINKS
// ============================================================
logger('\n=== STEP 3: VIDEO LINK VERIFICATION ===');

// Build set of all existing treatment directory numbers
const treatmentDirs = dirs.filter(d => /^library_treatments_\d+$/.test(d));
const existingTreatmentNums = new Set(treatmentDirs.map(d => d.match(/\d+$/)[0]));

let brokenLinks = 0;
let totalLinksChecked = 0;

dirs.forEach(dir => {
  const filePath = path.join(libraryDir, dir, 'index.html');
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Find all links to treatment pages
  const linkRegex = /\/library\/library_treatments_(\d+)\//g;
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    totalLinksChecked++;
    const num = match[1];
    if (!existingTreatmentNums.has(num)) {
      brokenLinks++;
      logger('  BROKEN: ' + dir + ' -> library_treatments_' + num);
    }
  }
});

logger('\nTotal treatment links checked: ' + totalLinksChecked);
logger('Broken treatment links: ' + brokenLinks);
logger('Existing treatment pages: ' + treatmentDirs.length);

// ============================================================
// SUMMARY
// ============================================================
logger('\n========== SUMMARY ==========');
logger('Back arrows added: ' + arrowsAdded);
logger('Back arrows already present: ' + arrowsVerified);
logger('CSS (flex-wrap) fixes: ' + cssFixed);
logger('Broken treatment links: ' + brokenLinks);
logger('All child/parent dirs processed: ' + dirs.length);
logger('=============================');

fs.writeFileSync('fix-all-library-complete-log.txt', log.join('\n'), 'utf8');
console.log('\nLog saved to fix-all-library-complete-log.txt');