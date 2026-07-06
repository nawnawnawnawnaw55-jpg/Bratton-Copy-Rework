import { chromium } from "playwright";

// All condition pages to test
const pagesToTest = [
  "shoulder-pain/index.html",
  "knee-pain/index.html",
  "back-pain-sciatica/index.html",
  "acl-injury/index.html",
  "rotator-cuff-tear/index.html",
  "neck-pain/index.html",
  "sports-injuries/index.html",
  "conditions/index.html",
  "labral-tear/index.html",
  "meniscus-tear/index.html",
  "joint-pain-arthritis/index.html",
  "knee-replacement/index.html",
  "shoulder-impingement/index.html",
  "sprains-strains-tendinitis/index.html",
  "pre-post-surgical-rehabilitation/index.html",
  "work-related-injuries/index.html",
  "walking-balance-problems/index.html",
];

let passed = 0;
let failed = 0;
let gridIssues = [];

const browser = await chromium.launch({ headless: true });

for (const pageFile of pagesToTest) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));

  const pageName = pageFile.replace("/index.html", "");
  const start = Date.now();
  let result = "PASS";
  let detail = "";

  try {
    // Navigate to the editor
    await page.goto("http://localhost:3000/", { timeout: 15000, waitUntil: "networkidle" });

    // Wait for the BR global to exist (editor.js sets window.BR = { loadPage, ... })
    await page.waitForFunction(() => typeof window.BR !== "undefined", {
      timeout: 10000,
    });

    // Programmatically load the page via the BR API
    await page.evaluate((file) => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("BR.loadPage did not resolve in 15s")), 15000);
        BR.loadPage(file).then(() => {
          clearTimeout(timeout);
          resolve();
        }).catch((e) => {
          clearTimeout(timeout);
          reject(e);
        });
      });
    }, pageFile);

    // Wait for loading spinner to disappear and page-render to be visible
    await page.waitForFunction(
      () => {
        const loading = document.querySelector("#page-loading");
        const render = document.querySelector("#page-render");
        return (!loading || loading.style.display === "none") &&
               render && render.style.display !== "none";
      },
      { timeout: 10000 }
    );

    const totalTime = Date.now() - start;

    // Basic rendering checks
    const snippetCount = await page.evaluate(
      () => document.querySelectorAll(".br-snippet").length
    );
    const renderHTML = await page.evaluate(
      () => document.querySelector("#page-render")?.innerHTML?.length || 0
    );

    if (errors.length > 0) {
      result = "FAIL";
      detail = `JS errors: ${errors.join("; ")}`;
      failed++;
    } else if (snippetCount === 0) {
      result = "FAIL";
      detail = "No snippets rendered";
      failed++;
    } else {
      // ===== GRID INTEGRITY CHECK =====
      // For every .grid element inside #page-render, verify that each of
      // its direct children is at the same DOM level (i.e., all are direct
      // children of the grid container, not nested in extra .br-snippet wrappers).
      const gridCheck = await page.evaluate(() => {
        const issues = [];
        const gridEls = document.querySelectorAll("#page-render .grid");
        gridEls.forEach((grid, idx) => {
          const children = Array.from(grid.children);
          const childCount = children.length;
          if (childCount === 0) return; // empty grid is fine

          // Check that all children are at the same nesting depth under the grid
          const firstDepth = children[0].parentElement === grid ? 0 : 1;
          let allSameDepth = true;
          for (const child of children) {
            if ((child.parentElement === grid ? 0 : 1) !== firstDepth) {
              allSameDepth = false;
              break;
            }
          }

          if (!allSameDepth) {
            issues.push(
              `Grid #${idx + 1} (${grid.className}): ${childCount} children at mixed DOM depths`
            );
          }

          // Also check that no grid child is wrapped in a .br-snippet
          for (const child of children) {
            if (child.closest(".br-snippet") !== grid.closest(".br-snippet")) {
              issues.push(
                `Grid #${idx + 1} (${grid.className}): child "${child.className || child.tagName}" wrapped in wrong .br-snippet`
              );
            }
          }
        });
        return issues;
      });

      if (gridCheck.length > 0) {
        result = "FAIL";
        detail = `Grid issues: ${gridCheck.join(" | ")}`;
        gridIssues.push({ page: pageName, issues: gridCheck });
        failed++;
      } else {
        detail = `${snippetCount} snippets, ${renderHTML} chars, grids OK (${totalTime}ms)`;
        passed++;
      }
    }

    console.log(`[${result}] ${pageName}: ${detail}`);
  } catch (e) {
    failed++;
    console.log(`[FAIL] ${pageName}: ${e.message}`);
  }

  await page.close();
}

await browser.close();

if (gridIssues.length > 0) {
  console.log("\n=== GRID ISSUES FOUND ===");
  gridIssues.forEach(g => {
    console.log(`\n📄 ${g.page}:`);
    g.issues.forEach(i => console.log(`   ❌ ${i}`));
  });
}

console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);