const fs = require("fs");

const pageIndex = JSON.parse(fs.readFileSync("_page-index.json", "utf8"));
const cp = pageIndex.filter((p) => p.category === "conditions");

console.log("=== ALL CONDITIONS SECTION FIELDS ===\n");

cp.forEach((p) => {
  const s = p.section || "";
  const parts = s.split(/\s*>\s*/);
  console.log("Page: " + p.pageName);
  console.log("  section: " + s);
  console.log("  parts[0]: " + (parts[0] || ""));
  console.log("  parts[1]: " + (parts[1] || "N/A"));
  console.log();
});