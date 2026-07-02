const fs = require('fs');
const path = require('path');

const servicesDir = 'bratton-pt-mirror-main/services';
const dirs = fs.readdirSync(servicesDir, { withFileTypes: true })
  .filter(d => d.isDirectory() && d.name !== 'mobilear' && d.name !== 'workers-compensation-physical-therapy-slidell-la');

dirs.forEach(d => {
  const f = path.join(servicesDir, d.name, 'index.html');
  if (fs.existsSync(f)) {
    const html = fs.readFileSync(f, 'utf8');
    // Extract content between id="main" section start and matching </section>
    const mainIdx = html.indexOf('id="main"');
    if (mainIdx === -1) {
      console.log('=== SKIPPED (no main) ===', d.name);
      return;
    }
    // Find the opening section tag
    const sectionStart = html.lastIndexOf('<section', mainIdx);
    // Find matching closing tag - simple approach, count <section vs </section>
    let depth = 0;
    let i = sectionStart;
    let endIdx = -1;
    while (i < html.length) {
      const nextOpen = html.indexOf('<section', i);
      const nextClose = html.indexOf('</section>', i);
      
      if (nextClose === -1) break;
      
      if (nextOpen !== -1 && nextOpen < nextClose) {
        if (nextOpen < nextClose) {
          depth++;
          i = nextOpen + 8;
        }
      } else if (depth > 0) {
        depth--;
        i = nextClose + 10;
        if (depth === 0) {
          endIdx = nextClose + 10;
          break;
        }
      } else {
        endIdx = nextClose + 10;
        break;
      }
    }
    
    if (endIdx === -1) {
      // Fallback: grab up to first </section> after main
      const closeIdx = html.indexOf('</section>', mainIdx);
      endIdx = closeIdx !== -1 ? closeIdx + 10 : html.length;
    }
    
    const content = html.substring(sectionStart, endIdx);
    console.log('=== SERVICE: ' + d.name + ' ===');
    console.log(content.substring(0, 8000));
    console.log('=== END ===\n');
  }
});