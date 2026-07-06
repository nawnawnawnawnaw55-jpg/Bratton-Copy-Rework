import { chromium } from "playwright";
import { readdirSync, existsSync } from "fs";

const BASE_URL = "http://localhost:3000";

console.log("=== LIBRARY PAGE AUDIT ===");
console.log(`Base URL: ${BASE_URL}`);
console.log("");

// Step 1: Build the list of all library sub-pages from the local directory structure.
// This is more reliable than scraping the index page (which only shows hub pages),
// and covers ALL numbered sub-pages.
const libraryDir = "library";
const entries = readdirSync(libraryDir, { withFileTypes: true });

// Get all directories under /library/ that have an index.html
const libraryDirs = entries
  .filter((e) => e.isDirectory() && e.name.startsWith("library_"))
  .map((e) => e.name)
  .filter((name) => existsSync(`${libraryDir}/${name}/index.html`))
  .sort((a, b) => a.localeCompare(b));

console.log(`[SCAN] Found ${libraryDirs.length} library sub-directories on disk`);
console.log("");

// Build URL list — ordered alphabetically so duplicate detection works in order
const libraryPageURLs = libraryDirs.map((name) => ({
  name,
  url: `${BASE_URL}/library/${name}/index.html`,
}));

if (libraryPageURLs.length === 0) {
  console.log("[ERROR] No library sub-pages found. Aborting.");
  process.exit(1);
}

// Step 2: Visit each page, compare with previous, test tabs
const browser = await chromium.launch({ headless: true });

let previousText = null;
let previousName = null;
let passed = 0;
let failed = 0;
let duplicateCount = 0;
const duplicates = [];
const tabFailures = [];

for (let i = 0; i < libraryPageURLs.length; i++) {
  const { name, url } = libraryPageURLs[i];
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));

  let result = "PASS";
  const details = [];

  try {
    await page.goto(url, { timeout: 20000, waitUntil: "networkidle" });

    // Wait for main content to be present
    await page.waitForSelector("main, body", { timeout: 10000 });

    // Extract visible text content for comparison
    let bodyText = await page.evaluate(() => {
      const main = document.querySelector("main") || document.body;
      return (main.innerText || "").replace(/\s+/g, " ").trim();
    });

    const textLen = bodyText.length;

    if (textLen < 50) {
      result = "FAIL";
      details.push(`Near-empty page (${textLen} chars)`);
      failed++;
    }

    // Compare with previous page (only if text is non-trivial)
    if (textLen >= 50 && previousText !== null && bodyText === previousText) {
      duplicateCount++;
      const pair = `${previousName} ↔ ${name}`;
      duplicates.push(pair);
      details.push(`DUPLICATE of ${previousName}`);
      console.log(`[DUPE] ${pair}: identical content (${textLen} chars)`);
      // Don't update previousText — keep comparing to the original
    } else if (textLen >= 50) {
      // Only update previousText for unique, non-empty pages
      previousText = bodyText;
      previousName = name;

      // Test tab interactivity — use native Playwright clicks
      const tabBtnCount = await page.locator(".ml-tab-btn").count();

      if (tabBtnCount === 0) {
        details.push("no tab buttons found");
      } else {
        const tabResults = [];
        for (let idx = 0; idx < tabBtnCount; idx++) {
          const btn = page.locator(".ml-tab-btn").nth(idx);
          const label = (await btn.textContent())?.trim() || `tab-${idx}`;
          const panelAttr = await btn.getAttribute("data-ml-tab-panel");

          await btn.click();
          await page.waitForTimeout(150);

          let targetPanel;
          if (panelAttr) {
            targetPanel = page.locator(`[data-ml-tab-panel="${panelAttr}"]`);
          } else {
            targetPanel = page.locator(".ml-tab-panel").nth(idx);
          }

          const panelFound = (await targetPanel.count()) > 0;
          const hasActiveClass = panelFound
            ? await targetPanel.evaluate((el) => el.classList.contains("ml-tab-panel--active"))
            : false;
          const isVisible = panelFound
            ? await targetPanel.evaluate((el) => {
                // Check that the panel is not hidden via the "hidden" attribute
                // and that offsetParent is not null (i.e., it's in the layout)
                return !el.hasAttribute("hidden") && el.offsetParent !== null;
              })
            : false;

          tabResults.push({ label, panelFound, hasActiveClass, isVisible });
        }

        const brokenTabs = tabResults.filter(
          (r) => !r.panelFound || !r.hasActiveClass || !r.isVisible
        );
        if (brokenTabs.length > 0) {
          result = "FAIL";
          const brokenLabels = brokenTabs.map((t) => `"${t.label}"`).join(", ");
          details.push(`Tabs not working: ${brokenLabels}`);
          tabFailures.push({ page: name, broken: brokenTabs });
          failed++;
        } else {
          details.push(`all ${tabBtnCount} tabs OK`);
        }
        passed++;
      }
    }

    // Final details if none added
    if (details.length === 0 && result === "PASS") {
      details.push(`OK (${textLen} chars)`);
      passed++;
    }

    console.log(`[${result}] ${name}: ${details.join("; ")}`);

    // Log JS errors
    if (errors.length > 0) {
      console.log(`  ⚠ JS errors on ${name}: ${errors.join("; ")}`);
    }
  } catch (e) {
    failed++;
    console.log(`[FAIL] ${name}: ${e.message}`);
    // Don't update previousText on failure — keep comparing to last good page
  }

  await page.close();
}

await browser.close();

// Step 3: Final report
console.log("");
console.log("=".repeat(60));
console.log("=== FINAL REPORT ===");
console.log("=".repeat(60));
console.log(`Total pages visited: ${libraryPageURLs.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Duplicate pairs found: ${duplicateCount}`);

if (duplicates.length > 0) {
  console.log("");
  console.log("--- DUPLICATE PAGE PAIRS (identical content) ---");
  duplicates.forEach((d, i) => console.log(`  ${i + 1}. ${d}`));
}

if (tabFailures.length > 0) {
  console.log("");
  console.log("--- TAB INTERACTIVITY FAILURES ---");
  tabFailures.forEach((tf) => {
    console.log(`  📄 ${tf.page}:`);
    tf.broken.forEach((b) =>
      console.log(
        `     ❌ Tab "${b.label}": panelFound=${b.panelFound}, active=${b.hasActiveClass}, visible=${b.isVisible}`
      )
    );
  });
}

if (duplicates.length === 0 && tabFailures.length === 0 && failed === 0) {
  console.log("");
  console.log("✅ ALL PAGES UNIQUE AND ALL TABS WORKING!");
}

process.exit(failed > 0 ? 1 : 0);