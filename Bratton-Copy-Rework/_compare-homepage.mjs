import { readFileSync } from 'fs';

const vercel = readFileSync('_vercel_homepage.html', 'utf8');
const local = readFileSync('index.html', 'utf8');

// Extract body content
const vBodyStart = vercel.indexOf('<body');
const vBodyEnd = vercel.lastIndexOf('</body>') + 7;
const vBody = vercel.slice(vBodyStart, vBodyEnd);

// Scripts in live
const vScripts = vBody.match(/<script[^>]*src="([^"]+)"[^>]*>/g) || [];
console.log('=== LIVE HOMEPAGE SCRIPTS ===');
vScripts.forEach(s => console.log(s));

// CSS in live
const vCss = vercel.match(/<link[^>]*href="([^"]+\.css[^"]*)"[^>]*>/gi) || [];
console.log('\n=== LIVE HOMEPAGE CSS ===');
vCss.forEach(s => console.log(s));

// Section structure in live body
const vSections = vBody.match(/<section[^>]*class="([^"]*section[^"]*)"[^>]*>/g) || [];
console.log('\n=== LIVE HOMEPAGE SECTIONS ===');
vSections.forEach(s => console.log(s));

// Main sections/divs with IDs
const vDivs = vBody.match(/<(section|div)[^>]*id="[^"]*"[^>]*>/g) || [];
console.log('\n=== LIVE HOMEPAGE IDS ===');
vDivs.forEach(s => console.log(s));

// Check what CSS classes are used in sections
const vClasses = vBody.match(/class="([^"]*)"/g) || [];
const uniqueClasses = new Set();
vClasses.forEach(c => {
  c.replace(/class="([^"]*)"/g, '$1').split(/\s+/).forEach(cls => {
    if (cls && cls.length > 2) uniqueClasses.add(cls);
  });
});
console.log('\n=== LIVE HOMEPAGE UNIQUE CLASSES ===');
console.log([...uniqueClasses].sort().join(', '));