const fs = require('fs');
const path = require('path');
const ROOT = __dirname;

const FALLBACK = 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=400&fit=crop';

function walk(dir, cb) {
  for (const e of fs.readdirSync(dir, {withFileTypes:true})) {
    if (e.name==='node_modules'||e.name==='.git') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, cb); else cb(p);
  }
}

console.log('=== Replacing ALL stock images with free Unsplash photos ===\n');
let count = 0;

// Regex matches: src='/desktop/files/stock/9131?...' or src="/mobile/files/stock/5510?..."
const regex = /(src=|url\(|content="|og:image" content=")\s*['"]?(\/desktop\/files\/stock\/|\/mobile\/files\/stock\/)\d+(\?[^'"\s>]*)?['"]?/g;

walk(ROOT, fp => {
  if (!fp.endsWith('.html')&&!fp.endsWith('.css')) return;
  let s = fs.readFileSync(fp,'utf8');
  if (regex.test(s)) {
    s = s.replace(regex, '$1"' + FALLBACK + '"');
    fs.writeFileSync(fp, s, 'utf8');
    count++;
    console.log('  ' + path.relative(ROOT, fp));
  }
});

console.log('\n=== Done! ' + count + ' files updated ===');

