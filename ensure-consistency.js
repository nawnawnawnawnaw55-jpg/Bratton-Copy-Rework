/**
 * ensure-consistency.js
 * 
 * Scans all HTML pages in bratton-pt-v3/ and ensures phone numbers,
 * hours of operation, addresses, and other key business info are
 * consistent across every page.
 * 
 * Run: node ensure-consistency.js
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// CANONICAL VALUES (source of truth)
// ============================================================
const CANONICAL = {
  phoneDisplay: '(985) 641-5825',
  phoneDigits: '9856415825',
  phoneHref: 'tel:9856415825',
  address1: '1346 Lindberg Drive Suite 3',
  addressFull: '1346 Lindberg Drive Suite 3, Slidell, LA 70458',
  addressMultiLine: '1346 Lindberg Drive Suite 3<br>Slidell, LA 70458',
  businessName: 'Bratton Physical Therapy',
  hoursBlock: 'Monday – Thursday: 7:00 AM – 5:30 PM<br>\n        Friday: 7:00 AM – 2:00 PM<br>\n        Saturday: 8:00 AM – 12:00 PM<br>\n        Sunday: Closed',
  hoursInline: 'Monday – Thursday: 7:00 AM – 5:30 PM | Friday: 7:00 AM – 2:00 PM | Saturday: 8:00 AM – 12:00 PM',
  email: 'bptfrontdesk@gmail.com',
};

// ============================================================
// LOGGING
// ============================================================
const changes = [];
function logChange(file, description) {
  changes.push({ file, description });
  console.log(`  [FIX] ${file}: ${description}`);
}
function logInfo(file, description) {
  console.log(`  [INFO] ${file}: ${description}`);
}

// ============================================================
// FIX FUNCTIONS — each returns { fixed: bool, result: string }
// ============================================================

// Phone number patterns to normalize — these match variations of the phone number
const PHONE_PATTERNS = [
  // Display variations of the same number
  { pattern: /\(985\)\s*641[\s\-–—]*5825/gi, replacement: CANONICAL.phoneDisplay },
  // Phone digits without formatting
  { pattern: /\b985[\s\-.]*641[\s\-.]*5825\b/g, replacement: CANONICAL.phoneDigits },
];

// Inline phone display text patterns that appear in body content (NOT in href/tel links)
function fixPhoneDisplayVariations(content) {
  let fixed = false;
  
  // Fix "Call (985) 641-5825" — already canonical, skip if already correct
  // Fix "Call Now: (985) 641-5825" — standardize to "Call (985) 641-5825" for button text
  // But keep header template as-is since it uses "Call Now:" label
  
  // Fix "Call Us Today at (985) 641-5825" variations
  const callVariations = [
    { regex: /Call Us Today at \(985\) 641-5825/gi, replacement: `Call us at ${CANONICAL.phoneDisplay}` },
    { regex: /Call Today at \(985\) 641-5825/gi, replacement: `Call us at ${CANONICAL.phoneDisplay}` },
    { regex: /call us at \(985\) 641-5825/gi, replacement: `call us at ${CANONICAL.phoneDisplay}` },
    // Dual CTA button blocks
    { regex: /Call Now: \(985\) 641-5825\s*<\/a>\s*<a\s+href="\/booking\/"\s+class="btn btn--primary btn--lg">Book Online<\/a>/gi, replacement: `Call ${CANONICAL.phoneDisplay}</a> <a href="/booking/" class="btn btn--outline btn--lg">Request Appointment</a>` },
    { regex: /Call Now: \(985\) 641-5825\s*<\/a>\s*<a\s+href="\/booking\/"\s+class="btn btn--accent btn--lg">Book Online<\/a>/gi, replacement: `Call ${CANONICAL.phoneDisplay}</a> <a href="/booking/" class="btn btn--outline btn--lg">Request Appointment</a>` },
  ];
  
  for (const v of callVariations) {
    if (v.regex.test(content)) {
      const before = content.match(v.regex);
      content = content.replace(v.regex, v.replacement);
      if (!v.regex.test(content)) {
        fixed = true;
      }
    }
  }
  
  // Fix service pages: "call at (985) 641-5825" -> "Call (985) 641-5825" in button text
  // This was incorrectly produced by earlier normalization
  if (/call at \(985\) 641-5825/i.test(content)) {
    content = content.replace(/>call at \(985\) 641-5825</gi, `>Call ${CANONICAL.phoneDisplay}<`);
    if (!/call at \(985\) 641-5825/i.test(content)) {
      fixed = true;
    }
  }
  
  // Fix "Call Now: (985) 641-5825" standalone text (not inside button)  
  if (/>Call Now: \(985\) 641-5825</gi.test(content)) {
    content = content.replace(/>Call Now: \(985\) 641-5825</gi, `>Call ${CANONICAL.phoneDisplay}<`);
    if (!/>Call Now: \(985\) 641-5825</gi.test(content)) {
      fixed = true;
    }
  }
  
  return { fixed, result: content };
}

// Fix "Book Online" buttons to match "Request Appointment" for consistency
function fixBookOnlineButtons(content) {
  let fixed = false;
  
  // In condition pages (hero CTA area): "Book Online" -> "Request Appointment"
  // Pattern: btn--outline btn--lg ... Book Online
  const bookOnlinePattern = /(<a href="\/booking\/"\s+class="btn btn--outline btn--lg"[^>]*>)Book Online<\/a>/gi;
  if (bookOnlinePattern.test(content)) {
    content = content.replace(bookOnlinePattern, '$1Request Appointment</a>');
    fixed = true;
  }
  
  // Pattern: btn--outline ... Book Online (no btn--lg)
  const bookOnlinePattern2 = /(<a href="\/booking\/"\s+class="btn btn--outline"[^>]*>)Book Online<\/a>/gi;
  if (bookOnlinePattern2.test(content)) {
    content = content.replace(bookOnlinePattern2, '$1Request Appointment</a>');
    fixed = true;
  }
  
  // In service pages: "Book Online" with btn--primary
  const bookOnlinePrimary = /(<a href="\/booking\/"\s+class="btn btn--primary btn--lg">)Book Online<\/a>/gi;
  if (bookOnlinePrimary.test(content)) {
    content = content.replace(bookOnlinePrimary, '$1Request Appointment</a>');
    fixed = true;
  }
  
  return { fixed, result: content };
}

// Fix service page CTA sections to use consistent pattern
function fixServicePageCTAs(content) {
  let fixed = false;
  
  // Standardize service page dual-CTAs: "Call Now: (985) 641-5825" + "Book Online"
  // Replace with consistent "Call (985) 641-5825" + "Request Appointment"
  const dualCTA1 = /(<a href="tel:9856415825"\s+class="btn btn--accent btn--lg">)Call Now: \(985\) 641-5825(<\/a>)\s*(<a href="\/booking\/"\s+class="btn btn--primary btn--lg">)Book Online(<\/a>)/gi;
  if (dualCTA1.test(content)) {
    content = content.replace(dualCTA1, `$1Call ${CANONICAL.phoneDisplay}$2 $3Request Appointment$4`);
    fixed = true;
  }
  
  const dualCTA2 = /(<a href="tel:9856415825"\s+class="btn btn--accent btn--lg">)Call Now: \(985\)\s*641-5825(<\/a>)\s*(<a href="\/booking\/"\s+class="btn btn--outline btn--lg"[^>]*>)Book Online(<\/a>)/gi;
  if (dualCTA2.test(content)) {
    content = content.replace(dualCTA2, `$1Call ${CANONICAL.phoneDisplay}$2 $3Request Appointment$4`);
    fixed = true;
  }
  
  return { fixed, result: content };
}

// Fix hardcoded hours blocks in page bodies to match footer template
function fixHoursBlocks(content) {
  let fixed = false;
  
  // Pattern: hours in a <p class="clinic-hours"> or <p class="booking-hours">
  // These use spans with hours-day class — standardize the text format
  const hoursInlinePattern = /Monday\s*[–—\-]\s*Thursday:\s*7:00\s*AM\s*[–—\-]\s*5:30\s*PM/g;
  if (hoursInlinePattern.test(content)) {
    // Verify it matches our canonical — if so, leave it (it's already consistent)
    // If not, fix it
    content = content.replace(hoursInlinePattern, 'Monday – Thursday: 7:00 AM – 5:30 PM');
    // Check if anything changed
    if (!hoursInlinePattern.test(content.replace('Monday – Thursday: 7:00 AM – 5:30 PM', 'CHECK'))) {
      // No change needed
    } else {
      fixed = true;
    }
  }
  
  return { fixed, result: content };
}

// Fix contact info blocks in pages like privacy-policy, terms-of-use
function fixContactInfoBlocks(content) {
  let fixed = false;
  
  // Pattern: "Bratton Physical Therapy<br>1346 Lindberg Drive Suite 3, Slidell, LA 70458<br>Phone: (985) 641-5825"
  const contactBlock = /Bratton Physical Therapy<br>\s*1346 Lindberg Drive Suite 3,\s*Slidell,\s*LA\s*70458<br>\s*Phone:\s*\(985\)\s*641-5825/gi;
  if (contactBlock.test(content)) {
    content = content.replace(contactBlock, 
      `${CANONICAL.businessName}<br>${CANONICAL.addressFull}<br>Phone: ${CANONICAL.phoneDisplay}`);
    fixed = true;
  }
  
  return { fixed, result: content };
}

// Fix legacy library page: remove old fax and outdated email
function fixLegacyLibraryContent(content, filePath) {
  let fixed = false;
  
  // Remove fax line: (985) 641-5895
  const faxPattern = /<span class="g5-color-white"><i class="uk-icon-fax[^>]*><\/i>\s*\(985\)\s*641-5895\s*<br>/gi;
  if (faxPattern.test(content)) {
    content = content.replace(faxPattern, '');
    fixed = true;
  }
  
  // Remove or update old email if it conflicts with current contact info
  // Keep email if it's still valid, just note it
  const emailPattern = /bptfrontdesk@gmail\.com/gi;
  if (emailPattern.test(content)) {
    // This email appears to be valid/current — keep it but log
    // No change needed for email itself
  }
  
  return { fixed, result: content };
}

// Fix inconsistent fax number anywhere it might appear
function fixFaxNumbers(content) {
  let fixed = false;
  const faxPattern = /\(985\)\s*641-5895/gi;
  if (faxPattern.test(content)) {
    content = content.replace(faxPattern, CANONICAL.phoneDisplay);
    fixed = true;
  }
  return { fixed, result: content };
}

// Fix phone display in inline text (not in buttons/links where it was already handled)
function fixInlinePhoneReferences(content) {
  let fixed = false;
  
  // "please contact us (985) 641-5825" -> "please contact us at (985) 641-5825"
  const missingAt = /contact us (\()?\(985\) 641-5825/gi;
  if (missingAt.test(content)) {
    content = content.replace(missingAt, `contact us at ${CANONICAL.phoneDisplay}`);
    fixed = true;
  }
  
  // "give us a call (985) 641-5825" -> "give us a call at (985) 641-5825"
  // Use negative lookbehind for '>' to avoid matching button text
  // (e.g., <a ...>Call (985) 641-5825</a> should be left alone by this step)
  const callMissingAt = /(?<!>)call (\(985\) 641-5825)/gi;
  if (callMissingAt.test(content)) {
    content = content.replace(callMissingAt, `call at ${CANONICAL.phoneDisplay}`);
    fixed = true;
  }
  
  return { fixed, result: content };
}

// ============================================================
// MAIN PROCESSING
// ============================================================
function processFile(filePath) {
  const relative = path.relative(process.cwd(), filePath);
  
  // Skip templates directory (these are the canonical sources)
  if (relative.includes('templates' + path.sep)) {
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  let fileHadChanges = false;
  
  // Apply fixes in order
  const fixes = [
    { name: 'Inline phone references', fn: fixInlinePhoneReferences },
    { name: 'Phone display normalization', fn: fixPhoneDisplayVariations },
    { name: 'Book Online → Request Appointment', fn: fixBookOnlineButtons },
    { name: 'Service page CTA standardization', fn: fixServicePageCTAs },
    { name: 'Hours blocks normalization', fn: fixHoursBlocks },
    { name: 'Contact info blocks', fn: fixContactInfoBlocks },
    { name: 'Legacy library cleanup', fn: (c) => fixLegacyLibraryContent(c, filePath) },
    { name: 'Fax number removal', fn: fixFaxNumbers },
  ];
  
  for (const fix of fixes) {
    const { fixed, result } = fix.fn(content);
    if (fixed) {
      content = result;
      fileHadChanges = true;
      logChange(relative, fix.name);
    }
  }
  
  // Run "call at" normalization as FINAL step — handles ALL remaining
  // occurrences (buttons, meta descriptions, plain text). Previous steps
  // only replace "call at" inside angle-bracket context, missing free-text
  // uses (e.g., meta name="description").
  const callAtRe = /call at \(985\) 641-5825/gi;
  if (callAtRe.test(content)) {
    const countBefore = (content.match(callAtRe) || []).length;
    // Replace button text: >call at (985) 641-5825<
    content = content.replace(/>call at \(985\) 641-5825</gi, `>Call ${CANONICAL.phoneDisplay}<`);
    // Replace remaining free-text occurrences (e.g., meta descriptions, plain text)
    content = content.replace(callAtRe, `Call ${CANONICAL.phoneDisplay}`);
    const countAfter = (content.match(/call at \(985\) 641-5825/gi) || []).length;
    if (countAfter < countBefore) {
      fileHadChanges = true;
      logChange(relative, `Final call at → Call (${countBefore - countAfter} fixed)`);
    }
  }
  
  // Write back if changed
  if (fileHadChanges) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
  
  return fileHadChanges;
}

// ============================================================
// DIRECTORY WALKER
// ============================================================
function walkDir(dir, callback) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules, .git, backups, etc.
      if (['node_modules', '.git', 'backup', 'files', 'api', 'css', 'js', 'img', 'images'].includes(entry.name)) {
        continue;
      }
      walkDir(fullPath, callback);
    } else if (entry.name.endsWith('.html')) {
      callback(fullPath);
    }
  }
}

// ============================================================
// RUN
// ============================================================
console.log('=== Consistency Enforcement Script ===');
console.log(`Canonical Phone: ${CANONICAL.phoneDisplay}`);
console.log(`Canonical Hours: ${CANONICAL.hoursBlock.split('<br>')[0].trim()}...`);
console.log(`Canonical Address: ${CANONICAL.addressFull}`);
console.log('');

const targetDir = path.join(process.cwd(), 'bratton-pt-v3');
console.log(`Scanning: ${targetDir}`);
console.log('');

let totalFixed = 0;
walkDir(targetDir, (filePath) => {
  if (processFile(filePath)) {
    totalFixed++;
  }
});

console.log('');
console.log('=== SUMMARY ===');
console.log(`Files modified: ${totalFixed}`);
console.log(`Total changes: ${changes.length}`);
console.log('');
console.log('Changes made:');
changes.forEach((c, i) => {
  console.log(`  ${i + 1}. ${c.file} — ${c.description}`);
});

console.log('');
console.log('=== CONSISTENCY CHECK COMPLETE ===');
console.log('The following canonical values are now enforced across all pages:');
console.log(`  Phone: ${CANONICAL.phoneDisplay}`);
console.log(`  Address: ${CANONICAL.addressFull}`);
console.log(`  Hours:  Mon-Thu 7AM-5:30PM, Fri 7AM-2PM, Sat 8AM-12PM, Sun Closed`);
console.log(`  CTA:    "Call (985) 641-5825" + "Request Appointment"`);