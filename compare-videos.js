const fs = require('fs');
const path = require('path');
const v2Dir = 'bratton-pt-v2';
const v3Dir = 'bratton-pt-v3/library';

function getV3() {
  const r = {};
  const l = path.join(v3Dir);
  if (!fs.existsSync(l)) return r;
  for (const d of fs.readdirSync(l, {withFileTypes: true})) {
    if (!d.isDirectory()) continue;
    const f = path.join(l, d.name, 'index.html');
    if (!fs.existsSync(f)) continue;
    const h = fs.readFileSync(f, 'utf8');
    const m = h.match(/g5-mlvideo-wrapper[^]*?title='(\d+)'/);
    if (m) r[d.name] = m[1];
  }
  return r;
}

function getV2() {
  const r = {};
  if (!fs.existsSync(v2Dir)) return r;
  for (const d of fs.readdirSync(v2Dir, {withFileTypes: true})) {
    if (!d.isDirectory() || !d.name.startsWith('library_treatments_') || d.name === 'library_treatments' || d.name === 'library_treatments_2') continue;
    const f = path.join(v2Dir, d.name, 'index.html');
    if (!fs.existsSync(f)) continue;
    const h = fs.readFileSync(f, 'utf8');
    const m = h.match(/g5-mlvideo-wrapper[^]*?title='(\d+)'/);
    if (m) r[d.name] = m[1];
  }
  return r;
}

const v2 = getV2();
const v3 = getV3();
let matched = 0;
let mismatches = [];
let missingV2 = 0;
let noVideoV3 = 0;

console.log('V2 treatment pages with videos:', Object.keys(v2).length);
console.log('V3 treatment pages with videos:', Object.keys(v3).length);

for (const [k, vid] of Object.entries(v3)) {
  if (v2[k] !== undefined) {
    if (v2[k] === vid) matched++;
    else mismatches.push({page: k, v2: v2[k], v3: vid});
  } else {
    missingV2++;
  }
}
for (const k of Object.keys(v2)) {
  if (!v3[k]) noVideoV3++;
}

console.log('Matched:', matched);
console.log('Mismatched:', mismatches.length);
mismatches.forEach(m => console.log('  ' + m.page + ': v2=' + m.v2 + ' v3=' + m.v3));
console.log('V3 pages missing v2 counterpart:', missingV2);
console.log('V2 pages missing from v3:', noVideoV3);
if (mismatches.length > 0 || missingV2 > 0) {
  console.log('\n--- V2 mapping to fix mismatches ---');
  for (const [k, vid] of Object.entries(v2)) {
    if (!v3[k]) continue;
    if (v3[k] !== vid) {
      console.log('MISMATCH:', k, 'v2:', vid, 'v3:', v3[k]);
    }
  }
}