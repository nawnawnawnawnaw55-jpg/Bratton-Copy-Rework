const fs = require('fs');

// === CONFIG ===
const V2_MIRROR = 'bratton-pt-mirror-main';
const V2_ALT = 'bratton-pt-v2';
const V3_LIB = 'bratton-pt-v3/library';

// === HELPERS ===

function extractContent(html) {
  // Find articleArea div (either quote style)
  let aaStart = html.indexOf("id='articleArea'");
  if (aaStart < 0) aaStart = html.indexOf('id="articleArea"');
  if (aaStart < 0) return null;

  // Get everything from articleArea onward
  let content = html.substring(aaStart);

  // Find the end: either uk-grid prev/next links, or another articleArea, or end of switcher
  const endMarkers = [
    "class='uk-grid", 'class="uk-grid',
    "id='articleArea'", 'id="articleArea"',
    '</ul></div>'  // end of switcher
  ];
  let end = content.length;
  for (const marker of endMarkers) {
    const idx = content.indexOf(marker, 50);
    if (idx > 0 && idx < end) end = idx;
  }

  // If we hit </ul></div>, include it
  if (content.indexOf('</ul></div>', 50) === end) {
    end += '</ul></div>'.length;
  }

  content = content.substring(0, end);

  // Clean up v2 markup
  content = content
    .replace(/id='articleArea'\s*>/i, '')
    .replace(/id="articleArea"\s*>/i, '')
    .replace(/<ul class="uk-tab"[^>]*>[\s\S]*?<\/ul>/gi, '')
    .replace(/<ul id="article-tab"[^>]*>/gi, '')
    .replace(/class="uk-switcher[^"]*"/gi, '')
    .replace(/<\/ul>/g, '')
    .replace(/<li>/gi, '')
    .replace(/<\/li>/gi, '')
    .replace(/<span class="listtext">/gi, '')
    .replace(/<\/span>/gi, '')
    .replace(/^<div>\s*/i, '')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();

  return content || null;
}

function extractTitle(content) {
  let m = content.match(/<h4>([^<]+)<\/h4>/);
  if (m) return m[1].trim();
  m = content.match(/<h5>([^<]+)<\/h5>/);
  if (m) return m[1].trim();
  return null;
}

function getV2Content(sourceDir) {
  // Try mirror-main first, then bratton-pt-v2
  let paths = [
    `${V2_MIRROR}/${sourceDir}/index.html`,
    `${V2_ALT}/${sourceDir}/index.html`,
  ];

  for (const p of paths) {
    if (fs.existsSync(p)) {
      const html = fs.readFileSync(p, 'utf8');
      const content = extractContent(html);
      if (content && content.length > 50) return content;
    }
  }
  return null;
}

function makeTabPage(title, content, backHref, backLabel) {
  const tabId = 'ml-tab-' + Math.random().toString(36).substring(2, 8);
  return `
  <a href="${backHref}" class="ml-back-arrow" aria-label="Back to ${backLabel}"><span class="ml-back-arrow-icon">←</span> Back to ${backLabel}</a>
  <h1>${title}</h1>
  <div class="ml-tabs" data-ml-tabs="${tabId}">
  <div class="ml-tab-nav" role="tablist">
    <button class="ml-tab-btn ml-tab-btn--active" data-ml-tab="${tabId}-0" aria-selected="true" role="tab">Overview</button>
  </div>
  <div class="ml-tab-panels">
    <div class="ml-tab-panel ml-tab-panel--active" data-ml-tab-panel="${tabId}-0" role="tabpanel">
  ${content}
    </div>
  </div>
  </div>`;
}

function makeNoTabPage(title, content, backHref, backLabel) {
  return `
  <a href="${backHref}" class="ml-back-arrow" aria-label="Back to ${backLabel}"><span class="ml-back-arrow-icon">←</span> Back to ${backLabel}</a>
  <h1>${title}</h1>
  <div class="article-overview">${content}</div>`;
}

function fixPage(dirName, sourceDir, backHref, backLabel, useTabs) {
  const v3Path = `${V3_LIB}/${dirName}/index.html`;
  if (!fs.existsSync(v3Path)) {
    console.log(`SKIP ${dirName}: v3 not found`);
    return false;
  }

  const content = getV2Content(sourceDir);
  if (!content) {
    console.log(`SKIP ${dirName}: no v2 content found`);
    return false;
  }

  const title = extractTitle(content);
  if (!title) {
    console.log(`SKIP ${dirName}: no title found`);
    return false;
  }

  console.log(`FIX ${dirName}: "${title}" (${content.length} chars, ${useTabs ? 'tabs' : 'no-tabs'})`);

  const articleBlock = useTabs
    ? makeTabPage(title, content, backHref, backLabel)
    : makeNoTabPage(title, content, backHref, backLabel);

  let v3html = fs.readFileSync(v3Path, 'utf8');
  const articleStart = v3html.indexOf('<div class="library-article">');
  const bodyLinksStart = v3html.indexOf('<div class="ml-body-links">');

  if (articleStart < 0 || bodyLinksStart < 0) {
    console.log(`SKIP ${dirName}: cannot find article structure`);
    return false;
  }

  const before = v3html.substring(0, articleStart + '<div class="library-article">'.length);
  const after = v3html.substring(bodyLinksStart);
  v3html = before + articleBlock + '\n' + after;

  fs.writeFileSync(v3Path, v3html, 'utf8');
  console.log(`DONE ${dirName}`);
  return true;
}

function cleanupLeg74() {
  const p = `${V3_LIB}/library_leg_74/index.html`;
  if (!fs.existsSync(p)) return;
  let html = fs.readFileSync(p, 'utf8');
  html = html
    .replace(/<span class="listtext">/g, '')
    .replace(/<\/span>/g, '')
    .replace(/class="uk-switcher[^"]*"/g, '')
    .replace(/id='articleArea'\s*>/g, '>')
    .replace(/id="articleArea"\s*>/g, '>');
  fs.writeFileSync(p, html, 'utf8');
  console.log('DONE library_leg_74 cleanup');
}

// === MAIN ===
console.log('=== FIXING MISSING LIBRARY CONTENT ===\n');

// Already fixed in previous run:
// library_exercise_60 - Cross Training
// library_treatments_2 - Disclaimer

// Remaining: 3 pages from bratton-pt-v2
fixPage('library_health', 'library_health', '/library/', 'Library', false);
fixPage('library_md_72', 'library_md_72', '/library/library_md/', 'Medical Resources', false);
fixPage('library_nl_all', 'library_nl_all', '/library/', 'Library', false);

// Cleanup
console.log('\n=== CLEANUP ===');
cleanupLeg74();

console.log('\n=== DONE ===');