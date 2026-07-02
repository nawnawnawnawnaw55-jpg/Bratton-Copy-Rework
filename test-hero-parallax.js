// ===== Hero Parallax Playwright Test =====
// Tests hero parallax at multiple viewport widths.
// Usage: node test-hero-parallax.js
// Output: test-output/ folder with screenshots and report.json

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8777;
const TEST_DIR = path.join(__dirname, 'bratton-pt-v3');
const OUTPUT_DIR = path.join(__dirname, 'test-output');

// MIME types for static serving
const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
};

// === Static file server ===
function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = url.parse(req.url).pathname;
      if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
      const filePath = path.join(TEST_DIR, reqPath);

      // Security: stay inside TEST_DIR
      if (!filePath.startsWith(TEST_DIR)) {
        res.writeHead(403); res.end('Forbidden'); return;
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          // Try adding .html for clean URLs
          if (!path.extname(filePath)) {
            fs.readFile(filePath + '.html', (err2, data2) => {
              if (err2) { res.writeHead(404); res.end('Not Found'); return; }
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(data2);
            });
            return;
          }
          res.writeHead(404); res.end('Not Found'); return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(PORT, () => {
      console.log(`  Server: http://localhost:${PORT}`);
      resolve(server);
    });
  });
}

// === Viewport configs ===
const VIEWPORTS = [
  { name: 'iPhone SE', width: 375, height: 667, isMobile: true },
  { name: 'iPhone 11', width: 414, height: 896, isMobile: true },
  { name: 'iPad', width: 768, height: 1024, isMobile: true },
  { name: 'Tablet Landscape', width: 1024, height: 768, isMobile: false },
  { name: 'Desktop', width: 1440, height: 900, isMobile: false },
];

// === Read debug panel text ===
async function readDebugPanel(page) {
  try {
    return await page.$eval('#hero-parallax-debug', (el) => el.innerText);
  } catch {
    return '(Debug panel not found)';
  }
}

// === Get bg transform value ===
async function getBgTransform(page) {
  try {
    return await page.$eval('.hero__bg', (el) => el.style.transform || getComputedStyle(el).transform);
  } catch {
    return '(No .hero__bg found)';
  }
}

// === Test one viewport ===
async function testViewport(browser, vp, baseUrl) {
  console.log(`\n  ── ${vp.name} (${vp.width}x${vp.height}) ──`);
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();

  const vpSlug = vp.name.replace(/\s+/g, '-').toLowerCase();
  const result = { viewport: vp.name, width: vp.width, height: vp.height };

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 15000 });
    // Wait for hero to be present
    await page.waitForSelector('.hero', { timeout: 5000 });
    // Wait for at least one bg element (attached, not necessarily visible — mobile hides desktop bg)
    await page.waitForSelector('.hero__bg', { state: 'attached', timeout: 5000 });
    // Small delay for JS to initialize (setTimeout 100ms in main.js)
    await page.waitForTimeout(800);

    // === Position 1: Top of page ===
    const debugTop = await readDebugPanel(page);
    // Choose the correct bg element: mobile uses hero__bg--mobile, desktop uses the first hero__bg
    const bgSelector = vp.isMobile ? '.hero__bg--mobile' : '.hero__bg';
    const transformTop = await page.$eval(bgSelector, (el) => el.style.transform || getComputedStyle(el).transform);
    // Also check if mobile bg is actually visible
    if (vp.isMobile) {
      const mobileBgDisplay = await page.$eval(bgSelector, (el) => getComputedStyle(el).display);
      const mobileBgVisible = mobileBgDisplay !== 'none';
      console.log(`    Mobile bg display: ${mobileBgDisplay}, visible: ${mobileBgVisible}`);
      if (!mobileBgVisible) {
        // Fallback: check for any visible bg
        const anyVisible = await page.$$eval('.hero__bg', (els) => els.some(el => getComputedStyle(el).display !== 'none'));
        console.log(`    Any bg visible: ${anyVisible}`);
      }
    }
    console.log(`    [scroll=0] transform: ${transformTop}`);
    console.log(`    Debug:\n${debugTop.split('\n').map(l => '      ' + l).join('\n')}`);
    await page.screenshot({ path: path.join(OUTPUT_DIR, `${vpSlug}-top.png`), fullPage: false });
    result.top = { transform: transformTop, debug: debugTop };

    // Extract translateY value from CSS transform string
    const extractY = (t) => { const m = t.match(/translateY\(([\d.]+)px\)/); return m ? parseFloat(m[1]) : 0; };
    result.translateYTop = extractY(transformTop);

    // Hero is present if we got this far (selector existed)
    result.heroFound = true;
    result.bgCount = await page.$$eval('.hero__bg', els => els.length).catch(() => 0);

    // === Position 2: Scrolled 50% of hero height ===
    const heroHeight = await page.$eval('.hero', (el) => el.offsetHeight);
    const scroll50 = Math.round(heroHeight * 0.5);
    await page.evaluate((y) => window.scrollTo(0, y), scroll50);
    await page.waitForTimeout(400); // let rAF fire

    const debugMid = await readDebugPanel(page);
    const transformMid = await getBgTransform(page);
    console.log(`    [scroll=${scroll50}px] transform: ${transformMid}`);
    console.log(`    Debug:\n${debugMid.split('\n').map(l => '      ' + l).join('\n')}`);
    await page.screenshot({ path: path.join(OUTPUT_DIR, `${vpSlug}-mid.png`), fullPage: false });
    result.mid = { scrollPx: scroll50, transform: transformMid, debug: debugMid };
    result.translateYMid = extractY(transformMid);

    // === Position 3: Scrolled past hero ===
    await page.evaluate((y) => window.scrollTo(0, y), heroHeight + 100);
    await page.waitForTimeout(400);

    const debugPast = await readDebugPanel(page);
    const transformPast = await getBgTransform(page);
    console.log(`    [scroll=${heroHeight + 100}px] transform: ${transformPast}`);
    await page.screenshot({ path: path.join(OUTPUT_DIR, `${vpSlug}-past.png`), fullPage: false });
    result.past = { scrollPx: heroHeight + 100, transform: transformPast, debug: debugPast };
    result.translateYPast = extractY(transformPast);

    // === Assertions ===
    result.assertions = {};
    result.assertions.heroFound = result.heroFound;
    result.assertions.hasTranslateY = transformPast.includes('translateY');
    result.assertions.translateYChanges = result.translateYMid !== result.translateYTop;
    result.assertions.translateYIncreases = result.translateYMid > result.translateYTop;
    // translateY should be in a reasonable range (positive but less than 200px)
    result.assertions.pastShowsInRange = result.translateYPast > 0 && result.translateYPast < 200;

    // Mobile: check scaleX preserved
    if (vp.isMobile) {
      const mobileTransform = await page.$eval('.hero__bg--mobile', (el) => el.style.transform || getComputedStyle(el).transform);
      result.mobileScaleXPreserved = mobileTransform.includes('scaleX(-1)');
      result.assertions.mobileScaleXPreserved = result.mobileScaleXPreserved;
    }

    const passCount = Object.values(result.assertions).filter(Boolean).length;
    const totalCount = Object.values(result.assertions).length;
    result.passed = passCount === totalCount;
    console.log(`    Assertions: ${passCount}/${totalCount} passed ${result.passed ? '✓' : '✗'}`);

  } catch (err) {
    console.log(`    ERROR: ${err.message}`);
    result.error = err.message;
    result.passed = false;
  }

  await context.close();
  return result;
}

// === Main ===
(async () => {
  console.log('=== Hero Parallax Playwright Test ===\n');

  // Ensure output dir
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Start server
  const server = await startServer();
  const baseUrl = `http://localhost:${PORT}`;

  // Launch browser
  const browser = await chromium.launch({ headless: true });
  console.log('  Browser launched\n');

  const results = [];
  for (const vp of VIEWPORTS) {
    const r = await testViewport(browser, vp, baseUrl);
    results.push(r);
  }

  await browser.close();
  server.close();

  // === Report ===
  console.log('\n\n========================================');
  console.log('  REPORT');
  console.log('========================================\n');

  let allPassed = true;
  for (const r of results) {
    const icon = r.passed ? '✓' : '✗';
    console.log(`  ${icon} ${r.viewport} (${r.width}px)`);
    if (r.error) console.log(`       ERROR: ${r.error}`);
    if (r.assertions) {
      for (const [key, val] of Object.entries(r.assertions)) {
        console.log(`       ${val ? '✓' : '✗'} ${key}`);
      }
    }
    console.log(`       translateY: ${r.translateYTop || '?'}px → ${r.translateYMid || '?'}px → ${r.translateYPast || '?'}px`);
    if (!r.passed) allPassed = false;
  }

  // Write JSON report
  fs.writeFileSync(path.join(OUTPUT_DIR, 'report.json'), JSON.stringify(results, null, 2));
  console.log(`\n  Full report: test-output/report.json`);
  console.log(`  Screenshots:  test-output/*.png`);
  console.log(`\n  Overall: ${allPassed ? 'ALL PASSED ✓' : 'SOME FAILED ✗'}`);

  process.exit(allPassed ? 0 : 1);
})();