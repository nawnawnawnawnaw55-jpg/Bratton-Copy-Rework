#!/usr/bin/env node
/**
 * extract-all-copy.js
 * Extracts every visible text snippet from bratton-pt-v3, deduplicates,
 * captures parent HTML context, and organizes by category into Bratton-Copy-Rework/.
 *
 * PREVIEW FILES: Each snippet's preview is a full page snapshot with all CSS/JS/images
 * loaded from _assets/, Google Fonts included, and the target snippet highlighted in yellow.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SRC_DIR = path.join(__dirname, 'bratton-pt-v3');
const OUT_DIR = path.join(__dirname, 'Bratton-Copy-Rework');
const ASSETS_DIR_REL = '../_assets';

// ── Helpers ───────────────────────────────────────────────
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function hash(text) {
  return crypto.createHash('md5').update(text.trim()).digest('hex').slice(0, 12);
}

/** Strip HTML tags and decode entities, return clean text */
function htmlToText(html) {
  if (!html) return '';
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(d))
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extract title text from <title> tag */
function extractTitle(html) {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i);
  return m ? htmlToText(m[1]).trim() : '';
}

/** Extract meta description */
function extractMetaDesc(html) {
  const m = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  return m ? m[1].trim() : '';
}

/** Find all text-bearing elements and their parent context */
/** Rewrite asset paths in full page HTML to point to _assets/ */
function rewriteAssetPaths(fullPageHtml) {
  return fullPageHtml
    // CSS files
    .replace(/href=["']\/css\//g, 'href="' + ASSETS_DIR_REL + '/css/')
    .replace(/href=['"]\/css\//g, 'href="' + ASSETS_DIR_REL + '/css/')
    // JS files
    .replace(/src=["']\/js\//g, 'src="' + ASSETS_DIR_REL + '/js/')
    .replace(/src=['"]\/js\//g, 'src="' + ASSETS_DIR_REL + '/js/')
    // Image/files
    .replace(/src=["']\/files\//g, 'src="' + ASSETS_DIR_REL + '/files/')
    .replace(/src=['"]\/files\//g, 'src="' + ASSETS_DIR_REL + '/files/')
    .replace(/href=["']\/files\//g, 'href="' + ASSETS_DIR_REL + '/files/')
    .replace(/href=['"]\/files\//g, 'href="' + ASSETS_DIR_REL + '/files/')
    // Favicon
    .replace(/href=["']\/favicon\.ico["']/g, 'href="' + ASSETS_DIR_REL + '/favicon.ico"')
    .replace(/href=['"]\/favicon\.ico['"]/g, 'href="' + ASSETS_DIR_REL + '/favicon.ico"')
    // Background images in inline styles or CSS
    .replace(/url\(["']?\/files\//g, 'url(' + ASSETS_DIR_REL + '/files/')
    // Any remaining absolute-root paths we missed (skip external URLs)
    .replace(/(["'])\/(css|js|files)\//g, '$1' + ASSETS_DIR_REL + '/$2/');
}

/** Strip out header/footer fetch scripts that won't work in preview, and JS includes that break */
function stripNonFunctionalScripts(html) {
  return html
    // Remove header/footer template fetches (they load from /templates/ which won't exist)
    .replace(/<script>[\s\S]*?getElementById\(['"]site-header['"]\)[\s\S]*?<\/script>/gi, '')
    .replace(/<script>[\s\S]*?getElementById\(['"]site-footer['"]\)[\s\S]*?<\/script>/gi, '')
    // Remove the header/footer placeholder divs (they'd be empty and take space)
    .replace(/<div\s+id=["']site-header["']><\/div>/gi, '<!-- site-header placeholder removed for preview -->')
    .replace(/<div\s+id=["']site-footer["']><\/div>/gi, '<!-- site-footer placeholder removed for preview -->')
    // Defer JS execution to prevent errors from missing header/footer
    .replace(/<script\s+src=/gi, '<script defer src=');
}

/** Inject Google Fonts link and snippet-highlight CSS right after <head> */
function injectPreviewHead(html, snippetHtml) {
  const snippetTextPlain = snippetHtml.replace(/<[^>]+>/g, '').trim().slice(0, 200);
  const headEnd = html.indexOf('</head>');
  const injectCSS = `
<!-- COPY-REWORK PREVIEW STYLES -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${ASSETS_DIR_REL}/css/angular.css">
<style>
  body { font-family: 'Montserrat', sans-serif !important; }
  mark.copy-snippet-target, .copy-snippet-target {
    background: rgba(255, 235, 59, 0.45) !important;
    outline: 2px dashed #e6a817 !important;
    outline-offset: 3px !important;
    display: inline !important;
    padding: 2px 4px !important;
    border-radius: 3px !important;
  }
  .copy-snippet-target[style] { /* preserve inline styles but add highlight */ }
  /* Preview banner */
  .copy-preview-banner {
    position: fixed; top: 0; left: 0; right: 0; z-index: 99999;
    background: #1a1a2e; color: #fff; padding: 6px 16px;
    font-family: 'Montserrat', sans-serif; font-size: 12px;
    display: flex; align-items: center; gap: 8px;
  }
  .copy-preview-banner .badge { background: #e6a817; color: #000; padding: 2px 8px; border-radius: 4px; font-weight: 700; }
  .copy-preview-banner .text { opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  body { padding-top: 36px !important; }
</style>
`;
  if (headEnd !== -1) {
    return html.slice(0, headEnd) + injectCSS + '\n' + html.slice(headEnd);
  }
  // No </head> found? Prepend
  return '<head>\n' + injectCSS + '\n</head>\n' + html;
}

/** Wrap the snippet's HTML with a highlight marker in the full page */
function highlightSnippetInHtml(fullHtml, snippetOriginalHtml) {
  // The snippetOriginalHtml is the exact match from extractTextNodes
  // We need to find and wrap the FIRST occurrence (since paths are rewritten, exact match may fail)
  // Try exact match first
  const idx = fullHtml.indexOf(snippetOriginalHtml);
  if (idx !== -1) {
    return fullHtml.slice(0, idx) + '<mark class="copy-snippet-target">' + snippetOriginalHtml + '</mark>' + fullHtml.slice(idx + snippetOriginalHtml.length);
  }
  // Fallback: try to find by stripped text content
  const textContent = snippetOriginalHtml.replace(/<[^>]+>/g, '').trim();
  if (textContent.length > 10) {
    const textIdx = fullHtml.indexOf(textContent);
    if (textIdx !== -1) {
      // Find the enclosing tag
      // Walk back to find < and forward to find >
      let startTag = fullHtml.lastIndexOf('<', textIdx);
      let endTag = fullHtml.indexOf('>', textIdx + textContent.length) + 1;
      if (startTag !== -1 && endTag > startTag) {
        const elementHtml = fullHtml.slice(startTag, endTag);
        return fullHtml.slice(0, startTag) + '<mark class="copy-snippet-target">' + elementHtml + '</mark>' + fullHtml.slice(endTag);
      }
    }
  }
  // Last resort: return with a comment noting where the snippet is
  const snippetEscaped = snippetOriginalHtml.replace(/-->/g, '-- >');
  return fullHtml.replace('<body>', '<body>\n<!-- SNIPPET: ' + snippetEscaped.slice(0, 200) + ' -->\n');
}

/** Inject a banner bar showing snippet metadata */
function injectPreviewBanner(html, snipHash, locations) {
  const locStr = locations.map(l => l.file).join(', ');
  const sectionStr = locations[0] ? locations[0].section : 'unknown';
  const banner = `
<div class="copy-preview-banner">
  <span class="badge">TARGET SNIPPET</span>
  <span class="text">ID: ${snipHash} &nbsp;|&nbsp; Section: ${sectionStr} &nbsp;|&nbsp; Page(s): ${locStr}</span>
</div>
`;
  return html.replace('<body>', '<body>\n' + banner);
}

function extractTextNodes(html) {
  const snippets = [];

  // We extract from the full body, focusing on semantic content elements.
  // Skip script/style/noscript/svg
  const cleanedHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '');

  // Match text-bearing elements with their opening tag attributes
  // We look for: h1-h6, p, li, a, button, summary, label, span, div, th, td, dt, dd,
  //             small, strong, em, b, i, figcaption, blockquote, cite, pre, code,
  //             option, legend, caption
  // but only those that contain meaningful text (not just whitespace)
  const blockRegex = /<((?:h[1-6]|p|li|td|th|dt|dd|figcaption|blockquote|legend|caption|summary|option|pre|label|a|button|span|div|strong|em|b|i|small|cite|code)\b)([^>]*)>([\s\S]*?)<\/\1>/gi;

  let match;
  while ((match = blockRegex.exec(cleanedHtml)) !== null) {
    const tagName = match[1].toLowerCase();
    const attrs = match[2];
    const innerHTML = match[3];

    // Skip if innerHTML contains nested block elements (those will be caught separately)
    // But we want the leaf text nodes
    const text = htmlToText(innerHTML);
    if (text.length < 2) continue; // skip empty/minimal

    // Extract a class/id for a rough selector
    const classMatch = attrs.match(/class=["']([^"']*)["']/);
    const idMatch = attrs.match(/id=["']([^"']*)["']/);
    const hrefMatch = attrs.match(/href=["']([^"']*)["']/);
    const cssClass = classMatch ? classMatch[1] : '';
    const cssId = idMatch ? idMatch[1] : '';

    // Build a rough selector
    let selector = tagName;
    if (cssId) selector += '#' + cssId;
    else if (cssClass) selector += '.' + cssClass.split(' ').join('.');

    // Get parent context - capture surrounding HTML for preview
    // Find the position of this element and grab ~500 chars around it
    const idx = cleanedHtml.indexOf(match[0]);
    const contextStart = Math.max(0, idx - 300);
    const contextEnd = Math.min(cleanedHtml.length, idx + match[0].length + 300);
    const parentContext = cleanedHtml.slice(contextStart, contextEnd).trim();

    snippets.push({
      plainText: text,
      originalHtml: match[0],
      tagName,
      selector,
      parentContext,
      textLength: text.length,
    });
  }

  // Also extract pure text nodes (text outside of matched elements) that are significant
  // This catches things like div text content, etc.
  // But for now, the block-level approach covers >95% of copy.

  return snippets;
}

/** Classify a file path into a category */
function classifyFile(filePath) {
  const rel = path.relative(SRC_DIR, filePath).replace(/\\/g, '/');

  if (rel === 'index.html') return { category: 'homepage', section: 'Homepage', pageName: 'Home' };
  if (rel === 'templates/header.html') return { category: 'templates', section: 'Header', pageName: 'Global Header' };
  if (rel === 'templates/footer.html') return { category: 'templates', section: 'Footer', pageName: 'Global Footer' };

  // Library pages
  if (rel.startsWith('library/')) {
    const parts = rel.replace('library/', '').replace('/index.html', '').split('/');
    const libName = parts[0];
    let subCategory = 'Medical Library';

    // Determine body region
    if (libName.includes('shoulder')) subCategory = 'Medical Library > Shoulder';
    else if (libName.includes('knee')) subCategory = 'Medical Library > Knee';
    else if (libName.includes('back')) subCategory = 'Medical Library > Back';
    else if (libName.includes('neck')) subCategory = 'Medical Library > Neck';
    else if (libName.includes('hip')) subCategory = 'Medical Library > Hip';
    else if (libName.includes('elbow')) subCategory = 'Medical Library > Elbow';
    else if (libName.includes('wrist')) subCategory = 'Medical Library > Wrist & Hand';
    else if (libName.includes('ankle')) subCategory = 'Medical Library > Foot & Ankle';
    else if (libName.includes('leg')) subCategory = 'Medical Library > Leg';
    else if (libName.includes('treatments')) subCategory = 'Medical Library > Treatments';
    else if (libName.includes('systemic')) subCategory = 'Medical Library > Systemic';
    else if (libName.includes('exercise')) subCategory = 'Medical Library > Exercises';
    else if (libName.includes('md')) subCategory = 'Medical Library > For Physicians';
    else if (libName.includes('privacy')) subCategory = 'Medical Library > Legal';
    else if (libName.includes('firstVisit')) subCategory = 'Medical Library > First Visit';
    else if (libName.includes('health')) subCategory = 'Medical Library > Health';
    else if (libName.includes('directions')) subCategory = 'Medical Library > Directions';
    else if (libName.includes('nl_all')) subCategory = 'Medical Library > Newsletter';

    return { category: 'medical-library', section: subCategory, pageName: libName, libPage: true };
  }

  // Condition pages
  if (['shoulder-pain', 'knee-pain', 'back-pain-sciatica', 'neck-pain',
    'acl-injury', 'labral-tear', 'meniscus-tear', 'knee-replacement',
    'joint-pain-arthritis', 'rotator-cuff-tear', 'shoulder-impingement',
    'sprains-strains-tendinitis', 'walking-balance-problems',
    'sports-injuries', 'pre-post-surgical-rehabilitation', 'work-related-injuries'
  ].some(c => rel.startsWith(c + '/'))) {
    const name = rel.split('/')[0];
    const displayName = name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return { category: 'conditions', section: 'Conditions > ' + displayName, pageName: name };
  }

  // Conditions index
  if (rel === 'conditions/index.html') {
    return { category: 'conditions', section: 'Conditions', pageName: 'conditions-index' };
  }

  // Service pages
  if (rel.startsWith('services/')) {
    const parts = rel.replace('services/', '').replace('/index.html', '').split('/');
    const name = parts[0];
    const displayName = name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return { category: 'services', section: 'Services > ' + displayName, pageName: name };
  }
  if (rel === 'services/index.html') {
    return { category: 'services', section: 'Services', pageName: 'services-index' };
  }

  // Core pages (direct children)
  const corePages = ['about', 'contact', 'booking', 'faq', 'staff', 'location',
    'join-our-team', 'reviews', 'insurance', 'paperwork', 'community',
    'patcenter', 'sitemap', 'privacy-policy', 'terms-of-use', 'new-appointment'];
  for (const cp of corePages) {
    if (rel === cp + '/index.html' || rel === cp + '.html') {
      const displayName = cp.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      return { category: 'core-pages', section: 'Core Pages > ' + displayName, pageName: cp };
    }
  }

  return { category: 'other', section: 'Other', pageName: rel };
}

/** Determine the heading/section context for a snippet */
function getSectionContext(snippets, html) {
  // Try to find the nearest preceding heading
  const headings = html.match(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi) || [];
  const headingTexts = headings.map(h => ({
    html: h,
    text: htmlToText(h),
  }));
  return headingTexts;
}

// ── Main extraction ───────────────────────────────────────
function main() {
  console.log('Starting copy extraction from:', SRC_DIR);
  ensureDir(OUT_DIR);

  // Collect all HTML files
  const allFiles = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const fp = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!e.name.startsWith('.') && e.name !== 'node_modules') walk(fp);
      } else if (e.name.endsWith('.html')) {
        allFiles.push(fp);
      }
    }
  }
  walk(SRC_DIR);

  console.log(`Found ${allFiles.length} HTML files`);

  // Master map: snippetHash -> snippet data
  const masterSnippets = {};
  // Page index: file -> { category, title, snippets[] }
  const pageIndex = [];

  let totalSnippetsFound = 0;

  for (const filePath of allFiles) {
    const relPath = path.relative(SRC_DIR, filePath).replace(/\\/g, '/');
    const html = fs.readFileSync(filePath, 'utf8');
    const title = extractTitle(html) || relPath;
    const metaDesc = extractMetaDesc(html);
    const classify = classifyFile(filePath);
    const pageH = hash(relPath);

    // Extract snippets
    const rawSnippets = extractTextNodes(html);

    // Also extract <title> and meta description as snippets
    if (title && title.length > 2) {
      rawSnippets.push({
        plainText: title,
        originalHtml: `<title>${title}</title>`,
        tagName: 'title',
        selector: 'title',
        parentContext: '<head>',
        textLength: title.length,
        isMeta: true,
      });
    }
    if (metaDesc && metaDesc.length > 2) {
      rawSnippets.push({
        plainText: metaDesc,
        originalHtml: `<meta name="description" content="${metaDesc}">`,
        tagName: 'meta',
        selector: 'meta[description]',
        parentContext: '<head>',
        textLength: metaDesc.length,
        isMeta: true,
      });
    }

    const pageSnippetIds = [];

    for (const snippet of rawSnippets) {
      const snipHash = hash(snippet.plainText);

      if (!masterSnippets[snipHash]) {
        masterSnippets[snipHash] = {
          id: snipHash,
          plainText: snippet.plainText,
          originalHtml: snippet.originalHtml,
          tagName: snippet.tagName,
          previewContext: snippet.parentContext,
          textLength: snippet.textLength,
          isShared: false,
          locations: [],
        };
      }

      // Add this location
      masterSnippets[snipHash].locations.push({
        file: relPath,
        selector: snippet.selector,
        category: classify.category,
        section: classify.section,
        pageName: classify.pageName,
        isMeta: snippet.isMeta || false,
      });

      // Mark as shared if > 1
      if (masterSnippets[snipHash].locations.length > 1) {
        masterSnippets[snipHash].isShared = true;
      }

      if (!pageSnippetIds.includes(snipHash)) {
        pageSnippetIds.push(snipHash);
      }
      totalSnippetsFound++;
    }

    pageIndex.push({
      file: relPath,
      title,
      category: classify.category,
      section: classify.section,
      pageName: classify.pageName,
      snippetCount: pageSnippetIds.length,
      snippetIds: pageSnippetIds,
      isLibPage: classify.libPage || false,
    });
  }

  // Build sections grouping
  const sections = {};
  for (const [snipHash, snip] of Object.entries(masterSnippets)) {
    const primaryLocation = snip.locations[0];
    const sectionKey = primaryLocation.section;

    if (!sections[sectionKey]) {
      sections[sectionKey] = {
        section: sectionKey,
        category: primaryLocation.category,
        snippetIds: [],
        pageCount: 0,
      };
    }
    sections[sectionKey].snippetIds.push(snipHash);

    // Count unique pages in this section
    const uniquePages = new Set(snip.locations.map(l => l.file));
    sections[sectionKey].pageCount = Math.max(sections[sectionKey].pageCount || 0, uniquePages.size);
  }

  // Convert to array and sort
  const sectionsArr = Object.values(sections).sort((a, b) => {
    // Sort by category group first
    const catOrder = { 'homepage': 1, 'core-pages': 2, 'conditions': 3, 'services': 4, 'templates': 5, 'medical-library': 6, 'other': 7 };
    const aOrder = catOrder[a.category] || 99;
    const bOrder = catOrder[b.category] || 99;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.section.localeCompare(b.section);
  });

  // Update section page counts properly
  for (const sec of sectionsArr) {
    const pages = new Set();
    for (const sid of sec.snippetIds) {
      for (const loc of masterSnippets[sid].locations) {
        pages.add(loc.file);
      }
    }
    sec.pageCount = pages.size;
  }

  // ── Write output ──────────────────────────────────────────

  // 1. Master snippets JSON
  const masterPath = path.join(OUT_DIR, '_master-snippets.json');
  const masterOutput = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    sourceDir: 'bratton-pt-v3',
    totalUniqueSnippets: Object.keys(masterSnippets).length,
    totalLocations: totalSnippetsFound,
    totalPages: allFiles.length,
    categories: sectionsArr,
    snippets: masterSnippets,
  };
  fs.writeFileSync(masterPath, JSON.stringify(masterOutput, null, 2));
  console.log(`Wrote master snippets: ${masterPath}`);

  // 2. Page index
  const pageIndexPath = path.join(OUT_DIR, '_page-index.json');
  fs.writeFileSync(pageIndexPath, JSON.stringify(pageIndex, null, 2));
  console.log(`Wrote page index: ${pageIndexPath}`);

  // 3. Section files
  const sectionsDir = path.join(OUT_DIR, '_sections');
  ensureDir(sectionsDir);
  for (const sec of sectionsArr) {
    const safeName = sec.section.replace(/[>\/\\]/g, '-').replace(/\s+/g, '-').toLowerCase();
    const secData = {
      section: sec.section,
      category: sec.category,
      pageCount: sec.pageCount,
      snippetCount: sec.snippetIds.length,
      snippets: {},
    };
    for (const sid of sec.snippetIds) {
      secData.snippets[sid] = masterSnippets[sid];
    }
    const secPath = path.join(sectionsDir, safeName + '.json');
    ensureDir(path.dirname(secPath));
    fs.writeFileSync(secPath, JSON.stringify(secData, null, 2));
  }
  console.log(`Wrote ${sectionsArr.length} section files to _sections/`);

  // 4. Preview context files (full page snapshots with highlighted snippets)
  const previewDir = path.join(OUT_DIR, '_preview-context');
  ensureDir(previewDir);
  // Cache rewritten full-page HTML per source file to avoid re-reading
  const pageCache = {};
  function getRewrittenPage(filePathRelative) {
    if (pageCache[filePathRelative]) return pageCache[filePathRelative];
    const fullPath = path.join(SRC_DIR, filePathRelative);
    if (!fs.existsSync(fullPath)) return null;
    let rawHtml = fs.readFileSync(fullPath, 'utf8');
    // Rewrite asset paths
    rawHtml = rewriteAssetPaths(rawHtml);
    // Strip header/footer fetch scripts
    rawHtml = stripNonFunctionalScripts(rawHtml);
    pageCache[filePathRelative] = rawHtml;
    return rawHtml;
  }
  let previewCount = 0;
  for (const [snipHash, snip] of Object.entries(masterSnippets)) {
    // Use the first (primary) location as the source page for preview
    const primaryLoc = snip.locations[0];
    const sourceFile = primaryLoc.file;
    let pageHtml = getRewrittenPage(sourceFile);
    if (!pageHtml) continue; // source missing, skip
    // Inject preview head (Google Fonts, all CSS, angular.css, highlight styles)
    pageHtml = injectPreviewHead(pageHtml, snip.originalHtml);
    // Highlight the target snippet in the page
    pageHtml = highlightSnippetInHtml(pageHtml, snip.originalHtml);
    // Inject metadata banner
    pageHtml = injectPreviewBanner(pageHtml, snipHash, snip.locations);
    const ctxPath = path.join(previewDir, snipHash + '.html');
    fs.writeFileSync(ctxPath, pageHtml);
    previewCount++;
  }
  console.log(`Wrote ${previewCount} preview context files to _preview-context/`);

  // 5. Summary report
  const summaryLines = [
    '═══════════════════════════════════════════════',
    '  COPY EXTRACTION REPORT',
    '═══════════════════════════════════════════════',
    `Total HTML files processed:    ${allFiles.length}`,
    `Total unique text snippets:    ${Object.keys(masterSnippets).length}`,
    `Total snippet locations:       ${totalSnippetsFound}`,
    `Shared snippets (used >1x):    ${Object.values(masterSnippets).filter(s => s.isShared).length}`,
    '',
    'Sections:',
    ...sectionsArr.map(s => `  ${s.section.padEnd(50)} ${String(s.snippetCount).padStart(5)} snippets  (${s.pageCount} pages)`),
    '',
    'Output written to: Bratton-Copy-Rework/',
    '  _master-snippets.json        All unique copy snippets',
    '  _page-index.json             Page-by-page index',
    '  _sections/                   Organized by section',
    '  _preview-context/            HTML context for live preview',
    '═══════════════════════════════════════════════',
  ];
  const summary = summaryLines.join('\n');
  fs.writeFileSync(path.join(OUT_DIR, '_summary.txt'), summary);
  console.log(summary);
}

main();