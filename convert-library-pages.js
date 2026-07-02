/**
 * Convert mirror-main library pages to v3 format.
 * Extracts article content from mirror-main pages and wraps in v3 header/footer template.
 * 
 * Two page types:
 *   - Parent pages (library_ankle, etc.): article list + body diagram + Other Choices
 *   - Child pages (library_ankle_12, etc.): individual article content
 * 
 * TITLE EXTRACTION FIX:
 *   Mirror-main <title> tags contain slug-based text like "Medical Library Neck 25".
 *   This script now extracts the REAL article title from the <h4> inside the Overview
 *   pane of articleArea, which contains the actual human-readable title (e.g., "Neck Pain").
 */
const fs = require('fs');
const path = require('path');

const MIRROR = 'bratton-pt-v2';
const V3 = 'bratton-pt-v3';
const LIB = path.join(V3, 'library');

// Shared CSS/JS paths
const STYLES = [
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
  '<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&display=swap" rel="stylesheet">',
  '<link rel="stylesheet" href="/css/main.css">',
  '<link rel="stylesheet" href="/css/header.css">',
  '<link rel="stylesheet" href="/css/home.css">'
].join('\n');

function esc(str) {
  return str
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}

// Build a full v3 page
function buildPage(title, metaDesc, bodyContent, extraHead = '') {
  const t = esc(title || 'Medical Library');
  const d = esc(metaDesc || 'Medical library article from Bratton Physical Therapy in Slidell, LA.');
  const ogTitle = esc(title || 'Bratton Physical Therapy');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t} — Bratton Physical Therapy | Slidell, LA</title>
<meta name="description" content="${d}">
<meta property="og:title" content="${ogTitle} — Bratton Physical Therapy">
<meta property="og:description" content="${d}">
<meta property="og:url" content="/library/">
<meta property="og:site_name" content="Bratton Physical Therapy">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
${STYLES}
<link rel="shortcut icon" type="image/x-icon" href="/favicon.ico">
<style>
   #med-lib-body a circle{transition:fill .2s, opacity .2s; cursor:pointer; fill:var(--accent); opacity:0.85}
   #med-lib-body a:hover circle{fill:var(--primary); opacity:1}
   .ml-body-link{display:inline-block; margin:2px 4px; color:var(--primary); text-decoration:none; font-weight:600; font-size:0.82rem}
   .ml-body-link:hover{color:var(--accent); text-decoration:underline}
   .ml-body-links{text-align:center; margin:24px 0 32px; line-height:1.8; white-space:nowrap; overflow-x:auto}
   .ml-diagram-wrapper{position:relative; margin-top:16px; max-width:800px; margin-left:auto; margin-right:auto}
   .ml-svg-wrap{text-align:center}
   .ml-svg-wrap svg{width:100%; max-width:200px; height:auto; min-height:240px}
   .ml-other-choices{position:absolute; right:0; top:0; width:180px; display:flex; flex-direction:column; gap:8px; text-align:center}
   .ml-other-choices h2{font-size:1rem; margin:0 0 4px}
   .ml-other-choices .btn{font-size:0.75rem; padding:8px 10px; display:block}
   .library-article h1{font-family:var(--font-heading); color:var(--primary); font-size:1.8rem}
   .library-article h2{font-family:var(--font-heading); color:var(--primary-dark); font-size:1.3rem; margin-top:24px}
   .library-article p, .library-article li{line-height:1.7; margin-bottom:12px}
   .library-article ul, .library-article ol{margin:8px 0 16px 24px}
   .library-article img{max-width:100%; height:auto; margin:16px 0; border-radius:4px}
   .article-section{margin:24px 0; padding-bottom:16px; border-bottom:1px solid #e0e0e0}
   .article-section:last-of-type{border-bottom:none}
   /* ========== Medical Library Tabs (preserved from v2 tab interface) ========== */
   .ml-tabs{margin:24px 0}
   .ml-tab-nav{display:flex; gap:0; border-bottom:2px solid var(--accent); margin-bottom:0; flex-wrap:wrap}
   .ml-tab-btn{flex:1; min-width:100px; padding:10px 14px; background:var(--light-bg, #f5f7fa); border:1px solid #ddd; border-bottom:none; border-radius:6px 6px 0 0; cursor:pointer; font-family:var(--font-heading); font-size:0.9rem; font-weight:600; color:var(--text); text-align:center; transition:background .2s, color .2s, border-color .2s; margin-right:2px; position:relative; bottom:-1px}
   .ml-tab-btn:last-child{margin-right:0}
   .ml-tab-btn:hover{background:var(--accent-light, #e8f0fe); color:var(--primary)}
   .ml-tab-btn--active{background:#fff; color:var(--primary); border-color:var(--accent); border-bottom:2px solid #fff; z-index:1; font-weight:700}
   .ml-tab-panels{margin-top:20px}
   .ml-tab-panel--active{display:block}
   .ml-tab-panel[hidden]{display:none}
   .article-overview h4{font-family:var(--font-heading); color:var(--primary); font-size:1.2rem; margin-bottom:12px}
   .article-treatment-list{list-style:none; margin:0; padding:0; display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:6px}
   .article-treatment-list li{margin:0}
   .article-treatment-list a{display:block; padding:8px 12px; background:var(--light-bg, #f5f7fa); border-radius:4px; color:var(--text); text-decoration:none; font-size:0.92rem; transition:background .2s, color .2s}
   .article-treatment-list a:hover{background:var(--accent); color:#fff}
   .video-badge{display:inline-block; font-size:0.7rem; background:var(--accent); color:#fff; padding:1px 6px; border-radius:3px; margin-left:6px; vertical-align:middle}
   .article-goal-list, .article-resource-list{list-style:disc; margin:8px 0 16px 24px}
   .article-goal-list li, .article-resource-list li{margin-bottom:4px; line-height:1.6}
   .ml-parent-article-list h2{font-family:var(--font-heading); color:var(--primary); font-size:1.2rem; text-align:center; margin-bottom:16px}
   .ml-parent-article-list ul{list-style:none; padding:0; max-width:500px; margin:0 auto}
   .ml-parent-article-list li{margin:0}
   .ml-parent-article-list a{display:block; padding:8px 16px; text-align:center; color:var(--primary); text-decoration:none; font-weight:500; border-bottom:1px solid #e8e8e8; transition:background .2s, color .2s}
   .ml-parent-article-list a:hover{background:var(--accent); color:#fff}
   @media(max-width:700px){
      .ml-diagram-wrapper{position:static; max-width:none}
      .ml-svg-wrap svg{max-width:180px; min-height:200px}
      .ml-other-choices{position:static; width:100%; max-width:300px; margin:20px auto 0}
      .ml-other-choices .btn{font-size:0.82rem; padding:10px 16px}
      .article-treatment-list{grid-template-columns:1fr}
   }
</style>
${extraHead}
</head>
<body>
<div id="site-header"></div>
<script>
  fetch('/templates/header.html')
    .then(function(r){return r.text()})
    .then(function(h){document.getElementById('site-header').innerHTML=h})
    .then(function(){
      var toggle=document.getElementById('menu-toggle');
      var nav=document.getElementById('main-nav');
      if(toggle&&nav){toggle.addEventListener('click',function(){nav.classList.toggle('nav--open')})}
      var path=window.location.pathname;
      document.querySelectorAll('.nav__link').forEach(function(link){
        link.classList.toggle('nav__link--active',link.getAttribute('href')===path);
      });
    });
</script>

<main id="main-content">
  <section class="section">
    <div class="container" style="max-width:800px">
      ${bodyContent}
    </div>
  </section>
</main>

<div id="site-footer"></div>
<script>
  fetch('/templates/footer.html')
    .then(function(r){return r.text()})
    .then(function(f){document.getElementById('site-footer').innerHTML=f});
</script>
<script src="/js/main.js"></script>
<script>
(function(){
  var tabs = document.querySelectorAll('.ml-tabs');
  tabs.forEach(function(tab){
    var btns = tab.querySelectorAll('.ml-tab-btn');
    var panels = tab.querySelectorAll('.ml-tab-panel');
    btns.forEach(function(btn){
      btn.addEventListener('click', function(){
        var id = this.getAttribute('data-ml-tab');
        btns.forEach(function(b){ b.classList.remove('ml-tab-btn--active'); b.setAttribute('aria-selected','false'); });
        panels.forEach(function(p){ p.classList.remove('ml-tab-panel--active'); p.setAttribute('hidden',''); });
        this.classList.add('ml-tab-btn--active');
        this.setAttribute('aria-selected','true');
        var panel = tab.querySelector('[data-ml-tab-panel="' + id + '"]');
        if(panel){ panel.classList.add('ml-tab-panel--active'); panel.removeAttribute('hidden'); }
      });
    });
  });
})();
</script>
</body>
</html>`;
}

// ============ REAL TITLE EXTRACTION ============
// Mirror-main <title> tags contain slug-based garbage like "Medical Library Neck 25".
// We extract the ACTUAL article title from the content <h4> inside the Overview pane.

function extractRealTitle(html, dirName) {
  // Priority 1: <h4> inside articleArea overview pane (e.g., "Neck Pain")
  // Look for the first <h4> after articleArea div opens
  const articleAreaMatch = html.match(/<div\s+id=['"]articleArea['"][^>]*>([\s\S]*?)(?:<\/div>\s*(?:<div\s+class=['"]ml_body_links|$))/i);
  if (articleAreaMatch) {
    const areaContent = articleAreaMatch[1];

    // Find <h4> tag and extract its text content (strip inner HTML like <img>)
    const h4Match = areaContent.match(/<h4[^>]*>\s*(?:<img[^>]*>\s*)?([^<]+)/i);
    if (h4Match && h4Match[1]) {
      const t = h4Match[1].trim();
      // Filter out slug-like titles (containing underscores, "Medical Library", just numbers, or pattern like "Word Number")
      if (
        t.length > 1 &&
        t.length < 200 &&
        !/^Medical Library/i.test(t) &&
        !/^[A-Za-z]+\s+\d+$/.test(t) &&
        !/^[A-Za-z]+_[A-Za-z]+/.test(t)
      ) {
        return { title: t, source: 'article-h4' };
      }
    }

    // Try any <h4> in the article area as fallback
    const anyH4 = areaContent.match(/<h4[^>]*>\s*(?:<img[^>]*>\s*)?([^<]+)/i);
    if (anyH4 && anyH4[1]) {
      const t = anyH4[1].trim();
      if (t.length > 1 && t.length < 200 &&
        !/^Medical Library/i.test(t) &&
        !/^[A-Za-z]+\s+\d+$/.test(t)) {
        return { title: t, source: 'article-h4-fallback' };
      }
    }
  }

  // Priority 2: Try title tag but clean MORE aggressively
  const tm = html.match(/<title>(.*?)<\/title>/i);
  if (tm) {
    let t = tm[1]
      .replace(/\s*\|\s*Bratton Physical Therapy.*/i, '')
      .replace(/^Medical Library\s*/i, '')
      .replace(/\s+\d+$/, '')
      .replace(/^Library\s+/i, '')
      .trim();
    if (t && t.length > 1 && t.length < 200 && !/^[A-Za-z]+\s+\d+$/.test(t)) {
      return { title: t, source: 'title-tag-cleaned' };
    }
  }

  // Priority 3: Cleaned dirName
  return {
    title: dirName.replace(/_/g, ' ').replace(/^library /i, '').replace(/\s+\d+$/, '').trim(),
    source: 'dirname'
  };
}

// Human-friendly parent page titles
const PARENT_TITLES = {
  'library_ankle': 'Foot & Ankle',
  'library_back': 'Back',
  'library_elbow': 'Elbow',
  'library_hip': 'Hip',
  'library_knee': 'Knee',
  'library_leg': 'Leg',
  'library_neck': 'Neck',
  'library_shoulder': 'Shoulder',
  'library_wrist': 'Wrist & Hand',
  'library_systemic': 'Systemic Conditions',
  'library_treatments': 'Treatments',
  'library_md': 'For Physicians',
  'library_exercise_62': 'Exercises',
  'library_privacy': 'Privacy Policy',
  'library_firstVisit': 'Your First Visit',
  'library_directions_4031': 'Directions',
  'library_privacybar_privacy': 'Privacy Policy',
  'library_privacybar_terms': 'Terms of Use',
  'library_privacybar_websiteprivacy': 'Website Privacy',
};

function getParentTitle(dirName) {
  if (PARENT_TITLES[dirName]) return PARENT_TITLES[dirName];
  return dirName.replace(/_/g, ' ').replace(/library /i, '').trim();
}

// ============ EXTRACTION HELPERS ============

function extractMirrorContent(html) {
  const r = { title: '', metaDesc: '', articleArea: '', articleList: '', bodyDiagram: '', otherChoices: '', seoLinks: '', disclaimer: '' };

  const tm = html.match(/<title>(.*?)<\/title>/i);
  if (tm) r.title = tm[1].replace(/\s*\|\s*Bratton Physical Therapy.*/i, '').trim();

  const dm = html.match(/<meta\s+name=['"]description['"]\s+content=['"](.*?)['"]/i);
  if (dm) r.metaDesc = dm[1].trim();

  const am = html.match(/<div\s+id=['"]articleArea['"][^>]*>([\s\S]*?)<\/div>\s*(?:<div\s+class=['"]ml_body_links|$)/i);
  if (am) r.articleArea = am[1].trim();

  const lm = html.match(/<div\s+id=['"]ml-article['"][^>]*>([\s\S]*?)<\/div>/i);
  if (lm) r.articleList = lm[1].trim();

  // We no longer use extracted bodyDiagram - always use makeBodyDiagram() instead
  const sm = html.match(/<svg[^>]*id=['"]med-lib-body['"][\s\S]*?<\/svg>/i);
  if (sm) r.bodyDiagram = sm[0].trim();

  const om = html.match(/<div[^>]*>\s*<h2[^>]*>Other Choices<\/h2>([\s\S]*?)(?=<div\s+id=['"]medlib|$)/i);
  if (om) r.otherChoices = om[1].trim();

  const sl = html.match(/<div\s+class=['"]ml_body_links_seo[^>]*>([\s\S]*?)<\/div>/i);
  if (sl) r.seoLinks = sl[0].trim();

  const dis = html.match(/<div[^>]*id=['"]disclaimer['"][^>]*>([\s\S]*?)<\/div>/i);
  if (dis) r.disclaimer = dis[0].trim();

  return r;
}

function fixLibraryLinks(html) {
  // Rewrite root-level library links to /library/ subfolder
  // Matches href="/library_X" or href='/library_X' patterns
  return (html || '').replace(/(href\s*=\s*['"])\/(library_[^'"\/]+)/g, '$1/library/$2');
}

// ============ ARTICLE LIST CLEANUP FOR PARENT PAGES ============

function cleanParentArticleList(rawHtml) {
  // The raw input looks like:
  // <h2 class='uk-text-center' id='articleList'>Hip Articles</h5><ul><li><a href='/library_hip_7/'>Quadriceps...</a></li>...</ul>
  if (!rawHtml) return '<p style="text-align:center;color:#888">No articles available. Please browse our <a href="/library/">Medical Library</a>.</p>';

  let html = rawHtml;

  // Fix mangled h2/h5 mismatch
  html = html.replace(/<h2\s+class='[^']*'\s+id='articleList'>([^<]*)<\/h5>/i, '<h2>$1</h2>');
  html = html.replace(/<h2[^>]*id=['"]articleList['"][^>]*>([^<]*)<\/h5>/i, '<h2>$1</h2>');
  html = html.replace(/<h\d[^>]*id=['"]articleList['"][^>]*>/i, '<h2>');

  // Fix any stray closing h5 tags
  html = html.replace(/<\/h5>/gi, '</h2>');

  // Strip UIKit classes from list items and links
  html = html.replace(/\s*class=['"][^'"]*uk[^'"]*['"]/gi, '');

  // Strip inline style attributes (these were added by old stripUkClasses)
  html = html.replace(/\s*style\s*=\s*['"]display\s*:\s*block\s*;\s*text-align\s*:\s*center['"]\s*/gi, '');

  // Fix links in article list
  html = fixLibraryLinks(html);

  // Clean up class="" empty attributes  
  html = html.replace(/\s+class=['"]\s*['"]/g, '');

  // Wrap in parent article list container
  return `<div class="ml-parent-article-list">${html}</div>`;
}

// ============ ARTICLE CONTENT CLEANUP FOR CHILD PAGES ============

function cleanArticleContent(rawArticle) {
  // The raw input is the entire #articleArea content with UIKit tab structure:
  // <ul class="uk-tab">...tabs...</ul>
  // <ul id="article-tab" class="uk-switcher">
  //   <li>overview pane</li>
  //   <li>treatments pane</li>
  //   <li>goals pane</li>
  //   <li>resources pane</li>
  // </ul>
  // <div class='uk-grid'>...buttons...</div>
  //
  // PRESERVES the tabbed interface from v2 but replaces UIKit tabs
  // with a clean CSS+JS tab system compatible with the v3 design.
  if (!rawArticle) return '<p style="text-align:center;color:#888">Article content is being updated. Please check back soon.</p>';

  let html = rawArticle;

  // 1. Remove the spinner/loading div
  html = html.replace(/<div[^>]*class=['"][^'"]*spinner[^'"]*['"][^>]*>[\s\S]*?<\/div>/gi, '');

  // 2. Extract tab labels from uk-tab list
  const tabLabels = [];
  const tabMatch = html.match(/<ul[^>]*class=['"][^'"]*uk-tab[^'"]*['"][^>]*>([\s\S]*?)<\/ul>/i);
  if (tabMatch) {
    const labelMatches = tabMatch[1].match(/<a[^>]*>([\s\S]*?)<\/a>/gi);
    if (labelMatches) {
      labelMatches.forEach(a => {
        const text = a.replace(/<[^>]*>/g, '').replace(/<span>/gi, '').replace(/<\/span>/gi, '').trim();
        if (text) tabLabels.push(text);
      });
    }
    // Remove the tab navigation ul entirely
    html = html.replace(/<ul[^>]*class=['"][^'"]*uk-tab[^'"]*['"][^>]*>[\s\S]*?<\/ul>/i, '');
  }

  // 3. Extract article tab panes from uk-switcher (depth-counting parsers for nested <ul> and <li>)
  const tabPanes = [];
  const switcherOpenMatch = html.match(/<ul[^>]*id=['"]article-tab['"][^>]*>/i);
  if (switcherOpenMatch) {
    const startIdx = switcherOpenMatch.index;
    const afterOpen = startIdx + switcherOpenMatch[0].length;
    // Depth-counting for outer <ul>...</ul> (skip nested <ul> elements)
    let ulDepth = 1;
    let innerEnd = -1;
    for (let j = afterOpen; j < html.length - 4; j++) {
      if (html.substr(j, 4) === '<ul>' || html.substr(j, 4) === '<ul ' || html.substr(j, 5) === '<ul\n') {
        ulDepth++;
      } else if (html.substr(j, 5) === '</ul>') {
        ulDepth--;
        if (ulDepth === 0) {
          innerEnd = j;
          break;
        }
      }
    }
    if (innerEnd >= 0) {
      const inner = html.substring(afterOpen, innerEnd);
      // Depth-counting parser for top-level <li> pairs
      let liDepth = 0;
      let currentStart = -1;
      for (let j = 0; j < inner.length - 3; j++) {
        if (inner.substr(j, 4) === '<li>' || inner.substr(j, 4) === '<li ' || inner.substr(j, 5) === '<li\n') {
          liDepth++;
          if (liDepth === 1) currentStart = j;
        } else if (inner.substr(j, 5) === '</li>') {
          if (liDepth === 1 && currentStart >= 0) {
            const gtPos = inner.indexOf('>', currentStart);
            const contentStart = gtPos >= 0 ? gtPos + 1 : currentStart + 4;
            const content = inner.substring(contentStart, j).trim();
            if (content) tabPanes.push(content);
            currentStart = -1;
          }
          liDepth--;
        }
      }
      // Remove the switcher ul entirely (using depth-counted slice)
      html = html.substring(0, startIdx) + html.substring(innerEnd + 5);
    }
  }

  // 4. Remove button grid (Top of Article / List of Articles)
  html = html.replace(/<div[^>]*class=['"][^'"]*uk-grid[^'"]*['"][^>]*>[\s\S]*?<\/div>/gi, '');

  // 5. Build tabbed interface from tabs + panes (preserving the v2 tab menu pattern)
  if (tabLabels.length > 0 && tabPanes.length > 0) {
    const uniqueId = 'ml-tab-' + Math.random().toString(36).slice(2, 8);
    const tabButtons = [];
    const tabPanels = [];
    const minLen = Math.min(tabLabels.length, tabPanes.length);

    for (let i = 0; i < minLen; i++) {
      const label = tabLabels[i];
      const labelSlug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
      const isActive = i === 0;
      let paneHtml = tabPanes[i];

      // Clean pane content based on tab type
      if (label === 'Overview') {
        paneHtml = cleanOverviewPane(paneHtml);
      } else if (label === 'Treatments') {
        paneHtml = cleanTreatmentsPane(paneHtml);
      } else if (label === 'Goals') {
        paneHtml = cleanGoalsPane(paneHtml);
      } else if (label === 'Resources') {
        paneHtml = cleanResourcesPane(paneHtml);
      }

      tabButtons.push(`<button class="ml-tab-btn${isActive ? ' ml-tab-btn--active' : ''}" data-ml-tab="${uniqueId}-${i}" aria-selected="${isActive}" role="tab">${esc(label)}</button>`);
      tabPanels.push(`<div class="ml-tab-panel${isActive ? ' ml-tab-panel--active' : ''}" data-ml-tab-panel="${uniqueId}-${i}" role="tabpanel"${isActive ? '' : ' hidden'}>
  ${paneHtml}
</div>`);
    }

    return `<div class="ml-tabs" data-ml-tabs="${uniqueId}">
  <div class="ml-tab-nav" role="tablist">
    ${tabButtons.join('\n    ')}
  </div>
  <div class="ml-tab-panels">
    ${tabPanels.join('\n    ')}
  </div>
</div>`;
  }

  // 6. Fallback: if no tabs found, just clean the HTML
  return cleanFallbackArticle(html);
}

function cleanOverviewPane(paneHtml) {
  let html = paneHtml;

  // Extract h4 (article title) - keep it
  const h4Match = html.match(/<h4[^>]*>(.*?)<\/h4>/i);
  let titleHtml = '';
  if (h4Match) {
    titleHtml = h4Match[0];
    html = html.replace(h4Match[0], '');
  }

  // Fix any <span class='listtext'> OR <span style='listtext'> OR <span class='llisttext'> wrappers
  html = html.replace(/<span[^>]*(?:class|style)\s*=\s*['"]l?listtext['"][^>]*>/gi, '');
  html = html.replace(/<\/span>/gi, '');

  // Fix img tags - strip border attribute, add styling handled by CSS
  html = html.replace(/\s*border\s*=\s*['"]0['"]/gi, '');
  
  // Fix image src for ptclinic.com (keep external)
  
  // Clean table wrappers - unwrap single-cell tables
  html = html.replace(/<table>[\s\n]*<tr>[\s\n]*<td[^>]*>([\s\S]*?)<\/td>[\s\n]*<\/tr>[\s\n]*<\/table>/gi, '$1');

  // Fix library links
  html = fixLibraryLinks(html);

  // Remove UIKit classes
  html = html.replace(/\s*class=['"][^'"]*uk[^'"]*['"]/gi, '');

  return `<div class="article-overview">${titleHtml}${html}</div>`;
}

function cleanTreatmentsPane(paneHtml) {
  let html = paneHtml;

  // Extract h4 header
  const h4Match = html.match(/<h4[^>]*class=['"]treatment['"][^>]*>(.*?)<\/h4>/i);
  html = html.replace(/<h4[^>]*>.*?<\/h4>/i, '');

  // Extract list items
  const liMatches = html.match(/<li[^>]*>[\s\S]*?<\/li>/gi);
  const items = [];
  if (liMatches) {
    liMatches.forEach(li => {
      // Extract the link and text
      const linkMatch = li.match(/<a[^>]*href=['"]([^'"]*)['"][^>]*>([\s\S]*?)<\/a>/i);
      if (linkMatch) {
        let href = linkMatch[1];
        let linkText = linkMatch[2];

        // Fix library links
        href = href.replace(/^\/(library_[^\/]+)/, '/library/$1');

        // Replace UIKit video badge: <div class="uk-badge uk-badge-notification"><i class="uk-icon-video-camera"></i> Video</div>
        // With clean badge
        const hasVideo = /uk-icon-video-camera/i.test(linkText);
        linkText = linkText.replace(/<div[^>]*class=['"][^'"]*uk-badge[^'"]*['"][^>]*>[\s\S]*?<\/div>/gi, '');
        linkText = linkText.replace(/<i[^>]*uk-icon[^>]*>[\s\S]*?<\/i>/gi, '');
        linkText = linkText.trim();

        if (linkText) {
          const badge = hasVideo ? ' <span class="video-badge">▶ Video</span>' : '';
          items.push(`<li><a href="${href}">${esc(linkText)}${badge}</a></li>`);
        }
      }
    });
  }

  if (items.length === 0) {
    return '<p>Treatment information is being updated.</p>';
  }

  return `<ul class="article-treatment-list">\n  ${items.join('\n  ')}\n</ul>`;
}

function cleanGoalsPane(paneHtml) {
  let html = paneHtml;

  // Remove h4 header
  html = html.replace(/<h4[^>]*>.*?<\/h4>/i, '');

  // Extract list items
  const liMatches = html.match(/<li[^>]*>(.*?)<\/li>/gi);
  const items = [];
  if (liMatches) {
    liMatches.forEach(li => {
      let text = li.replace(/<li[^>]*>/i, '').replace(/<\/li>/i, '').trim();
      text = text.replace(/<[^>]*>/g, ''); // strip any remaining tags
      if (text) items.push(`<li>${esc(text)}</li>`);
    });
  }

  if (items.length === 0) {
    return '<p>Goal information is being updated.</p>';
  }

  return `<ul class="article-goal-list">\n  ${items.join('\n  ')}\n</ul>`;
}

function cleanResourcesPane(paneHtml) {
  let html = paneHtml;

  // Remove h4 header
  html = html.replace(/<h4[^>]*>.*?<\/h4>/i, '');

  // Extract list items with links
  const liMatches = html.match(/<li[^>]*>[\s\S]*?<\/li>/gi);
  const items = [];
  if (liMatches) {
    liMatches.forEach(li => {
      const linkMatch = li.match(/<a[^>]*href=['"]([^'"]*)['"][^>]*>(.*?)<\/a>/i);
      if (linkMatch) {
        let href = linkMatch[1];
        let text = linkMatch[2].replace(/<[^>]*>/g, '').trim();
        if (text) {
          items.push(`<li><a href="${href}" target="_blank" rel="noopener">${esc(text)}</a></li>`);
        }
      } else {
        let text = li.replace(/<li[^>]*>/i, '').replace(/<\/li>/i, '').replace(/<[^>]*>/g, '').trim();
        if (text) items.push(`<li>${esc(text)}</li>`);
      }
    });
  }

  if (items.length === 0) {
    return '<p>Resource information is being updated.</p>';
  }

  return `<ul class="article-resource-list">\n  ${items.join('\n  ')}\n</ul>`;
}

function cleanFallbackArticle(html) {
  // If no tab structure found, do basic cleanup
  html = html
    .replace(/<div[^>]*class=['"][^'"]*spinner[^'"]*['"][^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/class=['"][^'"]*uk[^'"]*['"]/gi, '')
    .replace(/<i[^>]*uk-icon[^>]*>[\s\S]*?<\/i>/gi, '')
    .replace(/<div[^>]*class=['"][^'"]*uk-badge[^'"]*['"][^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<div[^>]*class=['"][^'"]*uk-grid[^'"]*['"][^>]*>[\s\S]*?<\/div>/gi, '');

  html = fixLibraryLinks(html);
  return html;
}

// Parent pages that have article lists + body diagram
const PARENT_PAGES = new Set([
  'library_ankle', 'library_back', 'library_elbow', 'library_hip',
  'library_knee', 'library_leg', 'library_neck', 'library_shoulder',
  'library_wrist', 'library_systemic', 'library_treatments', 'library_md',
  'library_exercise_62', 'library_privacy', 'library_firstVisit',
  'library_directions_4031', 'library_privacybar_privacy',
  'library_privacybar_terms', 'library_privacybar_websiteprivacy'
]);

function isParent(dirName) { return PARENT_PAGES.has(dirName); }

// Build body diagram with standardized SVGs + clean links
function makeBodyDiagram() {
  return `<svg id='med-lib-body' version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 125.75 337.72" preserveAspectRatio="xMinYMin meet">
    <defs></defs><title>Body</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><path class="cls-1" d="M125.54,180.61l-7.86-11.23-1.53-4.31a213.4,213.4,0,0,0-11.27-40.9l1.39-9.6c2.09-12.24-2.09-27.27-2.09-27.27C109.34,66.56,97.58,63,97.58,63,74.11,56.23,74,48.56,74,48.56l.1-7.62.89-1.2.33-4.63c2.43.28,3.83-3.55,3.83-3.55,2.5-6-1-8.07-1-8.07A18.86,18.86,0,0,0,76.51,6.77,15.23,15.23,0,0,0,65.73.22v0A20.73,20.73,0,0,0,60,.2v0A15.23,15.23,0,0,0,49.24,6.77,18.86,18.86,0,0,0,47.57,23.5s-3.48,2.09-1,8.07c0,0,1.39,3.83,3.83,3.55l.33,4.63.89,1.2.1,7.62S51.64,56.23,28.17,63c0,0-11.75,3.55-6.61,24.28,0,0-4.17,15-2.09,27.27l1.39,9.6A213.41,213.41,0,0,0,9.6,165.06l-1.53,4.31L.21,180.61,0,190s.35,3.44,2.09,1.5l-.35,8.63s.28,2.85,2.92.35c0,0-.83,9.81,3.48,2.92l1.46-2.92s1.46,7.58,4-.21l1.53-4.59s-.07,3.62,1.11,4.24a2.56,2.56,0,0,0,2.5.07s-.14-5.08.83-6.82l1.15-5.25s2.71-7.2.21-13.77c0,0,14.64-25.91,15.34-46.64l.52-10.75a71,71,0,0,1,1,10.23S33.8,148.23,31,156.3c0,0-5,26,4.73,60.24l2.36,8.07A88.47,88.47,0,0,0,39,247.29a75.53,75.53,0,0,0,1.32,37.56s5.49,16.7,5.22,25.6c0,0-1.81,2.92-1.81,4.45,0,0-15.16,12.1-15.86,17l1.11,3.2s0,4.73,7.37,1.53l6.12-2.09s5.15-2.09,5.7-4.45a17.76,17.76,0,0,1,7.37-6s6.78-2.92,2.61-9.91c0,0,1.46-3.76.1-5.74,0,0-2.3-15.55-1-25.15a37,37,0,0,0,2.3-20.35s-2.16-9.39-1.18-12.38c0,0,2.75-10.36,2.12-18.5l2.47-53.77,2.47,53.77c-.63,8.14,2.12,18.5,2.12,18.5,1,3-1.18,12.38-1.18,12.38a37,37,0,0,0,2.3,20.35c1.25,9.6-1,25.15-1,25.15-1.36,2,.1,5.74.1,5.74-4.17,7,2.61,9.91,2.61,9.91a17.76,17.76,0,0,1,7.37,6c.56,2.37,5.7,4.45,5.7,4.45l6.12,2.09c7.37,3.2,7.37-1.53,7.37-1.53l1.11-3.2c-.7-4.87-15.86-17-15.86-17,0-1.53-1.81-4.45-1.81-4.45-.28-8.9,5.22-25.6,5.22-25.6a75.53,75.53,0,0,0,1.32-37.56,88.47,88.47,0,0,0,.83-22.68L90,216.54c9.74-34.23,4.73-60.24,4.73-60.24C92,148.23,87.88,127,87.88,127a71,71,0,0,1,1-10.23l.52,10.75c.7,20.73,15.34,46.64,15.34,46.64-2.5,6.57.21,13.77.21,13.77l1.15,5.25c1,1.74.83,6.82.83,6.82a2.56,2.56,0,0,0,2.5-.07c1.18-.63,1.11-4.24,1.11-4.24l1.53,4.59c2.57,7.79,4,.21,4,.21l1.46,2.92c4.31,6.89,3.48-2.92,3.48-2.92,2.64,2.5,2.92-.35,2.92-.35l-.35-8.63c1.74,1.95,2.09-1.5,2.09-1.5Z" fill="var(--primary)" stroke="var(--primary-dark)" stroke-width="0.5"/></g></g>
    <!-- One circle per body section, alternating sides (v2-style layout) -->
    <a href="/library/library_neck/" title="Neck"><title>Neck</title><circle r="12" cx="52" cy="50"/></a>
    <a href="/library/library_shoulder/" title="Shoulder"><title>Shoulder</title><circle r="12" cx="92" cy="65"/></a>
    <a href="/library/library_back/" title="Back"><title>Back</title><circle r="12" cx="62" cy="112"/></a>
    <a href="/library/library_elbow/" title="Elbow"><title>Elbow</title><circle r="12" cx="100" cy="125"/></a>
    <a href="/library/library_wrist/" title="Wrist & Hand"><title>Wrist & Hand</title><circle r="12" cx="12" cy="174"/></a>
    <a href="/library/library_hip/" title="Hip"><title>Hip</title><circle r="12" cx="78" cy="180"/></a>
    <a href="/library/library_knee/" title="Knee"><title>Knee</title><circle r="12" cx="48" cy="243"/></a>
    <a href="/library/library_leg/" title="Leg"><title>Leg</title><circle r="12" cx="77" cy="270"/></a>
    <a href="/library/library_ankle/" title="Foot & Ankle"><title>Foot & Ankle</title><circle r="12" cx="52" cy="310"/></a>
  </svg>`;
}

function makeSeoLinks() {
return '<div class="ml-body-links"><a href="/library/library_neck/" class="ml-body-link">Neck</a><a href="/library/library_shoulder/" class="ml-body-link">Shoulder</a><a href="/library/library_back/" class="ml-body-link">Back</a><a href="/library/library_elbow/" class="ml-body-link">Elbow</a><a href="/library/library_wrist/" class="ml-body-link">Wrist & Hand</a><a href="/library/library_hip/" class="ml-body-link">Hip</a><a href="/library/library_knee/" class="ml-body-link">Knee</a><a href="/library/library_leg/" class="ml-body-link">Leg</a><a href="/library/library_ankle/" class="ml-body-link">Ankle & Foot</a></div>';
}

function makeDisclaimer() {
  return '<h5 style="margin-top:32px; color:var(--primary)">Disclaimer</h5><div style="font-size:0.85rem;color:#666;line-height:1.6;margin-bottom:24px"><p>The information in this medical library is intended for informational and educational purposes only and in no way should be taken to be the provision or practice of physical therapy, medical, or professional healthcare advice or services. The information should not be considered complete or exhaustive and should not be used for diagnostic or treatment purposes without first consulting with your physical therapist, occupational therapist, physician or other healthcare provider. The owners of this website accept no responsibility for the misuse of information contained within this website.</p></div>';
}

function makeOtherChoices() {
return `<div class="ml-other-choices">
  <h2>Other Choices</h2>
  <a href="/library/library_systemic/" class="btn btn--accent">Systemic</a>
  <a href="/library/library_treatments/" class="btn btn--accent">Treatments</a>
  <a href="/library/library_exercise_62/" class="btn btn--accent">Exercises</a>
  <a href="/library/library_md/" class="btn btn--accent">For Physicians</a>
</div>`;
}

// ============ CONVERT ONE PAGE ============

function convertPage(dirName) {
  const mirrorFile = path.join(MIRROR, dirName, 'index.html');
  const outDir = path.join(LIB, dirName);

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // No source file
  if (!fs.existsSync(mirrorFile)) {
    const t = dirName.replace(/_/g, ' ').replace(/library /i, '').replace(/\s+\d+$/, '').trim();
    const friendlyTitle = t || 'Medical Library Article';
    const html = buildPage(
      friendlyTitle,
      'Medical library resource from Bratton Physical Therapy.',
      '<h1>Article Not Available</h1><p>This article is currently unavailable. Please browse our <a href="/library/">Medical Library</a> for other resources.</p>'
    );
    fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
    return { status: 'no-source' };
  }

  const raw = fs.readFileSync(mirrorFile, 'utf8');

  // 403 page
  if (raw.includes('403 Forbidden') || raw.includes('<title>403 Forbidden</title>')) {
    const t = dirName.replace(/_/g, ' ').replace(/library /i, '').replace(/\s+\d+$/, '').trim();
    const friendlyTitle = t || 'Medical Library Article';
    const html = buildPage(
      friendlyTitle,
      'Medical library resource from Bratton Physical Therapy.',
      '<h1>Article Coming Soon</h1><p>This article is being updated. Please browse our <a href="/library/">Medical Library</a> for other resources.</p>'
    );
    fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
    return { status: 'placeholder' };
  }

  const content = extractMirrorContent(raw);
  const parent = isParent(dirName);

  // ----- TITLE LOGIC (FIXED) -----
  // For parent pages: use human-friendly titles from PARENT_TITLES map
  // For child/article pages: extract real title from article content (h4 in overview),
  //   falling back through title tag, then dirName
  let title, desc;
  if (parent) {
    title = getParentTitle(dirName);
    desc = content.metaDesc || `Medical library: ${title} resources from Bratton Physical Therapy in Slidell, LA.`;
  } else {
    // Extract REAL title from article content
    const realTitle = extractRealTitle(raw, dirName);
    title = realTitle.title;
    // Build a better meta description from the real title
    desc = content.metaDesc || `Learn about ${title} — causes, treatments, and rehabilitation at Bratton Physical Therapy in Slidell, LA.`;
  }

  if (parent) {
    // Parent page: article list + body diagram (always use clean SVG) + other choices
    const cleanedList = cleanParentArticleList(content.articleList);
    const body = `<h1>${esc(title)}</h1>
<p style="font-size:1.15rem;line-height:1.7;margin-bottom:24px">Browse our collection of educational resources, exercise guides, and treatment information. Click a body area or choose a category below.</p>

<h2 style="text-align:center;margin-top:32px">Pick a Body Area</h2>

<div class="ml-diagram-wrapper">
  <div class="ml-svg-wrap">
    ${makeBodyDiagram()}
  </div>
  ${makeOtherChoices()}
</div>

${makeSeoLinks()}

<div style="margin-top:32px">
  ${cleanedList}
</div>

${makeDisclaimer()}
<p style="margin-top:32px;text-align:center"><a href="tel:9856415825" class="btn btn--accent btn--lg">Questions? Call Us</a></p>`;

    fs.writeFileSync(path.join(outDir, 'index.html'), buildPage(title, desc, body), 'utf8');
    return { status: 'parent' };
  }

  // Individual article page
  let article = content.articleArea || '';
  
  if (article) {
    // Clean up article content: parse UIKit tab structure, convert to semantic HTML
    article = cleanArticleContent(article);
    
    // Wrap in proper article structure
    const body = `<div class="library-article">
  <h1>${esc(title)}</h1>
  ${article}
  ${makeSeoLinks()}
  ${makeDisclaimer()}
  <p style="margin-top:32px;text-align:center"><a href="tel:9856415825" class="btn btn--accent btn--lg">Questions? Call Us</a></p>
</div>`;

    fs.writeFileSync(path.join(outDir, 'index.html'), buildPage(title, desc, body), 'utf8');
    return { status: 'article' };
  }

  // Fallback
  const body = `<div class="library-article">
  <h1>${esc(title)}</h1>
  <p>This article is being updated. Please browse our <a href="/library/">Medical Library</a> for other resources.</p>
  ${makeSeoLinks()}
  ${makeDisclaimer()}
</div>`;
  fs.writeFileSync(path.join(outDir, 'index.html'), buildPage(title, desc, body), 'utf8');
  return { status: 'article-no-content' };
}

// ============ MAIN ============

function main() {
  console.log('Converting library pages from mirror-main to v3...\n');
  console.log('Title extraction: Uses <h4> from article Overview pane (not slug-based <title> tag)\n');

  const mirrorDirs = fs.readdirSync(MIRROR).filter(d => {
    const full = path.join(MIRROR, d);
    return d.startsWith('library_') && fs.statSync(full).isDirectory();
  });

  console.log(`Found ${mirrorDirs.length} library directories in mirror-main\n`);

  const stats = { parent: 0, article: 0, placeholder: 0, noSource: 0, errors: 0 };

  mirrorDirs.forEach(dirName => {
    try {
      const result = convertPage(dirName);
      if (result.status === 'parent') stats.parent++;
      else if (result.status === 'article' || result.status === 'article-no-content') stats.article++;
      else if (result.status === 'placeholder') stats.placeholder++;
      else if (result.status === 'no-source') stats.noSource++;
      console.log(`  ${dirName}: ${result.status}`);
    } catch (e) {
      stats.errors++;
      console.error(`  ${dirName}: ERROR - ${e.message}`);
    }
  });

  console.log(`\nDone!`);
  console.log(`  Parent pages: ${stats.parent}`);
  console.log(`  Article pages: ${stats.article}`);
  console.log(`  Placeholders: ${stats.placeholder}`);
  console.log(`  No source: ${stats.noSource}`);
  console.log(`  Errors: ${stats.errors}`);
  console.log(`  Total: ${mirrorDirs.length}`);
}

main();