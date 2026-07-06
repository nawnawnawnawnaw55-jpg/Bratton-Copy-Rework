import * as fs from "fs";
const ms = JSON.parse(fs.readFileSync("_master-snippets.json", "utf8"));
console.log("snippets type:", typeof ms.snippets);
if (typeof ms.snippets === "object" && !Array.isArray(ms.snippets)) {
  const keys = Object.keys(ms.snippets);
  console.log("snippets keys:", keys.slice(0, 5));
  const firstKey = keys[0];
  if (firstKey) {
    console.log("First snippet:", JSON.stringify(ms.snippets[firstKey]).substring(0, 300));
  }
  // Find homepage - try keys that match index.html
  for (const [key, val] of Object.entries(ms.snippets)) {
    if (val.pages && Array.isArray(val.pages) && val.pages.some(p => p.includes("index.html"))) {
      console.log("HOMEPAGE SNIPPET key:", key);
      console.log("  tag:", val.tag);
      console.log("  pages:", val.pages);
      console.log("  html:", (val.originalHtml || "").substring(0, 150));
    }
  }
} else if (Array.isArray(ms.snippets)) {
  console.log("Array of", ms.snippets.length);
  ms.snippets.slice(0, 3).forEach(s => console.log(JSON.stringify(s).substring(0, 200)));
}