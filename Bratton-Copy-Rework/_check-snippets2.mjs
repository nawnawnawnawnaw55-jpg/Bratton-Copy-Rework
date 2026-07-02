import * as fs from "fs";
const ms = JSON.parse(fs.readFileSync("_master-snippets.json", "utf8"));
let count = 0;
for (const [key, val] of Object.entries(ms.snippets)) {
  if (count < 3) {
    console.log("\n--- Snippet", key, "---");
    console.log("Keys:", Object.keys(val));
    console.log("tag:", val.tag);
    console.log("originalHtml:", (val.originalHtml || "").substring(0, 200));
    if (val.pages) console.log("pages:", val.pages);
    if (val.locationCount) console.log("locationCount:", val.locationCount);
    if (val.locations) console.log("locations type:", typeof val.locations);
  }
  // Check for homepage-related fields
  const flat = JSON.stringify(val);
  if (flat.includes("index.html")) {
    console.log("\n!!! FOUND index.html in snippet key:", key);
    console.log("  tag:", val.tag);
    console.log("  Keys:", Object.keys(val));
    console.log("  pages:", val.pages);
    console.log("  html:", (val.originalHtml || "").substring(0, 150));
  }
  count++;
  if (count === 3 && !flat.includes("index.html")) {
    // search all
  }
}
console.log("\nTotal snippets:", Object.keys(ms.snippets).length);