const fs = require('fs');
const path = require('path');
const v3Lib = 'bratton-pt-v3/library';

const dirs = fs.readdirSync(v3Lib, {withFileTypes: true})
  .filter(d => d.isDirectory() && d.name !== '.')
  .map(d => d.name);

let stats = {
  total: dirs.length,
  withTabNav: 0,
  tabsWrapFixed: 0,
  tabsNotWrapping: 0,
  withBackArrow: 0,
  withJsHistoryBack: 0,
  noBackLink: 0,
  pagesToFix: []
};

for (const dir of dirs) {
  const f = path.join(v3Lib, dir, 'index.html');
  if (!fs.existsSync(f)) continue;
  const html = fs.readFileSync(f, 'utf8');

  const issues = [];
  const hasTabNav = /\.ml-tab-nav\s*\{/.test(html) || /ml-tab-nav/.test(html);
  stats.withTabNav += hasTabNav ? 1 : 0;

  // Check back arrow status
  const hasStyledBack = /ml-back-arrow/.test(html);
  const hasJsBack = /history\.go\(-1\)/.test(html);
  const hasBackButton = /uk-button.*(?:Back|back|undo)/.test(html) || /Back to Previous/.test(html);

  if (hasStyledBack) stats.withBackArrow++;
  else if (hasJsBack) {
    stats.withJsHistoryBack++;
    issues.push('bare-js-history-back');
  } else if (!hasBackButton && hasTabNav) {
    // Only report if page has content that would need a back link
    stats.noBackLink++;
    issues.push('no-back-link');
  }

  // Check tab wrapping
  if (hasTabNav) {
    const tabStyleMatch = html.match(/\.ml-tab-nav\s*\{([^}]*)\}/);
    if (tabStyleMatch && tabStyleMatch[1].includes('flex-wrap')) {
      if (tabStyleMatch[1].includes('nowrap') || tabStyleMatch[1].includes('overflow-x')) {
        stats.tabsNotWrapping++;
      } else {
        // Has flex-wrap but unclear state
        stats.tabsNotWrapping++;
      }
    }
    // Check if the page CSS even defines ml-tab-nav
    const hasCustomTabCss = /\.ml-tab-nav\s*\{/.test(html);
  }

  if (issues.length > 0) {
    stats.pagesToFix.push({dir, issues});
  }
}

console.log('Total library dirs:', stats.total);
console.log('Pages with tab nav:', stats.withTabNav);
console.log('Pages with styled back arrow:', stats.withBackArrow);
console.log('Pages with js history.go(-1):', stats.withJsHistoryBack);
console.log('Pages with no back link (but has tabs):', stats.noBackLink);
console.log('Pages to fix:', stats.pagesToFix.length);

// Show first 15 pages needing fixes
stats.pagesToFix.slice(0, 15).forEach(p => {
  console.log('  ' + p.dir + ': ' + p.issues.join(', '));
});
if (stats.pagesToFix.length > 15) console.log('  ... and ' + (stats.pagesToFix.length - 15) + ' more');

// Show which already have back arrows
console.log('\nPages WITH back arrows:');
dirs.forEach(dir => {
  const f = path.join(v3Lib, dir, 'index.html');
  if (!fs.existsSync(f)) return;
  const html = fs.readFileSync(f, 'utf8');
  if (/ml-back-arrow/.test(html)) {
    console.log('  ' + dir);
  }
});