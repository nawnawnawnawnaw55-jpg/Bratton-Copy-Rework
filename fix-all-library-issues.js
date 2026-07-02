const fs = require('fs');
const path = require('path');

const LIB_DIR = 'bratton-pt-v3/library';

// Collect all directories
const dirs = new Set();
function walk(dir, fn) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, fn);
    else if (e.name === 'index.html') fn(p);
  }
}

walk(LIB_DIR, (p) => {
  const d = path.dirname(p).replace(/\\/g, '/');
  dirs.add(d);
});

// Helpers
function hrefToDir(href) {
  // /library/something/ => bratton-pt-v3/library/something
  let p = href.replace(/^\/library\//, 'bratton-pt-v3/library/');
  p = p.replace(/\/$/, '');
  return p;
}

// Issues and fixes
const fixes = [];
const issues = [];

walk(LIB_DIR, (p) => {
  const content = fs.readFileSync(p, 'utf8');
  const fileDir = path.dirname(p).replace(/\\/g, '/');
  const relFile = fileDir + '/index.html';

  // Find all /library/.../ hrefs
  const re = /href="(\/library\/[^"]+)"/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    let href = m[1];
    
    // Check: points to nonexistent library_exercise/
    if (href === '/library/library_exercise/' || href.startsWith('/library/library_exercise/') && href !== '/library/library_exercise_62/' && href !== '/library/library_exercise_58/' && href !== '/library/library_exercise_60/' && href !== '/library/library_exercise_61/') {
      // Only flag if it's the bare /library/library_exercise/ without a number suffix
      if (href === '/library/library_exercise/') {
        issues.push({ file: relFile, href, reason: 'points to nonexistent library_exercise/, should be library_exercise_62/' });
        fixes.push({ file: relFile, oldHref: href, newHref: '/library/library_exercise_62/' });
      }
      continue;
    }

    // Check if target dir exists
    if (href.startsWith('/library/') && href.endsWith('/') && href !== '/library/') {
      const targetDir = hrefToDir(href);
      if (!dirs.has(targetDir)) {
        issues.push({ file: relFile, href, reason: 'target directory not found' });
      }
    }
  }
});

console.log('=== ISSUES FOUND ===');
issues.forEach(i => console.log(JSON.stringify(i)));
console.log('\n=== FIXES ===');
fixes.forEach(f => console.log(JSON.stringify(f)));
console.log('\nTOTAL ISSUES:', issues.length);
console.log('TOTAL FIXES:', fixes.length);

// Apply fixes
fixes.forEach(f => {
  let content = fs.readFileSync(f.file, 'utf8');
  const old = 'href="' + f.oldHref + '"';
  const newH = 'href="' + f.newHref + '"';
  if (content.includes(old)) {
    content = content.replace(new RegExp(old.replace(/\//g, '\\/'), 'g'), newH);
    fs.writeFileSync(f.file, content);
    console.log('FIXED:', f.file, f.oldHref, '->', f.newHref);
  } else {
    console.log('NOT FOUND in file:', f.file, old);
  }
});