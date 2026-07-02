const fs = require('fs');
const path = require('path');

const libraryDir = 'bratton-pt-v3/library';
const dirs = fs.readdirSync(libraryDir, {withFileTypes: true}).filter(d => d.isDirectory()).map(d => d.name);

// Parent categories (no underscore number suffix)
const parentNames = ['library_ankle','library_back','library_elbow','library_hip','library_knee','library_leg','library_neck','library_shoulder','library_wrist'];
// Children (have underscore number suffix)
const children = dirs.filter(d => /^library_[a-z]+_\d+$/.test(d));

console.log('=== PARENT CATEGORY PAGES ===');
parentNames.forEach(p => {
    const f = path.join(libraryDir, p, 'index.html');
    if (fs.existsSync(f)) {
        const content = fs.readFileSync(f, 'utf8');
        const hasBackArrow = content.includes('ml-back-arrow');
        const hasTabNav = content.includes('ml-tab-nav');
        const hasFlexWrapNowrap = content.includes('flex-wrap:nowrap');
        console.log(p + ': backArrow=' + hasBackArrow + ' tabNav=' + hasTabNav + ' flexWrap=' + hasFlexWrapNowrap);
    } else {
        console.log(p + ': NO FILE');
    }
});

console.log('\n=== CHILD PAGES ===');
let childCount = 0;
let missingBackArrow = [];
let missingTabNav = [];
let childrenMap = {};
children.forEach(c => {
    const f = path.join(libraryDir, c, 'index.html');
    if (fs.existsSync(f)) {
        const content = fs.readFileSync(f, 'utf8');
        const hasBackArrow = content.includes('ml-back-arrow');
        const hasTabNav = content.includes('ml-tab-nav');
        const hasFlexWrapNowrap = content.includes('flex-wrap:nowrap');
        childCount++;
        const match = c.match(/^(library_[a-z]+)_\d+$/);
        const parent = match ? match[1] : 'unknown';
        if (!childrenMap[parent]) childrenMap[parent] = [];
        childrenMap[parent].push(c);
        if (!hasBackArrow) missingBackArrow.push(c);
        if (!hasTabNav) missingTabNav.push(c);
    }
});

console.log('Total children: ' + childCount);
console.log('\nChildren per parent:');
for (const [p, kids] of Object.entries(childrenMap)) {
  console.log('  ' + p + ': ' + kids.length + ' children');
}
console.log('\nMissing back arrow (' + missingBackArrow.length + '):');
missingBackArrow.forEach(m => console.log('  ' + m));
console.log('\nMissing tab nav (' + missingTabNav.length + '):');
missingTabNav.forEach(m => console.log('  ' + m));