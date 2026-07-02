const fs = require('fs');
const path = require('path');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let results = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (fs.existsSync(path.join(fullPath, 'index.html'))) {
        results.push(path.join(fullPath, 'index.html'));
      }
      results = results.concat(walk(fullPath));
    }
  }
  return results;
}

const pages = walk('bratton-pt-v3/library').filter(f => f.endsWith('.html'));
let fixed = 0;

for (const filePath of pages) {
  let html = fs.readFileSync(filePath, 'utf8');
  let orig = html;
  
  // Remove duplicate consecutive webkit scrollbar rules
  html = html.replace(
    /(\.ml-tab-nav::-webkit-scrollbar\{display:none\}\s*\n)\s*\1/g,
    '$1'
  );
  
  // Remove redundant one right before @media if there's already one before it
  html = html.replace(
    /(\.ml-tab-nav::-webkit-scrollbar\{display:none\}\s*\n)\s*(\.ml-tab-nav::-webkit-scrollbar\{display:none\}\s*\n)(@media)/g,
    '$1$3'
  );
  
  if (html !== orig) {
    fs.writeFileSync(filePath, html);
    fixed++;
    console.log('Fixed: ' + path.basename(path.dirname(filePath)));
  }
}

console.log('\nFixed ' + fixed + ' pages with duplicate webkit-scrollbar rules');