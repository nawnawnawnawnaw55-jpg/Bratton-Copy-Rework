import fs from "fs";
const s = JSON.parse(fs.readFileSync("_sections/homepage.json", "utf8"));
const snips = s.snippets;
const keys = Object.keys(snips);
const sections = new Set();
for (const k of keys) {
  const sn = snips[k];
  const pc = sn.previewContext || "";
  const idx = pc.indexOf(sn.originalHtml);
  const lead = idx >= 0 ? pc.slice(0, idx) : pc;
  // Find last unclosed <section in leading context
  let depth = 0;
  let lastOpenSectionClass = null;
  const regex = /<\/?section[^>]*>/gi;
  let m;
  while ((m = regex.exec(lead)) !== null) {
    if (m[0].startsWith("</")) {
      depth--;
    } else {
      const classMatch = m[0].match(/class="([^"]+)"/i);
      if (classMatch) lastOpenSectionClass = classMatch[1];
      depth++;
    }
  }
  if (lastOpenSectionClass && depth > 0) {
    sections.add(lastOpenSectionClass);
  }
}
console.log("Sections found:", [...sections]);

// Also print first and last few snippet locations
console.log("\nFirst 5 snippet locations:");
for (let i = 0; i < 5 && i < keys.length; i++) {
  const sn = snips[keys[i]];
  console.log(`  ${i}: ${sn.locations?.[0]?.file} -> ${sn.locations?.[0]?.selector}`);
}
console.log("\nLast 5 snippet locations:");
for (let i = Math.max(0, keys.length - 5); i < keys.length; i++) {
  const sn = snips[keys[i]];
  console.log(`  ${i}: ${sn.locations?.[0]?.file} -> ${sn.locations?.[0]?.selector}`);
}