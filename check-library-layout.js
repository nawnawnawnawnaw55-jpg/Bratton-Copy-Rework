/**
 * Validates the medical library page layout structure.
 * Checks:
 *  - SVG is centered (no left-column flex, uses ml-svg-wrap with text-align:center)
 *  - Other Choices uses absolute positioning on desktop, static on mobile
 *  - Old classes (ml-two-col, ml-col-left, ml-col-right) are absent
 *  - Breakpoint at 700px exists
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'bratton-pt-v3', 'library', 'index.html');
const html = fs.readFileSync(filePath, 'utf8');

let errors = [];
let warnings = [];

// 1. Old two-col classes must be gone
if (html.includes('ml-two-col')) errors.push('OLD: .ml-two-col found — should be removed');
if (html.includes('ml-col-left'))  errors.push('OLD: .ml-col-left found — should be removed');
if (html.includes('ml-col-right')) errors.push('OLD: .ml-col-right found — should be removed');

// 2. New classes must exist
if (!html.includes('ml-diagram-wrapper')) errors.push('MISSING: .ml-diagram-wrapper not found');
if (!html.includes('ml-svg-wrap'))        errors.push('MISSING: .ml-svg-wrap not found');
if (!html.includes('ml-other-choices'))    errors.push('MISSING: .ml-other-choices not found');

// 3. SVG wrapper must have text-align:center for centering
if (html.includes('ml-svg-wrap') && !html.includes('.ml-svg-wrap{text-align:center')) {
  // Check regex-like pattern present
  const hasCentering = html.includes('.ml-svg-wrap{text-align:center') || 
                       html.includes('.ml-svg-wrap{text-align:center}');
  if (!hasCentering) errors.push('MISSING: .ml-svg-wrap should have text-align:center');
}

// 4. Other Choices must have position:absolute and right:0
if (html.includes('.ml-other-choices')) {
  if (!html.includes('.ml-other-choices{position:absolute')) {
    errors.push('LAYOUT: .ml-other-choices missing position:absolute');
  }
  if (!html.includes('right:0')) {
    errors.push('LAYOUT: .ml-other-choices missing right:0');
  }
}

// 5. Wrapper must be position:relative on desktop
if (html.includes('.ml-diagram-wrapper')) {
  if (!html.includes('.ml-diagram-wrapper{position:relative')) {
    errors.push('LAYOUT: .ml-diagram-wrapper missing position:relative');
  }
}

// 6. Media query at 700px must reset to static positioning
if (!html.includes('@media(max-width:700px)')) {
  errors.push('MISSING: @media(max-width:700px) breakpoint not found');
} else {
  if (!html.includes('.ml-other-choices{position:static')) {
    errors.push('MOBILE: .ml-other-choices should switch to position:static at 700px');
  }
}

// 7. Buttons should NOT have btn--lg class anymore (smaller buttons)
const btnCount = (html.match(/btn--lg/g) || []).length;
if (btnCount > 2) { // only the "Questions? Call Us" button at bottom should have btn--lg
  errors.push(`BUTTONS: ${btnCount} .btn--lg found — other choices should use smaller buttons`);
}

// 8. Verify SVG is directly under ml-svg-wrap (not in ml-col-left)
const svgInWrap = html.includes('ml-svg-wrap') && (html.includes('id="med-lib-body"') || html.includes("id='med-lib-body'"));
if (!svgInWrap) errors.push('STRUCTURE: SVG not found in expected location after ml-svg-wrap');

console.log('=== Medical Library Layout Validation ===\n');

if (errors.length === 0) {
  console.log('PASSED: All layout checks passed.\n');
} else {
  console.log(`FAILED: ${errors.length} error(s):\n`);
  errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
}

console.log('\n--- CSS Summary ---');
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
if (styleMatch) {
  const css = styleMatch[1];
  console.log('Lines of CSS:', css.split('\n').filter(l => l.trim()).length);
  console.log('Has .ml-diagram-wrapper:', css.includes('.ml-diagram-wrapper'));
  console.log('Has .ml-svg-wrap:', css.includes('.ml-svg-wrap'));
  console.log('Has .ml-other-choices:', css.includes('.ml-other-choices'));
  console.log('Has @media(max-width:700px):', css.includes('@media(max-width:700px)'));
  console.log('position:absolute on choices:', css.includes('position:absolute'));
  console.log('position:static on mobile choices:', css.includes('position:static'));
} else {
  console.log('WARNING: No <style> block found');
}

process.exit(errors.length > 0 ? 1 : 0);