import * as fs from "fs";

// Extract all unique class names from the vercel homepage
const hv = fs.readFileSync("_vercel_homepage.html", "utf8");
const uniqueClasses = new Set();
const re = /class="([^"]+)"/g;
let m;
while ((m = re.exec(hv)) !== null) {
  m[1].split(/\s+/).forEach(c => {
    if (c) uniqueClasses.add(c);
  });
}

const sorted = [...uniqueClasses].sort();

// Check which classes exist in preview.css
const pc = fs.readFileSync("preview.css", "utf8");
const cssFiles = {};
for (const f of ["css/main.css", "css/home.css", "css/header.css", "css/angular.css"]) {
  if (fs.existsSync(f)) cssFiles[f] = fs.readFileSync(f, "utf8");
}

console.log("=== HOMEPAGE CLASSES VS CSS SOURCES ===");
console.log("Total unique classes on vercel homepage:", sorted.length);
console.log("");

for (const cls of sorted) {
  const escaped = cls.replace(/[-\/\\^$*+?.()|\[\]{}]/g, "\\$&");
  
  // Check preview.css
  const inPreview = new RegExp(`\\.${escaped}\\b`, "i").test(pc);
  const inMain = new RegExp(`\\.${escaped}\\b`, "i").test(cssFiles["css/main.css"] || "");
  const inHome = new RegExp(`\\.${escaped}\\b`, "i").test(cssFiles["css/home.css"] || "");
  const inHeader = new RegExp(`\\.${escaped}\\b`, "i").test(cssFiles["css/header.css"] || "");
  const inAngular = new RegExp(`\\.${escaped}\\b`, "i").test(cssFiles["css/angular.css"] || "");
  
  const sources = [];
  if (inPreview) sources.push("preview.css");
  if (inMain) sources.push("main.css");
  if (inHome) sources.push("home.css");
  if (inHeader) sources.push("header.css");
  if (inAngular) sources.push("angular.css");
  
  if (sources.length === 0) {
    console.log(`MISSING: ${cls}`);
  }
  // else { console.log(`OK: ${cls} -> ${sources.join(", ")}`); }
}