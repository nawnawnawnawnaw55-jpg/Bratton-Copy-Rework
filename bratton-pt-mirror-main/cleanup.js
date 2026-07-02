const fs = require('fs');
const path = require('path');

const ROOT = __dirname; // run from project root

const replacements = [
  // 1. Remove e-rehab schema opening comment
  {
    name: 'e-rehab schema opening',
    find: '\n\n',
    replace: ''
  },
  {
    name: 'e-rehab schema opening (no extra newline)',
    find: '\n',
    replace: ''
  },
  {
    name: 'e-rehab schema opening (inline)',
    find: '',
    replace: ''
  },
  // 2. Remove e-rehab schema closing + unadjusted
  {
    name: 'e-rehab schema closing + unadjusted',
    find: '<!--- END E-rehab Generated Schema Data -->\n<!--- E-rehab Unadjusted 1739 -->\n',
    replace: ''
  },
  {
    name: 'e-rehab schema closing + unadjusted (inline)',
    find: '<!--- END E-rehab Generated Schema Data -->\n<!--- E-rehab Unadjusted 1739 -->',
    replace: ''
  },
  // 3. Remove any remaining individual e-rehab comments
  {
    name: 'END E-rehab Generated Schema Data (standalone)',
    find: '<!--- END E-rehab Generated Schema Data -->\n',
    replace: ''
  },
  {
    name: 'E-rehab Unadjusted (standalone)',
    find: '<!--- E-rehab Unadjusted 1739 -->\n',
    replace: ''
  },
  // 4. Remove WMT comments
  {
    name: 'E-rehab Starting WMT',
    find: '<!--- E-rehab Starting WMT 1739 -->\n\n',
    replace: ''
  },
  {
    name: 'E-rehab Starting WMT (inline)',
    find: '<!--- E-rehab Starting WMT 1739 -->\n',
    replace: ''
  },
  {
    name: 'E-rehab end WMT',
    find: '<!--- E-rehab end WMT for  1739 -->\n\n',
    replace: ''
  },
  {
    name: 'E-rehab end WMT (inline)',
    find: '<!--- E-rehab end WMT for  1739 -->\n',
    replace: ''
  },
  // 5. Replace "Powered by E-Rehab" footer link
  {
    name: 'Powered by E-Rehab footer',
    find: 'Powered by Bratton PT.',
    replace: 'Powered by Bratton PT.'
  },
  // 6. Replace mobilear appointment iframe URLs
  {
    name: 'mobilear ptclinic appointment iframe',
    find: 'src="/booking/"',
    replace: 'src="/booking/"'
  },
  // 7. Remove review modal iframe URLs (any remaining)
  {
    name: 'ptclinic review.php iframe',
    find: 'data-old-review-src="https://ptclinic.com/g5/review.php?practice_id=',
    replace: 'data-old-review-data-old-review-src="https://ptclinic.com/g5/review.php?practice_id='
  },
  // 8. Remove prs.php iframe URLs
  {
    name: 'ptclinic prs.php iframe',
    find: 'data-old-prs-src="https://ptclinic.com/g5/prs.php?practice_id=',
    replace: 'data-old-prs-data-old-prs-src="https://ptclinic.com/g5/prs.php?practice_id='
  },
];

let totalFiles = 0;
let totalChanges = 0;

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    // Skip node_modules, .git
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.name.endsWith('.html') || entry.name.endsWith('.js')) {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const rep of replacements) {
    if (content.includes(rep.find)) {
      content = content.split(rep.find).join(rep.replace);
      changed = true;
      console.log(`  ✓ ${rep.name} — ${path.relative(ROOT, filePath)}`);
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalChanges++;
  }
  totalFiles++;
}

console.log('============================================');
console.log('  Bratton PT — E-Rehab Cleanup Script');
console.log('============================================\n');
console.log('Scanning files...\n');

walkDir(ROOT);

console.log(`\n============================================`);
console.log(`  Done! ${totalFiles} files scanned, ${totalChanges} files updated.`);
console.log(`============================================`);
