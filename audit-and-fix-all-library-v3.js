/**
 * Comprehensive Library Audit & Fix Script
 * 
 * 1. Audits all v3 library pages to check for required elements:
 *    - Back navigation link (.ml-back-arrow)
 *    - Article title (h1)
 *    - Tab framework (.ml-tabs)
 *    - Article body content (.article-overview with actual text)
 *    - Disclaimer text
 *    - CTA button (.ml-cta-row)
 *    - SEO links (.ml-body-links-seo)
 * 
 * 2. Extracts missing content from v2 mirror pages (bratton-pt-mirror-main)
 * 
 * 3. Fixes all missing pages
 */

const fs = require('fs');
const path = require('path');

const V3_LIBRARY = 'bratton-pt-v3/library';
const V2_MIRROR = 'bratton-pt-mirror-main';

// Get all v3 library sub-directories
const v3Dirs = fs.readdirSync(V3_LIBRARY, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

// Category mapping: which parent category each page belongs to
function getCategory(dirName) {
  const cat = dirName.replace(/_\d+$/, '');
  const catMap = {
    'library_ankle': 'ankle',
    'library_back': 'back',
    'library_directions_4031': 'directions',
    'library_elbow': 'elbow',
    'library_exercise_58': 'exercise',
    'library_exercise_60': 'exercise',
    'library_exercise_61': 'exercise',
    'library_exercise_62': 'exercise',
    'library_firstVisit': 'firstVisit',
    'library_health': 'health',
    'library_hip': 'hip',
    'library_knee': 'knee',
    'library_leg': 'leg',
    'library_md': 'md',
    'library_neck': 'neck',
    'library_nl_all': 'nl_all',
    'library_privacy': 'privacy',
    'library_privacybar_privacy': 'privacybar',
    'library_privacybar_terms': 'privacybar',
    'library_privacybar_websiteprivacy': 'privacybar',
    'library_shoulder': 'shoulder',
    'library_systemic': 'systemic',
    'library_treatments': 'treatments',
    'library_wrist': 'wrist',
  };
  return catMap[cat] || null;
}

// Category display names
const categoryLabels = {
  'ankle': 'Foot & Ankle',
  'back': 'Back',
  'directions': 'Directions',
  'elbow': 'Elbow',
  'exercise': 'Exercise',
  'firstVisit': 'First Visit',
  'health': 'Health',
  'hip': 'Hip',
  'knee': 'Knee',
  'leg': 'Leg',
  'md': 'For Physicians',
  'neck': 'Neck',
  'nl_all': 'Newsletters',
  'privacy': 'Privacy',
  'privacybar': 'Privacy Bar',
  'shoulder': 'Shoulder',
  'systemic': 'Systemic',
  'treatments': 'Treatments',
  'wrist': 'Wrist & Hand',
};

function auditV3Page(dirName) {
  const indexPath = path.join(V3_LIBRARY, dirName, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return { dirName, exists: false, issues: ['File missing'] };
  }
  
  const html = fs.readFileSync(indexPath, 'utf8');
  const issues = [];
  
  // Check back navigation
  if (!html.includes('ml-back-arrow')) issues.push('Missing back navigation');
  
  // Check h1 title
  if (!/<h1[^>]*>/.test(html)) issues.push('Missing h1 title');
  
  // Check tab framework
  if (!html.includes('ml-tabs')) issues.push('Missing tab framework');
  
  // Check article overview content (actual text, not just empty div)
  const overviewMatch = html.match(/<div class="article-overview">([\s\S]*?)<\/div>/i);
  if (!overviewMatch) {
    issues.push('Missing article-overview div');
  } else {
    const overviewContent = overviewMatch[1].trim();
    // Strip HTML tags to check for actual text
    const textContent = overviewContent.replace(/<[^>]+>/g, '').trim();
    if (textContent.length < 50) {
      issues.push(`Article body too short or empty (${textContent.length} chars)`);
    }
  }
  
  // Check disclaimer
  if (!html.includes('Disclaimer')) issues.push('Missing disclaimer');
  
  // Check CTA row
  if (!html.includes('ml-cta-row')) issues.push('Missing CTA button row');
  
  // Check SEO links
  if (!html.includes('ml-body-links-seo')) issues.push('Missing SEO body links');
  
  // Extract existing title
  const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  const title = titleMatch ? titleMatch[1].trim() : 'Unknown';
  
  // Extract existing article text length
  let articleTextLength = 0;
  if (overviewMatch) {
    articleTextLength = overviewMatch[1].replace(/<[^>]+>/g, '').trim().length;
  }
  
  return {
    dirName,
    title,
    exists: true,
    issues,
    articleTextLength,
    isHealthy: issues.length === 0,
    category: getCategory(dirName),
  };
}

function extractV2Content(dirName) {
  // The v2 mirror uses the same directory names under bratton-pt-mirror-main/
  const v2Path = path.join(V2_MIRROR, dirName, 'index.html');
  if (!fs.existsSync(v2Path)) {
    return null;
  }
  
  const html = fs.readFileSync(v2Path, 'utf8');
  
  // Extract the article area content from v2
  // v2 pattern: <div id='articleArea'> ... content ... </div>
  const articleMatch = html.match(/<div id='articleArea'>([\s\S]*?)<div class='uk-grid uk-grid-width-small/i);
  if (!articleMatch) {
    // Try alternative pattern
    const altMatch = html.match(/<div id='articleArea'>([\s\S]*?)<\/div>\s*<div class='ml_body_links_seo/i);
    if (!altMatch) {
      // Try to get anything between articleArea and the disclaimer/end
      const broadMatch = html.match(/<div id='articleArea'>([\s\S]*?)<h5>Disclaimer/i);
      if (!broadMatch) return null;
      return { rawContent: broadMatch[1].trim(), source: 'broad' };
    }
    return { rawContent: altMatch[1].trim(), source: 'alt' };
  }
  
  return { rawContent: articleMatch[1].trim(), source: 'standard' };
}

function parseV2ArticleContent(rawContent) {
  // Parse the v2 content to extract structured data
  // v2 uses patterns like:
  // <ul class="uk-tab">...<li><a href=''>Overview</a></li>...</ul>
  // <ul id="article-tab" class="uk-switcher uk-margin"><li><h4>Title</h4>
  // <span class="listtext">...content...</span></li></ul>
  
  let articleTitle = '';
  let articleBody = '';
  let hasVideo = false;
  let videoHtml = '';
  let tabs = [];
  
  // Extract title from h4 in the article tab
  const titleMatch = rawContent.match(/<h4>([^<]+)<\/h4>/);
  if (titleMatch) {
    articleTitle = titleMatch[1].trim();
  }
  
  // Check for tabs
  const tabLinksMatch = rawContent.match(/<ul class="uk-tab"[^>]*>([\s\S]*?)<\/ul>/);
  if (tabLinksMatch) {
    const tabLinkRegex = /<li[^>]*><a[^>]*>([^<]+)<\/a><\/li>/g;
    let tabMatch;
    while ((tabMatch = tabLinkRegex.exec(tabLinksMatch[1])) !== null) {
      tabs.push(tabMatch[1].trim());
    }
  }
  
  // Extract switcher content (the actual article panels)
  const switcherMatch = rawContent.match(/<ul id="article-tab"[^>]*>([\s\S]*?)<\/ul>/);
  if (switcherMatch) {
    const panelsHtml = switcherMatch[1];
    // Split into individual panels
    const panelRegex = /<li>([\s\S]*?)<\/li>/g;
    let panelMatch;
    while ((panelMatch = panelRegex.exec(panelsHtml)) !== null) {
      const panelContent = panelMatch[1].trim();
      
      // Check for video
      if (panelContent.includes('iframe') || panelContent.includes('video')) {
        hasVideo = true;
        const videoMatch = panelContent.match(/(<iframe[\s\S]*?<\/iframe>)/);
        if (videoMatch) videoHtml = videoMatch[1];
      }
      
      // Get the main article body - remove h4 and span wrappers
      let cleanContent = panelContent
        .replace(/<h4>[^<]*<\/h4>/, '')
        .replace(/<span class="listtext">/, '')
        .replace(/<\/span>/, '')
        .trim();
      
      if (cleanContent.length > articleBody.length) {
        articleBody = cleanContent;
      }
    }
  }
  
  // If no structured content found, use the raw content directly
  if (!articleBody && rawContent) {
    // Try to get content from span.listtext
    const listtextMatch = rawContent.match(/<span class="listtext">([\s\S]*?)<\/span>/);
    if (listtextMatch) {
      articleBody = listtextMatch[1].trim();
    }
  }
  
  return {
    articleTitle,
    articleBody,
    hasVideo,
    videoHtml,
    tabs: tabs.length > 0 ? tabs : ['Overview'],
  };
}

function getCategoryLabel(cat) {
  return categoryLabels[cat] || cat;
}

function buildV3ArticleHtml(v2Content) {
  if (!v2Content) return null;
  
  const parsed = parseV2ArticleContent(v2Content.rawContent);
  
  // Build modern v3 tab structure
  let tabsHtml = '';
  if (parsed.tabs.length > 0) {
    const tabId = 'ml-tab-' + Math.random().toString(36).substring(2, 8);
    
    // Tab nav buttons
    tabsHtml += `<div class="ml-tabs" data-ml-tabs="${tabId}">\n`;
    tabsHtml += `  <div class="ml-tab-nav" role="tablist">\n`;
    parsed.tabs.forEach((tab, i) => {
      const isActive = i === 0 ? ' ml-tab-btn--active' : '';
      const ariaSel = i === 0 ? ' aria-selected="true"' : ' aria-selected="false"';
      tabsHtml += `    <button class="ml-tab-btn${isActive}" data-ml-tab="${tabId}-${i}"${ariaSel} role="tab">${tab}</button>\n`;
    });
    tabsHtml += `  </div>\n`;
    
    // Tab panels
    tabsHtml += `  <div class="ml-tab-panels">\n`;
    parsed.tabs.forEach((tab, i) => {
      const isActive = i === 0 ? ' ml-tab-panel--active' : '';
      tabsHtml += `    <div class="ml-tab-panel${isActive}" data-ml-tab-panel="${tabId}-${i}" role="tabpanel">\n`;
      
      if (parsed.hasVideo && i === 0) {
        tabsHtml += `      <div class="article-video">${parsed.videoHtml}</div>\n`;
      }
      
      tabsHtml += `      <div class="article-overview">\n`;
      if (parsed.articleTitle) {
        tabsHtml += `        <h4>${parsed.articleTitle}</h4>\n`;
      }
      tabsHtml += `        ${parsed.articleBody}\n`;
      tabsHtml += `      </div>\n`;
      tabsHtml += `    </div>\n`;
    });
    tabsHtml += `  </div>\n`;
    tabsHtml += `</div>`;
  }
  
  return tabsHtml;
}

// ============ MAIN AUDIT ============
console.log('='.repeat(70));
console.log('AUDIT: Checking all v3 library pages...');
console.log('='.repeat(70));

const auditResults = [];
let totalIssues = 0;
let pagesWithIssues = 0;
let pagesHealthy = 0;

for (const dirName of v3Dirs) {
  const result = auditV3Page(dirName);
  auditResults.push(result);
  
  if (!result.isHealthy) {
    pagesWithIssues++;
    totalIssues += result.issues.length;
  } else {
    pagesHealthy++;
  }
}

// Group by category
const byCategory = {};
for (const r of auditResults) {
  const cat = r.category || 'unknown';
  if (!byCategory[cat]) byCategory[cat] = [];
  byCategory[cat].push(r);
}

console.log(`\nTotal pages: ${v3Dirs.length}`);
console.log(`Healthy pages: ${pagesHealthy}`);
console.log(`Pages with issues: ${pagesWithIssues}`);
console.log(`Total issues found: ${totalIssues}`);
console.log('');

// Print issues grouped by category
for (const [cat, pages] of Object.entries(byCategory).sort()) {
  const badPages = pages.filter(p => !p.isHealthy);
  if (badPages.length === 0) continue;
  
  console.log(`\n--- ${getCategoryLabel(cat)} (${badPages.length}/${pages.length} need fixing) ---`);
  for (const p of badPages) {
    console.log(`  ${p.dirName}: "${p.title}" [${p.articleTextLength} chars]`);
    for (const issue of p.issues) {
      console.log(`    ❌ ${issue}`);
    }
  }
}

// Save audit results
fs.writeFileSync('library-audit-results.json', JSON.stringify(auditResults, null, 2));
console.log('\nAudit saved to library-audit-results.json');

// ============ FIX PASS ============
console.log('\n' + '='.repeat(70));
console.log('FIX: Populating missing content from v2 mirror...');
console.log('='.repeat(70));

let fixedCount = 0;
let skippedCount = 0;
let failedCount = 0;

for (const result of auditResults) {
  if (result.isHealthy) {
    skippedCount++;
    continue;
  }
  
  // Check if the primary issue is article content
  const hasContentIssue = result.issues.some(i => 
    i.includes('Article body too short') || i.includes('Missing article-overview')
  );
  
  if (!hasContentIssue) {
    // Has structural issues but might have content - skip for now
    console.log(`  ⚠ ${result.dirName}: has non-content issues: ${result.issues.join(', ')}`);
    skippedCount++;
    continue;
  }
  
  // Extract v2 content
  const v2Content = extractV2Content(result.dirName);
  if (!v2Content) {
    console.log(`  ❌ ${result.dirName}: No v2 source found`);
    failedCount++;
    continue;
  }
  
  // Build v3 article HTML
  const articleHtml = buildV3ArticleHtml(v2Content);
  if (!articleHtml) {
    console.log(`  ❌ ${result.dirName}: Could not parse v2 content`);
    failedCount++;
    continue;
  }
  
  // Read the v3 file
  const v3Path = path.join(V3_LIBRARY, result.dirName, 'index.html');
  let v3Html = fs.readFileSync(v3Path, 'utf8');
  
  // Find the article-overview section and replace it
  // The v3 pattern: <div class="library-article"> ... <div class="article-overview">OLD</div> ... </div>
  
  // First, check if we need to replace the entire .library-article inner content
  // or just the .article-overview
  
  // Strategy: Replace the content between .library-article opening and the CTA row
  const libArticleStart = v3Html.indexOf('<div class="library-article">');
  if (libArticleStart === -1) {
    console.log(`  ❌ ${result.dirName}: No .library-article container found`);
    failedCount++;
    continue;
  }
  
  // Find the back arrow and title - keep those
  const backArrowMatch = v3Html.match(/<a[^>]*class="ml-back-arrow"[^>]*>.*?<\/a>/);
  const h1Match = v3Html.match(/<h1[^>]*>.*?<\/h1>/);
  
  if (!backArrowMatch || !h1Match) {
    console.log(`  ❌ ${result.dirName}: Missing back arrow or h1`);
    failedCount++;
    continue;
  }
  
  // Find the old article-content area - between </h1> and ml-cta-row
  const afterH1Index = v3Html.indexOf(h1Match[0]) + h1Match[0].length;
  const ctaRowIndex = v3Html.indexOf('ml-cta-row', afterH1Index);
  
  if (ctaRowIndex === -1) {
    console.log(`  ❌ ${result.dirName}: No CTA row found`);
    failedCount++;
    continue;
  }
  
  // Build the new middle section
  const backArrow = backArrowMatch[0];
  const h1 = h1Match[0];
  
  // Find everything before backArrow and after ctaRow
  const beforeBackArrow = v3Html.substring(0, v3Html.indexOf(backArrow));
  const afterCtaRow = v3Html.substring(ctaRowIndex);
  
  const newMiddle = `\n  ${backArrow}\n  ${h1}\n  ${articleHtml}\n  `;
  
  const newHtml = beforeBackArrow + newMiddle + afterCtaRow;
  
  // Write the fixed file
  fs.writeFileSync(v3Path, newHtml, 'utf8');
  console.log(`  ✅ ${result.dirName}: Fixed! (${result.articleTextLength} → content populated)`);
  fixedCount++;
}

console.log(`\n${'='.repeat(70)}`);
console.log(`SUMMARY:`);
console.log(`  Fixed: ${fixedCount}`);
console.log(`  Skipped (healthy or non-content issues): ${skippedCount}`);
console.log(`  Failed: ${failedCount}`);
console.log(`  Total: ${v3Dirs.length}`);
console.log(`${'='.repeat(70)}`);

// ============ RE-AUDIT ============
console.log('\n' + '='.repeat(70));
console.log('RE-AUDIT: Verifying fixes...');
console.log('='.repeat(70));

let stillHasIssues = 0;
for (const dirName of v3Dirs) {
  const result = auditV3Page(dirName);
  if (!result.isHealthy) {
    stillHasIssues++;
    console.log(`  ❌ ${result.dirName}: Still has issues: ${result.issues.join(', ')}`);
  }
}

console.log(`\nPages still with issues after fix: ${stillHasIssues}`);
if (stillHasIssues === 0) {
  console.log('🎉 ALL PAGES PASS AUDIT!');
}