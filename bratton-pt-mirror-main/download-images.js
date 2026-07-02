const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const ROOT = __dirname;
const DF = path.join(ROOT, 'desktop', 'files');
const MF = path.join(ROOT, 'mobile', 'files');

[DF, MF, path.join(DF,'photos'),path.join(DF,'icons'),path.join(DF,'insurance'),
 path.join(DF,'logo'),path.join(DF,'stock'),path.join(MF,'photos'),
 path.join(MF,'icons'),path.join(MF,'insurance'),path.join(MF,'logo'),
 path.join(MF,'stock')].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const imageMap = {
  '/desktop/files/logo/BRATTON-ai.svg': 'logo/BRATTON-ai.svg',
  '/desktop/files/icons/goal.svg': 'icons/goal.svg',
  '/desktop/files/icons/audience.svg': 'icons/audience.svg',
  '/desktop/files/icons/running.svg': 'icons/running.svg',
  '/desktop/files/icons/appointments.svg': 'icons/appointments.svg',
  '/desktop/files/icons/evaluate.svg': 'icons/evaluate.svg',
  '/desktop/files/icons/regeneration.svg': 'icons/regeneration.svg',
  '/desktop/files/photos/BRATTON-icon-white.svg': 'photos/BRATTON-icon-white.svg',
  '/desktop/files/photos/BRATTON-icon-white.svg': 'photos/BRATTON-icon-white.svg',
  '/desktop/files/insurance/bcbs-logo.svg': 'insurance/bcbs-logo.svg',
  '/desktop/files/insurance/tricare.svg': 'insurance/tricare.svg',
  '/desktop/files/insurance/workers-comp.svg': 'insurance/workers-comp.svg',
  '/desktop/files/insurance/humana.svg': 'insurance/humana.svg',
  '/desktop/files/insurance/medicare-in.svg': 'insurance/medicare-in.svg',
};

const photos = [
  {u:'/desktop/files/photos/tm-hero-1.jpg',f:'photos/tm-hero-1.jpg'},
  {u:'/desktop/files/photos/teenage-girl-doing-exercise_1080x800.png',f:'photos/teenage-girl-doing-exercise_1080x800.png'},
  {u:'/desktop/files/photos/teenage-girl-with-nurse.png',f:'photos/teenage-girl-with-nurse.png'},
  {u:'/desktop/files/photos/tm-epxert.png',f:'photos/tm-epxert.png'},
  {u:'/desktop/files/photos/tm-epxert-1280x1280.png',f:'photos/tm-epxert-1280x1280.png'},
  {u:'/desktop/files/photos/professional-pt.png',f:'photos/professional-pt.png'},
  {u:'/desktop/files/photos/vaso.png',f:'photos/vaso.png'},
];

let ok = 0, fail = 0;

function dl(url, dest) {
  return new Promise(res => {
    const f = fs.createWriteStream(dest);
    const p = url.startsWith('https') ? https : http;
    p.get(url.split('?')[0], r => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
        f.close(); try{fs.unlinkSync(dest)}catch(e){}
        return dl(r.headers.location, dest).then(res);
      }
      if (r.statusCode !== 200) { f.close(); try{fs.unlinkSync(dest)}catch(e){} fail++; res(); return; }
      r.pipe(f);
      f.on('finish',()=>{f.close();ok++;console.log('  OK: '+path.basename(dest));res();});
    }).on('error',e=>{f.close();try{fs.unlinkSync(dest)}catch(e){}fail++;console.log('  FAIL: '+path.basename(dest));res();});
  });
}


function walk(dir, cb) {
  for (const e of fs.readdirSync(dir, {withFileTypes:true})) {
    if (e.name==='node_modules'||e.name==='.git') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, cb); else cb(p);
  }
}

function replaceInFiles(base, find, replace, label) {
  let c = 0;
  walk(base, fp => {
    if (!fp.endsWith('.html')&&!fp.endsWith('.css')&&!fp.endsWith('.js')) return;
    let s = fs.readFileSync(fp,'utf8');
    if (s.includes(find)) { s = s.split(find).join(replace); fs.writeFileSync(fp,s,'utf8'); c++; }
  });
  console.log('  ['+label+'] '+c+' files');
}

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest,{recursive:true});
  for (const e of fs.readdirSync(src,{withFileTypes:true})) {
    const a = path.join(src,e.name), b = path.join(dest,e.name);
    if (e.isDirectory()) copyDir(a,b);
    else if (!fs.existsSync(b)) { fs.copyFileSync(a,b); console.log('  copied: '+e.name); }
  }
}

async function main() {
  console.log('=== Downloading Images ===\n');
  const tasks = [];
  for (const [url, f] of Object.entries(imageMap)) {
    const d = path.join(DF, f);
    if (!fs.existsSync(d)) tasks.push(dl(url, d));
  }
  for (const p of photos) {
    const d = path.join(DF, p.f);
    if (!fs.existsSync(d)) tasks.push(dl(p.u, d));
  }
  await Promise.all(tasks);
  console.log('\n=== Copying to mobile/files ===');
  copyDir(DF, MF);
  console.log('\n=== Replacing URLs in HTML ===');
  replaceInFiles(path.join(ROOT,'desktop'), '/desktop/files/', '/desktop/files/', 'desktop-blogsdir');
  replaceInFiles(path.join(ROOT,'mobile'), '/desktop/files/', '/mobile/files/', 'mobile-blogsdir');
  replaceInFiles(ROOT, '/desktop/files/', '/desktop/files/', 'root-blogsdir');
  replaceInFiles(path.join(ROOT,'desktop'), '/desktop/files/', '/desktop/files/', 'desktop-blogsdir-http');
  replaceInFiles(path.join(ROOT,'mobile'), '/desktop/files/', '/mobile/files/', 'mobile-blogsdir-http');
  replaceInFiles(ROOT, '/desktop/files/', '/desktop/files/', 'root-blogsdir-http');
  replaceInFiles(path.join(ROOT,'desktop'), 'https://stock.imgix.net/', '/desktop/files/stock/', 'desktop-stock');
  replaceInFiles(path.join(ROOT,'mobile'), 'https://stock.imgix.net/', '/mobile/files/stock/', 'mobile-stock');
  // Fix Photoroom filenames
  replaceInFiles(ROOT, 'teenage-girl-with-nurse.png', 'teenage-girl-with-nurse.png', 'fix-nurse-png');
  replaceInFiles(ROOT, 'professional-pt.png', 'professional-pt.png', 'fix-pt-png');
  console.log('\n=== DONE: '+ok+' downloaded, '+fail+' failed ===');
}

main().catch(console.error);
