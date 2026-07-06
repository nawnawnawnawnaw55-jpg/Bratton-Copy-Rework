const fs = require("fs");

// --- Replicate the exact logic from editor.js ---
function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function buildSubSlug(part) {
  return part.toLowerCase()
    .replace(/[^a-z0-9&\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/&/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Simulate getSnippetsForFile for a given file
function getSnippetsForFile(file, pageIndex) {
  const page = pageIndex.find((p) => p.file === file);
  if (!page) return [];

  const sectionField = page.section || "";
  const parts = sectionField.split(/\s*>\s*/);
  const mainSlug = slugify(parts[0] || "");
  const subSlug = parts.length > 1 ? slugify(parts[1]) : null;
  let subSlugFixed = parts.length > 1 ? buildSubSlug(parts[1]) : null;
  
  const candidateFiles = [];
  if (subSlugFixed) {
    candidateFiles.push(`_sections/${mainSlug}---${subSlugFixed}.json`);
  }
  candidateFiles.push(`_sections/${mainSlug}.json`);
  if (!candidateFiles.includes("_sections/homepage.json")) candidateFiles.push("_sections/homepage.json");
  if (!candidateFiles.includes("_sections/header.json")) candidateFiles.push("_sections/header.json");
  if (!candidateFiles.includes("_sections/footer.json")) candidateFiles.push("_sections/footer.json");

  let data = null;
  for (const sectionFile of candidateFiles) {
    try {
      const raw = fs.readFileSync(sectionFile, "utf8");
      data = JSON.parse(raw);
      console.log("  FOUND section file: " + sectionFile);
      break;
    } catch (e) {
      console.log("  TRIED: " + sectionFile + " -> " + (e.code === "ENOENT" ? "NOT FOUND" : e.message));
    }
  }

  if (!data) return [];

  const allSnippets = data.snippets || {};
  const result = [];

  for (const [id, snippet] of Object.entries(allSnippets)) {
    if (snippet.locations && Array.isArray(snippet.locations)) {
      for (const loc of snippet.locations) {
        if (
          loc.file === file ||
          loc.file === file.replace(/^\//, "") ||
          `/${loc.file}` === file
        ) {
          result.push({ ...snippet, id, _location: loc });
          break;
        }
      }
    }
  }

  return result;
}

// --- TEST ---
const pageIndex = JSON.parse(fs.readFileSync("_page-index.json", "utf8"));
const conditions = pageIndex.filter((p) => p.category === "conditions");

console.log("=== FULL FLOW SIMULATION FOR EACH CONDITION PAGE ===\n");

conditions.forEach((p) => {
  console.log("PAGE: " + p.pageName + " (file: " + p.file + ")");
  const snippets = getSnippetsForFile(p.file, pageIndex);
  console.log("  RESULT: " + snippets.length + " snippets found");

  if (snippets.length === 0) {
    console.log("  *** NO SNIPPETS — page will show empty/loading!");
    // Debug: what are the snippet IDs in the page index?
    console.log("  Expected snippet IDs: " + (p.snippetIds || []).join(", "));
  }
  console.log();
});