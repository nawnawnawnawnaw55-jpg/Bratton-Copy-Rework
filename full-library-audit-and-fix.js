/**
 * Bratton PT — Full Library Audit & Repair
 * 
 * Audits every library_* directory in bratton-pt-v3/library against the mirror-main source.
 * Generates missing pages, then validates ALL pages for correct structure.
 * 
 * BUGFIX: extractMirrorContent() previously grabbed <h1>Medical Library</h1> as title
 *         and the common sidebar <ul> as article list. Now correctly extracts <h4> from
 *         #article-tab as the real article title, and <span class="listtext"> as body.
 */

const fs = require('fs');
const path = require('path');

const MIRROR = path.join(__dirname, 'bratton-pt-mirror-main');
const V3_LIB = path.join(__dirname, 'bratton-pt-v3', 'library');

// ---- TRUE PARENT PAGES ----
// These are the body-region category pages (from the SVG body diagram) + "Other Choices" pages.
// They are actual parent/category pages that list child articles on the mirror site.
// ALL other library_* dirs are individual article pages.
const PARENTS = new Set([
  // Body diagram region pages
  'library_ankle',
  'library_back',
  'library_elbow',
  'library_hip',
  'library_knee',
  'library_leg',
  'library_neck',
  'library_shoulder',
  'library_wrist',
  // "Other Choices" pages
  'library_systemic',
  'library_treatments',
  'library_md',
  // Exercises (redirects to library_exercise_62 but listed as "Other Choice")
  'library_exercise_62',
]);

// ---- CHECK IF PARENT PAGE ----
// ONLY uses the static PARENTS set. Do NOT use content-based heuristics.
function isParent(dirName) {
  return PARENTS.has(dirName);
}

// ---- NAV HELPER ----
function makeNav(dirName) {
  const depth = '../../';
  return `
        <nav class="ml-breadcrumb" aria-label="Breadcrumb">
          <a href="${depth}index.html">Home</a><span class="ml-sep">/</span>
          <a href="${depth}patcenter/index.html">Patient Center</a><span class="ml-sep">/</span>
          <a href="${depth}library/index.html">Medical Library</a>
        </nav>`;
}

// ---- CSS for library pages (shared) ----
function makeStyle() {
  return `<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{font-size:16px;scroll-behavior:smooth}
body{font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:var(--text,#1a1a2e);background:#fafafa}
:root{--primary:#0a283d;--accent:#f86f26;--accent-hover:#e0650a;--bg-light:#f5f5f5;--text:#1a1a2e;--white:#fff;--border:#ddd}
img{max-width:100%;height:auto}
.ml-page-wrap{max-width:1100px;margin:0 auto;padding:1.5rem}
.ml-breadcrumb{font-size:.85rem;margin-bottom:1rem;color:#555}
.ml-breadcrumb a{color:var(--primary);text-decoration:none}
.ml-breadcrumb a:hover{color:var(--accent);text-decoration:underline}
.ml-sep{margin:0 .5rem;color:#999}
.ml-main-title{font-size:2rem;font-weight:700;color:var(--primary);margin-bottom:.75rem;text-align:center}
.ml-intro{text-align:center;color:#555;margin-bottom:2rem;font-size:.95rem}
/* 3-col parent layout */
.ml-parent-layout{display:grid;grid-template-columns:220px 1fr 220px;gap:2rem;align-items:start}
.ml-col-left{position:sticky;top:1.5rem}
.ml-col-right{position:sticky;top:1.5rem}
.ml-article-list{border:1px solid var(--border);border-radius:8px;overflow:hidden;background:var(--white)}
.ml-article-list h2{font-size:1rem;font-weight:700;background:var(--primary);color:var(--white);padding:.75rem 1rem;margin:0;text-align:center}
.ml-article-list ul{list-style:none;padding:.5rem 0;max-height:60vh;overflow-y:auto}
.ml-article-list li{margin:0}
.ml-article-list a{display:block;padding:.5rem 1rem;color:var(--primary);text-decoration:none;font-size:.9rem;border-bottom:1px solid #f0f0f0;transition:background .15s}
.ml-article-list a:hover{background:#e8f0fe;color:var(--accent)}
.ml-body-diagram{display:flex;justify-content:center}
.ml-body-diagram svg{max-width:100%;height:auto;min-height:350px}
/* Diagram wrapper for positioning */
.ml-diagram-wrapper{position:relative;display:inline-block}
.ml-diagram-wrapper svg{display:block}
.ml-other-choices{position:absolute;bottom:10px;right:10px;display:flex;flex-direction:column;gap:4px}
.ml-other-choices a{display:block;background:var(--accent);color:var(--white);padding:6px 14px;border-radius:20px;text-decoration:none;font-size:.78rem;font-weight:600;text-align:center;transition:background .2s}
.ml-other-choices a:hover{background:var(--accent-hover)}
.ml-svg-wrap{display:flex;justify-content:center}
/* Single article layout */
.ml-article-layout{max-width:750px;margin:0 auto}
.ml-article-title{font-size:1.5rem;font-weight:700;color:var(--primary);margin-bottom:1.5rem;border-bottom:2px solid var(--accent);padding-bottom:.5rem}
.ml-article-body{line-height:1.7;font-size:1rem}
.ml-article-body h5{font-size:1rem;font-weight:700;color:var(--accent);margin:1.5rem 0 .5rem}
.ml-article-body ul,.ml-article-body ol{margin:.5rem 0 1rem 1.5rem}
.ml-article-body li{margin-bottom:.25rem}
.ml-article-body p{margin-bottom:1rem}
/* Buttons */
.ml-btn{display:inline-block;padding:.65rem 1.5rem;border-radius:50px;text-decoration:none;font-weight:600;font-size:.9rem;transition:background .2s,transform .15s;text-align:center;border:none;cursor:pointer}
.ml-btn:hover{transform:translateY(-1px)}
.ml-btn-primary{background:var(--accent);color:var(--white)}
.ml-btn-primary:hover{background:var(--accent-hover);color:var(--white)}
.ml-btn-secondary{background:var(--primary);color:var(--white)}
.ml-btn-secondary:hover{background:#0d3852;color:var(--white)}
.ml-article-actions{display:flex;gap:1rem;margin:2rem 0;flex-wrap:wrap;justify-content:center}
/* Disclaimer */
.ml-disclaimer{border-top:1px solid var(--border);margin-top:2rem;padding-top:1rem;font-size:.78rem;color:#777;line-height:1.5}
.ml-disclaimer h5{font-size:.85rem;color:var(--primary);margin-bottom:.25rem}
/* SEO links */
.ml-seo-links{text-align:center;margin-top:2rem;font-size:.82rem;color:#888}
.ml-seo-links a{color:var(--primary);text-decoration:none;margin:0 .2rem}
.ml-seo-links a:hover{color:var(--accent)}
/* Responsive */
@media(max-width:700px){
.ml-parent-layout{grid-template-columns:1fr;gap:1rem}
.ml-col-left{order:2;position:static}
.ml-col-right{order:3;position:static}
.ml-col-center{order:1}
.ml-body-diagram svg{min-height:auto;max-height:50vh}
.ml-article-list ul{max-height:none}
.ml-other-choices{position:static;flex-direction:row;justify-content:center;margin-top:.5rem;flex-wrap:wrap}
}
</style>`;
}

// ---- SVG BODY DIAGRAM ----
function makeBodySVG() {
  return `<div class="ml-diagram-wrapper">
  <svg id="med-lib-body" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 125.75 337.72" preserveAspectRatio="xMinYMin meet" style="display:block;width:100%;max-width:220px;margin:0 auto">
    <style>
      .ml-body-part{fill:var(--primary);cursor:pointer;transition:fill .2s}
      .ml-body-part:hover{fill:var(--accent)}
    </style>
    <title>Body</title>
    <g>
      <path class="cls-1" fill="#ddd" d="M125.54,180.61l-7.86-11.23-1.53-4.31a213.4,213.4,0,0,0-11.27-40.9l1.39-9.6c2.09-12.24-2.09-27.27-2.09-27.27C109.34,66.56,97.58,63,97.58,63,74.11,56.23,74,48.56,74,48.56l.1-7.62.89-1.2.33-4.63c2.43.28,3.83-3.55,3.83-3.55,2.5-6-1-8.07-1-8.07A18.86,18.86,0,0,0,76.51,6.77,15.23,15.23,0,0,0,65.73.22v0A20.73,20.73,0,0,0,60,.2v0A15.23,15.23,0,0,0,49.24,6.77,18.86,18.86,0,0,0,47.57,23.5s-3.48,2.09-1,8.07c0,0,1.39,3.83,3.83,3.55l.33,4.63.89,1.2.1,7.62S51.64,56.23,28.17,63c0,0-11.75,3.55-6.61,24.28,0,0-4.17,15-2.09,27.27l1.39,9.6A213.41,213.41,0,0,0,9.6,165.06l-1.53,4.31L.21,180.61,0,190s.35,3.44,2.09,1.5l-.35,8.63s.28,2.85,2.92.35c0,0-.83,9.81,3.48,2.92l1.46-2.92s1.46,7.58,4-.21l1.53-4.59s-.07,3.62,1.11,4.24a2.56,2.56,0,0,0,2.5.07s-.14-5.08.83-6.82l1.15-5.25s2.71-7.2.21-13.77c0,0,14.64-25.91,15.34-46.64l.52-10.75a71,71,0,0,1,1,10.23S33.8,148.23,31,156.3c0,0-5,26,4.73,60.24l2.36,8.07A88.47,88.47,0,0,0,39,247.29a75.53,75.53,0,0,0,1.32,37.56s5.49,16.7,5.22,25.6c0,0-1.81,2.92-1.81,4.45,0,0-15.16,12.1-15.86,17l1.11,3.2s0,4.73,7.37,1.53l6.12-2.09s5.15-2.09,5.7-4.45a17.76,17.76,0,0,1,7.37-6s6.78-2.92,2.61-9.91c0,0,1.46-3.76.1-5.74,0,0-2.3-15.55-1-25.15a37,37,0,0,0,2.3-20.35s-2.16-9.39-1.18-12.38c0,0,2.75-10.36,2.12-18.5l2.47-53.77,2.47,53.77c-.63,8.14,2.12,18.5,2.12,18.5,1,3-1.18,12.38-1.18,12.38a37,37,0,0,0,2.3,20.35c1.25,9.6-1,25.15-1,25.15-1.36,2,.1,5.74.1,5.74-4.17,7,2.61,9.91,2.61,9.91a17.76,17.76,0,0,1,7.37,6c.56,2.37,5.7,4.45,5.7,4.45l6.12,2.09c7.37,3.2,7.37-1.53,7.37-1.53l1.11-3.2c-.7-4.87-15.86-17-15.86-17,0-1.53-1.81-4.45-1.81-4.45-.28-8.9,5.22-25.6,5.22-25.6a75.53,75.53,0,0,0,1.32-37.56,88.47,88.47,0,0,0,.83-22.68L90,216.54c9.74-34.23,4.73-60.24,4.73-60.24C92,148.23,87.88,127,87.88,127a71,71,0,0,1,1-10.23l.52,10.75c.7,20.73,15.34,46.64,15.34,46.64-2.5,6.57.21,13.77.21,13.77l1.15,5.25c1,1.74.83,6.82.83,6.82a2.56,2.56,0,0,0,2.5-.07c1.18-.63,1.11-4.24,1.11-4.24l1.53,4.59c2.57,7.79,4,.21,4,.21l1.46,2.92c4.31,6.89,3.48-2.92,3.48-2.92,2.64,2.5,2.92-.35,2.92-.35l-.35-8.63c1.74,1.95,2.09-1.5,2.09-1.5Z"/>
    </g>
    <a xlink:href="../library_neck/index.html" title="Neck"><title>Neck</title><circle class="ml-body-part" r="12" cx="52" cy="50" /></a>
    <a xlink:href="../library_shoulder/index.html" title="Shoulder"><title>Shoulder</title><circle class="ml-body-part" r="12" cx="92" cy="65" /></a>
    <a xlink:href="../library_back/index.html" title="Back"><title>Back</title><circle class="ml-body-part" r="12" cx="62" cy="112" /></a>
    <a xlink:href="../library_elbow/index.html" title="Elbow"><title>Elbow</title><circle class="ml-body-part" r="12" cx="100" cy="125" /></a>
    <a xlink:href="../library_wrist/index.html" title="Wrist"><title>Wrist</title><circle class="ml-body-part" r="12" cx="12" cy="174" /></a>
    <a xlink:href="../library_hip/index.html" title="Hip"><title>Hip</title><circle class="ml-body-part" r="12" cx="78" cy="180" /></a>
    <a xlink:href="../library_knee/index.html" title="Knee"><title>Knee</title><circle class="ml-body-part" r="12" cx="48" cy="243" /></a>
    <a xlink:href="../library_leg/index.html" title="Leg"><title>Leg</title><circle class="ml-body-part" r="12" cx="77" cy="270" /></a>
    <a xlink:href="../library_ankle/index.html" title="Foot and Ankle"><title>Foot and Ankle</title><circle class="ml-body-part" r="12" cx="52" cy="310" /></a>
  </svg>
  <div class="ml-other-choices">
    <a href="../library_systemic/index.html">Systemic</a>
    <a href="../library_treatments/index.html">Treatments</a>
    <a href="../library_exercise_62/index.html">Exercises</a>
    <a href="../library_md/index.html">For Physicians</a>
    <a href="../library_firstVisit/index.html">First Visit</a>
  </div>
</div>`;
}

// ---- SEO BODY LINKS ----
function makeSeoLinks() {
  return `<div class="ml-seo-links">
    <a href="../library_neck/index.html">Neck</a> :
    <a href="../library_shoulder/index.html">Shoulder</a> :
    <a href="../library_back/index.html">Back</a> :
    <a href="../library_elbow/index.html">Elbow</a> :
    <a href="../library_wrist/index.html">Wrist & Hand</a> :
    <a href="../library_hip/index.html">Hip</a> :
    <a href="../library_knee/index.html">Knee</a> :
    <a href="../library_leg/index.html">Leg</a> :
    <a href="../library_ankle/index.html">Ankle & Foot</a>
  </div>`;
}

// ---- DISCLAIMER ----
function makeDisclaimer() {
  return `<div class="ml-disclaimer">
    <h5>Disclaimer</h5>
    <p>The information in this medical library is intended for informational and educational purposes only and in no way should be taken to be the provision or practice of physical therapy, medical, or professional healthcare advice or services. The information should not be considered complete or exhaustive and should not be used for diagnostic or treatment purposes without first consulting with your physical therapist, occupational therapist, physician or other healthcare provider. The owners of this website accept no responsibility for the misuse of information contained within this website.</p>
  </div>`;
}

// ---- EXTRACT MIRROR CONTENT ----
function extractMirrorContent(dirName) {
  const indexFile = path.join(MIRROR, dirName, 'index.html');
  if (!fs.existsSync(indexFile)) return null;

  const raw = fs.readFileSync(indexFile, 'utf8');

  // Skip 403 pages
  if (raw.includes('403 Forbidden')) return { title: '', body: '', articleListHTML: '' };

  // 1. Extract real article title from <h4> inside #article-tab/#articleArea
  let title = '';
  const h4Match = raw.match(/id=["']article(?:-tab|Area)["'][\s\S]*?<h4[^>]*>([\s\S]*?)<\/h4>/i);
  if (h4Match) {
    title = h4Match[1].replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  }
  // Fallback: any <h4> after articleArea
  if (!title) {
    const h4Fallback = raw.match(/id=["']articleArea["'][\s\S]*?<h4[^>]*>([\s\S]*?)<\/h4>/i);
    if (h4Fallback) {
      title = h4Fallback[1].replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }

  // 2. Extract article body from <span class="listtext">
  let body = '';
  const bodyMatch = raw.match(/<span\s+class=["']listtext["'][^>]*>([\s\S]*?)<\/span>/i);
  if (bodyMatch) {
    body = bodyMatch[1].trim();
    body = body.replace(/<h5[^>]*>/gi, '<h5>');
    body = body.replace(/<p[^>]*>/gi, '<p>');
    body = body.replace(/<li[^>]*>/gi, '<li>');
    body = body.replace(/<ul[^>]*>/gi, '<ul>');
    body = body.replace(/<strong[^>]*>/gi, '<strong>');
    body = body.replace(/<em[^>]*>/gi, '<em>');
  }

  // 3. Extract article list from sidebar <ul> (for parent pages)
  let articleListHTML = '';
  const mlArticleMatch = raw.match(/id=["']ml-article["'][\s\S]*?<\/div>/i);
  if (mlArticleMatch) {
    const links = mlArticleMatch[0].match(/<a[^>]*href=["']\/library_[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi);
    if (links) {
      articleListHTML = links.map(l => {
        const hrefMatch = l.match(/href=["']\/(library_[^"']*)["']/i);
        const textMatch = l.match(/>([\s\S]*?)<\/a>/i);
        const href = hrefMatch ? hrefMatch[1] : '';
        const text = textMatch ? textMatch[1].replace(/<[^>]*>/g, '').trim() : '';
        return `<li><a href="../${href}/index.html">${text}</a></li>`;
      }).join('\n');
    }
  }

  return { title, body, articleListHTML };
}

// ---- GENERATE PAGE TITLE FROM DIR NAME ----
function titleFromDirName(dirName) {
  const parts = dirName.replace('library_', '').split('_');
  return parts
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

// ---- GENERATE HTML PAGE ----
function generatePage(dirName) {
  const content = extractMirrorContent(dirName);
  const pageIsParent = isParent(dirName);
  const displayTitle = content && content.title ? content.title : titleFromDirName(dirName);
  const depth = '../../'; // library pages are 2 levels deep from v3 root

  // Build <title> for the page
  const pageTitle = content && content.title
    ? `${content.title} | Bratton Physical Therapy Medical Library`
    : `${displayTitle} | Bratton Physical Therapy`;

  // Determine body class
  const bodyClass = pageIsParent ? 'library-parent-page' : 'library-article-page';

  let mainContentHTML;

  if (pageIsParent) {
    // PARENT PAGE: left column = article list, center = body diagram, right = other choices
    const articleListItems = (content && content.articleListHTML)
      ? content.articleListHTML
      : '<li class="ml-empty">No articles available</li>';

    mainContentHTML = `
    <h1 class="ml-main-title">${displayTitle}</h1>
    <p class="ml-intro">Select an article below to learn more about ${displayTitle.toLowerCase()} conditions and treatments.</p>
    <div class="ml-parent-layout">
      <div class="ml-col-left">
        <div class="ml-article-list">
          <h2>${displayTitle} Articles</h2>
          <ul>${articleListItems}</ul>
        </div>
      </div>
      <div class="ml-col-center ml-body-diagram">
        ${makeBodySVG()}
      </div>
      <div class="ml-col-right">
        <div class="ml-article-list">
          <h2>Quick Links</h2>
          <ul>
            <li><a href="../library_firstVisit/index.html">Your First Visit</a></li>
            <li><a href="../library_privacy/index.html">Privacy Policy</a></li>
            <li><a href="../library_nl_all/index.html">Newsletters</a></li>
          </ul>
        </div>
      </div>
    </div>`;
  } else if (content && content.body) {
    // ARTICLE PAGE with real content from mirror
    mainContentHTML = `
    <div class="ml-article-layout">
      <h1 class="ml-article-title">${displayTitle}</h1>
      <div class="ml-article-body">
        ${content.body}
      </div>
      <div class="ml-article-actions">
        <a href="#" onclick="window.scrollTo({top:0,behavior:'smooth'});return false" class="ml-btn ml-btn-primary">Top of Article</a>
        <a href="../library/index.html" class="ml-btn ml-btn-secondary">Medical Library</a>
        <a href="../patcenter/index.html" class="ml-btn ml-btn-secondary">Patient Center</a>
      </div>
    </div>`;
  } else {
    // NO CONTENT: placeholder article page
    mainContentHTML = `
    <div class="ml-article-layout">
      <h1 class="ml-article-title">${displayTitle}</h1>
      <div class="ml-article-body">
        <p>This article is under development. Please check back soon for more information about ${displayTitle.toLowerCase()}.</p>
      </div>
      <div class="ml-article-actions">
        <a href="../library/index.html" class="ml-btn ml-btn-secondary">Medical Library</a>
        <a href="../patcenter/index.html" class="ml-btn ml-btn-secondary">Patient Center</a>
      </div>
    </div>`;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <meta name="description" content="${displayTitle} — Bratton Physical Therapy Medical Library. Expert physical therapy information for Slidell, LA.">
  <link rel="stylesheet" href="${depth}css/main.css">
  ${makeStyle()}
</head>
<body class="${bodyClass}">
  <div id="site-header"></div>
  <div class="ml-page-wrap">
    ${makeNav(dirName)}
    ${mainContentHTML}
    ${makeSeoLinks()}
    ${makeDisclaimer()}
  </div>
  <div id="site-footer"></div>
  <script>
    // Load header
    fetch('${depth}templates/header.html')
      .then(r => r.text())
      .then(html => { document.getElementById('site-header').innerHTML = html; })
      .catch(() => {});
    // Load footer
    fetch('${depth}templates/footer.html')
      .then(r => r.text())
      .then(html => { document.getElementById('site-footer').innerHTML = html; })
      .catch(() => {});
  </script>
</body>
</html>`;

  const outDir = path.join(V3_LIB, dirName);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');

  const status = pageIsParent ? 'parent'
    : (content && content.body) ? 'article'
    : 'article-no-content';

  return { status, title: displayTitle, isParent: pageIsParent };
}

// ---- VALIDATION ----
function validatePage(dirName) {
  const filePath = path.join(V3_LIB, dirName, 'index.html');
  if (!fs.existsSync(filePath)) return { dir: dirName, issues: ['MISSING: index.html does not exist'] };

  const html = fs.readFileSync(filePath, 'utf8');
  let issues = [];

  // UIKit remnants
  if (html.includes('uk-tab')) issues.push('has uk-tab');
  if (html.includes('uk-switcher')) issues.push('has uk-switcher');
  if (html.includes('uk-badge')) issues.push('has uk-badge');
  if (html.includes('uk-icon-video-camera')) issues.push('has uk-icon-video-camera');
  if (html.includes('uk-grid')) issues.push('has uk-grid');

  // Old layout classes — only flag if used without the ml-parent-layout wrapper
  if (html.includes('ml-two-col')) issues.push('OLD ml-two-col');
  if (html.includes('ml-col-left') && !html.includes('ml-parent-layout')) issues.push('OLD ml-col-left outside ml-parent-layout');
  if (html.includes('ml-col-right') && !html.includes('ml-parent-layout')) issues.push('OLD ml-col-right outside ml-parent-layout');

  // Malformed HTML
  if (/<h5\s+style=[^>]*>/.test(html) && html.includes('ml-parent-article-list')) {
    const articleListStart = html.indexOf('ml-parent-article-list');
    const afterOpen = html.substring(articleListStart);
    const closeDiv = afterOpen.indexOf('</div>');
    const h5InArticle = afterOpen.indexOf('<h5');
    if (closeDiv > -1 && h5InArticle > -1 && h5InArticle < closeDiv) {
      issues.push('malformed h5 in article list');
    }
  }
  if (/<h2\s+class=["']articleList/.test(html))
    issues.push('malformed h2.articleList');
  if (html.includes('listtext'))
    issues.push('has listtext remnant');

  // Required structure
  if (html.includes('id="med-lib-body"')) {
    if (!html.includes('ml-svg-wrap'))
      issues.push('SVG without ml-svg-wrap');
    if (!html.includes('ml-diagram-wrapper'))
      issues.push('SVG without ml-diagram-wrapper');
    if (!html.includes('ml-other-choices'))
      issues.push('SVG without ml-other-choices');
  }

  // Required CSS rules
  if (html.includes('ml-diagram-wrapper')) {
    if (!html.includes('.ml-diagram-wrapper{position:relative'))
      issues.push('ml-diagram-wrapper missing position:relative');
  }
  if (html.includes('ml-other-choices')) {
    if (!html.includes('.ml-other-choices{position:absolute'))
      issues.push('ml-other-choices missing position:absolute');
  }
  if (!html.includes('@media(max-width:700px)')) {
    issues.push('missing mobile breakpoint');
  }

  // Nav loaded properly
  if (!html.includes('id="site-header"')) issues.push('missing site-header placeholder');
  if (!html.includes('id="site-footer"')) issues.push('missing site-footer placeholder');
  // Check for correct fetch paths (../../templates/... for library pages)
  if (!html.includes("fetch('../../templates/header.html')")) issues.push('missing or wrong header fetch');
  if (!html.includes("fetch('../../templates/footer.html')")) issues.push('missing or wrong footer fetch');

  // Styling completeness
  if (!html.includes('var(--accent)')) issues.push('missing CSS variable --accent');
  if (!html.includes('var(--primary)')) issues.push('missing CSS variable --primary');

  // Junk title check
  if (/<title>\s*Medical Library\s*[|<]/.test(html)) {
    issues.push('JUNK TITLE: contains "Medical Library"');
  }

  // Content checks
  if (html.includes('library-article-page')) {
    if (html.includes('This article is under development')) {
      issues.push('ARTICLE NO CONTENT: placeholder text');
    }
    if (!html.includes('ml-article-body') || !/<p[^>]*>[\s\S]{20,}<\/p>/i.test(html)) {
      issues.push('ARTICLE EMPTY or minimal content');
    }
  }

  // Parent page checks
  if (html.includes('library-parent-page')) {
    if (html.includes('No articles available')) {
      issues.push('PARENT EMPTY: no article links');
    }
  }

  return { dir: dirName, issues };
}

// ---- MAIN ----
console.log('=== BRATTON PT — FULL LIBRARY AUDIT & REPAIR ===\n');

// 1. Gather all mirror-main library_* dirs
const mirrorDirs = fs.readdirSync(MIRROR).filter(d => {
  const full = path.join(MIRROR, d);
  return d.startsWith('library_') && fs.statSync(full).isDirectory();
});
console.log(`[1] Mirror-main source dirs: ${mirrorDirs.length}`);

// 2. Gather all v3 library_* dirs
const v3Dirs = fs.readdirSync(V3_LIB, { withFileTypes: true })
  .filter(d => d.isDirectory() && d.name.startsWith('library_'))
  .map(d => d.name);
console.log(`[2] V3 library dirs:     ${v3Dirs.length}`);

// 3. Find missing
const v3Set = new Set(v3Dirs);
const missing = mirrorDirs.filter(d => !v3Set.has(d));
console.log(`[3] Missing from V3:     ${missing.length}`);

if (missing.length > 0) {
  console.log('\n--- MISSING DIRS ---');
  missing.forEach(d => console.log(`  ${d}`));
}

// 4. Find extras (in v3 but not in mirror)
const mirrorSet = new Set(mirrorDirs);
const extras = v3Dirs.filter(d => !mirrorSet.has(d));
console.log(`[4] Extra in V3 (not in mirror-main): ${extras.length}`);
if (extras.length > 0) {
  console.log('  Extras: ' + extras.join(', '));
}

// 5. REGENERATE ALL pages
console.log('\n=== REGENERATING ALL V3 LIBRARY PAGES ===\n');
let genStats = { parent: 0, article: 0, placeholder: 0, noSource: 0, errors: 0 };

mirrorDirs.forEach(dirName => {
  try {
    const result = generatePage(dirName);
    if (result.status === 'parent') genStats.parent++;
    else if (result.status === 'article') genStats.article++;
    else if (result.status === 'article-no-content') genStats.placeholder++;
    else if (result.status === 'no-source') genStats.noSource++;
    console.log(`  ${dirName}: ${result.status} — "${result.title}"`);
  } catch (e) {
    genStats.errors++;
    console.error(`  ${dirName}: ERROR - ${e.message}`);
  }
});

console.log(`\nGeneration summary:`);
console.log(`  Parent pages: ${genStats.parent}`);
console.log(`  Article pages (with content): ${genStats.article}`);
console.log(`  Article pages (no content): ${genStats.placeholder}`);
console.log(`  No source: ${genStats.noSource}`);
console.log(`  Errors: ${genStats.errors}`);

// 6. Full validation of EVERY v3 library page
console.log('\n=== VALIDATING ALL V3 LIBRARY PAGES ===\n');

const allDirs = fs.readdirSync(V3_LIB, { withFileTypes: true })
  .filter(d => d.isDirectory() && d.name.startsWith('library_'))
  .map(d => d.name);

let totalIssues = 0;
let pagesWithIssues = 0;
let cleanPages = 0;

for (const d of allDirs.sort()) {
  const result = validatePage(d);
  if (result.issues.length > 0) {
    pagesWithIssues++;
    totalIssues += result.issues.length;
    console.log(`  FAIL ${d}:`);
    result.issues.forEach(i => console.log(`    - ${i}`));
  } else {
    cleanPages++;
  }
}

console.log(`\n=== FINAL REPORT ===`);
console.log(`Pages checked:   ${allDirs.length}`);
console.log(`Clean:           ${cleanPages}`);
console.log(`With issues:     ${pagesWithIssues}`);
console.log(`Total issues:    ${totalIssues}`);
console.log(`Mirror source:   ${mirrorDirs.length}`);
console.log(`V3 total:        ${allDirs.length}`);

process.exit(totalIssues > 0 ? 1 : 0);