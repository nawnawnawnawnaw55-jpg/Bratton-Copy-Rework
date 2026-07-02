const fs = require('fs');
const path = require('path');
const ROOT = __dirname;

function walk(dir, cb) {
  for (const e of fs.readdirSync(dir, {withFileTypes:true})) {
    if (e.name==='node_modules'||e.name==='.git') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, cb); else cb(p);
  }
}

function replaceAll(base, find, replace, label) {
  let c = 0;
  walk(base, fp => {
    if (!fp.endsWith('.html')&&!fp.endsWith('.css')&&!fp.endsWith('.js')) return;
    let s = fs.readFileSync(fp,'utf8');
    if (s.includes(find)) { s = s.split(find).join(replace); fs.writeFileSync(fp,s,'utf8'); c++; }
  });
  console.log('  ['+label+'] '+c+' files');
}

console.log('=== Reverting stock images to CDN URLs ===\n');
replaceAll(path.join(ROOT,'desktop'), '/desktop/files/stock/', 'https://stock.imgix.net/', 'desktop');
replaceAll(path.join(ROOT,'mobile'), '/mobile/files/stock/', 'https://stock.imgix.net/', 'mobile');
replaceAll(ROOT, '/desktop/files/stock/', 'https://stock.imgix.net/', 'root');
console.log('\n=== Done. Stock images back on CDN. Clinic photos stay local. ===');
