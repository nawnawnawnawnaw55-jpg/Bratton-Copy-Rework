/**
 * Library Page Scanner
 * Scans all v3 library pages for layout, mobile, and link issues.
 * Run: node scan-library-pages.js
 */

const fs = require('fs');
const path = require('path');

const LIBRARY_DIR = './bratton-pt-v3/library';
const CRITICAL = true;
let issues = [];
let warnings = [];
let stats = { total: 0, withTabs: 0, parentPages: 0, childPages: 0, treatmentPages: 0 };

function readFile(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); }
  catch (e) { return null; }
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
  // Also check index.html
  const rootHtml = path.join(dir, 'index.html');
  if (fs.existsSync(rootHtml)) result.push(rootHtml);
  return result;
}

function checkFile(filePath) {
  const html = readFile(filePath);
  if (!html) {
    issues.push({ file: filePath, type: 'ERROR', msg: 'File not readable' });
    return null;
  }
  const name = path.basename(path.dirname(filePath));
  const relPath = filePath.replace(/^\.\/bratton-pt-v3\//, '');
  
  stats.total++;
  const data = { filePath, html, name, relPath };
  
  // Determine page type
  const hasTabs = /class="ml-tab-nav"/.test(html);
  const hasParentList = /class="ml-parent-article-list"/.test(html);
  const hasDiagram = /id="med-lib-body"/.test(html);
  const isParent = hasParentList || hasDiagram;
  const isChild = hasTabs;
  const isTreatment = name.startsWith('library_treatments_');
  
  if (isParent) stats.parentPages++;
  if (isChild) stats.childPages++;
  if (isTreatment) stats.treatmentPages++;
  
  data.hasTabs = hasTabs;
  data.isParent = isParent;
  data.isChild = isChild;
  data.isTreatment = isTreatment;
  
  // 1. Check mobile tabs - flex-wrap:wrap is BAD, should be nowrap
  if (hasTabs) {
    const wrapMatch = html.match(/\.ml-tab-nav\s*\{[^}]*flex-wrap\s*:\s*wrap[^}]*\}/);
    if (wrapMatch) {
      issues.push({ file: relPath, type: 'MOBILE_TABS', msg: 'ml-tab-nav uses flex-wrap:wrap (should be nowrap for single-row mobile)' });
    } else {
      // Check if nowrap is explicitly set
      const nowrapMatch = html.match(/\.ml-tab-nav\s*\{[^}]*flex-wrap\s*:\s*nowrap[^}]*\}/);
      if (!nowrapMatch && html.includes('.ml-tab-nav')) {
        warnings.push({ file: relPath, type: 'MOBILE_TABS_WARN', msg: 'No explicit flex-wrap for ml-tab-nav (should have nowrap)' });
      }
    }
  }
  
  // 2. Check back arrow presence in child pages
  if (isChild) {
    const parentRef = html.match(/href="\/library\/library_([^/]+)\/"\s+class="[^"]*ml-back[^"]*"/);
    const backArrow = /ml-back/.test(html);
    if (!backArrow) {
      issues.push({ file: relPath, type: 'NO_BACK_ARROW', msg: 'Child page has no back-arrow navigation link' });
    }
  }
  
  // 3. Check video badges in treatment sections
  if (isChild) {
    const treatmentLinks = html.match(/<a href="\/library\/library_treatments_\d+\/[^"]*">[^<]*<\/a>/g);
    if (treatmentLinks) {
      for (const link of treatmentLinks) {
        const hasVideoBadge = link.includes('video-badge');
        // We can cross-reference with v2 mirror later
        if (!hasVideoBadge) {
          // Not necessarily an error - some treatments may not have videos
        }
      }
    }
  }
  
  // 4. Check tab count and labels
  if (hasTabs) {
    const tabLabels = html.match(/<button[^>]*class="[^"]*ml-tab-btn[^"]*"[^>]*>([^<]+)<\/button>/g);
    if (tabLabels) {
      const labels = tabLabels.map(t => t.match(/>([^<]+)</)[1].trim());
      if (labels.length !== 4) {
        warnings.push({ file: relPath, type: 'TAB_COUNT', msg: `Expected 4 tabs, found ${labels.length}: ${labels.join(', ')}` });
      }
      if (labels[0] && labels[0] !== 'Overview') {
        issues.push({ file: relPath, type: 'TAB_LABEL', msg: `Tab 0 should be "Overview", found "${labels[0]}"` });
      }
      if (labels[1] && labels[1] !== 'Treatments') {
        issues.push({ file: relPath, type: 'TAB_LABEL', msg: `Tab 1 should be "Treatments", found "${labels[1]}"` });
      }
      if (labels[2] && labels[2] !== 'Goals') {
        issues.push({ file: relPath, type: 'TAB_LABEL', msg: `Tab 2 should be "Goals", found "${labels[2]}"` });
      }
      if (labels[3] && labels[3] !== 'Resources') {
        issues.push({ file: relPath, type: 'TAB_LABEL', msg: `Tab 3 should be "Resources", found "${labels[3]}"` });
      }
    }
  }
  
  // 5. Check for overlapping background gradients that cause mobile issues (from v2)
  if (isChild && !html.includes('overflow-x: auto')) {
    const scrollMatch = html.match(/overflow-x:\s*(auto|scroll)/);
    if (!scrollMatch && hasTabs) {
      warnings.push({ file: relPath, type: 'SCROLL', msg: 'ml-tab-nav may need overflow-x:auto for mobile horizontal scroll' });
    }
  }
  
  // 6. Check article-treatment-list structure
  if (hasTabs) {
    const treatmentUl = html.match(/<ul class="article-treatment-list">([\s\S]*?)<\/ul>/);
    if (treatmentUl) {
      // Check for empty treatment list
      const liCount = (treatmentUl[1].match(/<li>/g) || []).length;
      if (liCount === 0) {
        warnings.push({ file: relPath, type: 'EMPTY_TREATMENTS', msg: 'Treatments tab list is empty' });
      }
    }
  }
  
  // 7. Check v2 mirror for treatment video cross-reference
  if (isChild) {
    const mirrorPath = filePath.replace(/bratton-pt-v3\\library\\/, 'bratton-pt-mirror-main\\').replace(/bratton-pt-v3\/library\//, 'bratton-pt-mirror-main/');
    const mirrorHtml = readFile(mirrorPath);
    if (!mirrorHtml) {
      warnings.push({ file: relPath, type: 'NO_MIRROR', msg: 'No v2 mirror file found for cross-reference' });
    } else {
      // Extract treatment links with video badges from mirror
      const mirrorTreatmentRegex = /<li class='treatment'><a href='\/library_treatments_(\d+)\/'>(.*?)(?:<div class="uk-badge[^"]*"><i class="uk-icon-video-camera"><\/i> Video<\/div>)?<\/a><\/li>/g;
      const mirrorMatches = [...mirrorHtml.matchAll(mirrorTreatmentRegex)];
      
      // Extract v3 treatment links
      const v3TreatmentRegex = /<li><a href="\/library\/library_treatments_(\d+)\/[^"]*">([^<]*?)(?:\s*<span class="video-badge">▶ Video<\/span>)?\s*<\/a><\/li>/g;
      const v3Matches = [...html.matchAll(v3TreatmentRegex)];
      
      // Build maps
      const mirrorVideoMap = {};
      for (const m of mirrorMatches) {
        const num = m[1];
        const hasVideo = m[2].includes('uk-icon-video-camera') || m[0].includes('Video');
        if (hasVideo) mirrorVideoMap[num] = true;
      }
      
      for (const v3m of v3Matches) {
        const num = v3m[1];
        const v3HasVideo = v3m[0].includes('video-badge');
        const mirrorHasVideo = mirrorVideoMap[num] === true;
        
        if (mirrorHasVideo && !v3HasVideo) {
          issues.push({ file: relPath, type: 'MISSING_VIDEO_BADGE', msg: `Treatment ${num} has video in v2 mirror but no ▶ Video badge in v3` });
        }
        if (!mirrorHasVideo && v3HasVideo) {
          warnings.push({ file: relPath, type: 'EXTRA_VIDEO_BADGE', msg: `Treatment ${num} has ▶ Video badge in v3 but no video in v2 mirror` });
        }
      }
    }
  }
  
  // 8. Check for v2 code remnants that might indicate copyright issues
  const v2Patterns = [
    { pattern: /uk-badge-notification/, msg: 'v2 badge pattern found' },
    { pattern: /uk-icon-video-camera/, msg: 'v2 video icon pattern found' },
    { pattern: /class='treatment'/, msg: 'v2 treatment class found' },
    { pattern: /class='goal'/, msg: 'v2 goal class found' },
    { pattern: /tm-hover-treatment/, msg: 'v2 tm-hover treatment class found' },
    { pattern: /uk-button uk-button-primary/, msg: 'v2 button pattern found' },
  ];
  for (const v2p of v2Patterns) {
    if (v2p.pattern.test(html)) {
      issues.push({ file: relPath, type: 'V2_COPYRIGHT', msg: v2p.msg });
    }
  }
  
  return data;
}

// Main scan
console.log('🔍 Bratton PT Library Page Scanner\n');
console.log('=' .repeat(60));

const pages = findLibraryPages(LIBRARY_DIR);
console.log(`Found ${pages.length} library pages to scan\n`);

for (const p of pages) {
  checkFile(p);
}

// Print results
console.log('\n' + '='.repeat(60));
console.log('📊 STATISTICS');
console.log('='.repeat(60));
console.log(`  Total pages scanned: ${stats.total}`);
console.log(`  Body-area parent pages: ${stats.parentPages}`);
console.log(`  Article child pages (with tabs): ${stats.childPages}`);
console.log(`  Treatment detail pages: ${stats.treatmentPages}`);
console.log(`  Other pages (index, etc.): ${stats.total - stats.parentPages - stats.childPages - stats.treatmentPages}`);

console.log('\n' + '='.repeat(60));
console.log(`🚨 ISSUES (${issues.length} total)`);
console.log('='.repeat(60));

// Group issues by type
const issuesByType = {};
for (const issue of issues) {
  if (!issuesByType[issue.type]) issuesByType[issue.type] = [];
  issuesByType[issue.type].push(issue);
}

for (const [type, items] of Object.entries(issuesByType)) {
  console.log(`\n  ${type} (${items.length}):`);
  for (const item of items) {
    console.log(`    📄 ${item.file}`);
    if (item.msg) console.log(`       → ${item.msg}`);
  }
}

console.log('\n' + '='.repeat(60));
console.log(`⚠️  WARNINGS (${warnings.length} total)`);
console.log('='.repeat(60));

const warningsByType = {};
for (const w of warnings) {
  if (!warningsByType[w.type]) warningsByType[w.type] = [];
  warningsByType[w.type].push(w);
}

for (const [type, items] of Object.entries(warningsByType)) {
  console.log(`\n  ${type} (${items.length}):`);
  for (const item of items) {
    console.log(`    📄 ${item.file}`);
    if (item.msg) console.log(`       → ${item.msg}`);
  }
}

console.log('\n' + '='.repeat(60));
console.log(`✅ SCAN COMPLETE`);
console.log('='.repeat(60));
console.log(`Issues: ${issues.length} | Warnings: ${warnings.length} | Pages: ${stats.total}`);