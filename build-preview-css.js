/**
 * Builds preview.css by reading v3's main.css and home.css,
 * prefixing every CSS rule with "#page-render " so styles are scoped.
 * Run: node build-preview-css.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSS_DIR = path.join(__dirname, "..", "bratton-pt-v3", "css");
const OUT_DIR = __dirname;

/**
 * Extract :root CSS variables from a CSS string (reads from the first :root{...} block).
 */
function extractRootVars(css) {
  const rootMatch = css.match(/:root\s*\{([^}]*)\}/s);
  if (!rootMatch) return "";
  const varsBlock = rootMatch[1].trim();
  // Parse each variable line
  const lines = varsBlock.split(";").map(l => l.trim()).filter(Boolean);
  const vars = [];
  for (const line of lines) {
    const m = line.match(/(--[\w-]+)\s*:\s*(.+)/);
    if (m) {
      vars.push(`  ${m[1]}: ${m[2].trim()};`);
    }
  }
  if (vars.length === 0) return "";
  // Override --font-body to use Montserrat
  return `:root {\n  --font-body: 'Montserrat', 'Segoe UI', Arial, sans-serif;\n  --font-heading: 'Montserrat', 'Segoe UI', Arial, sans-serif;\n${vars.join("\n")}\n}\n`;
}

/**
 * Prefixes all selectors in a CSS string with a given prefix.
 * Handles comma-separated selectors, @keyframes, @media queries, and @font-face.
 */
function scopeCSS(css, prefix) {
  let result = "";
  let i = 0;

  while (i < css.length) {
    // Skip whitespace
    while (i < css.length && /\s/.test(css[i])) {
      result += css[i];
      i++;
    }
    if (i >= css.length) break;

    // Handle comments
    if (css[i] === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      if (end === -1) {
        result += css.slice(i);
        break;
      }
      result += css.slice(i, end + 2);
      i = end + 2;
      continue;
    }

    // Handle @-rules
    if (css[i] === "@") {
      const atEnd = findAtRuleEnd(css, i);
      const atRule = css.slice(i, atEnd);

      // @keyframes — rename to avoid collisions
      if (/^@keyframes\s/i.test(atRule)) {
        const m = atRule.match(/^@keyframes\s+([^{\s]+)/);
        if (m) {
          const oldName = m[1];
          const newName = "pr-" + oldName;
          result += atRule.replace(
            new RegExp("(@keyframes\\s+)" + escapeRegex(oldName)),
            "$1" + newName
          );
        } else {
          result += atRule;
        }
        i = atEnd;
        continue;
      }

      // @font-face — leave as-is
      if (/^@font-face\b/i.test(atRule)) {
        result += atRule;
        i = atEnd;
        continue;
      }

      // @import, @charset, @namespace — leave as-is
      if (/^@(import|charset|namespace)\b/i.test(atRule)) {
        result += atRule;
        i = atEnd;
        continue;
      }

      // @media, @supports, @container — recursively scope the inner rules
      if (/^@(media|supports|container)\b/i.test(atRule)) {
        const innerStart = atRule.indexOf("{");
        if (innerStart === -1) {
          result += atRule;
          i = atEnd;
          continue;
        }
        const innerEnd = atRule.lastIndexOf("}");
        const pre = atRule.slice(0, innerStart + 1);
        const inner = atRule.slice(innerStart + 1, innerEnd);
        const post = atRule.slice(innerEnd);
        result += pre + scopeCSS(inner, prefix) + post;
        i = atEnd;
        continue;
      }

      // Other @-rules — leave as-is
      result += atRule;
      i = atEnd;
      continue;
    }

    // Regular CSS rule — find the selector block
    const blockStart = css.indexOf("{", i);
    if (blockStart === -1) {
      result += css.slice(i);
      break;
    }

    let selectorText = css.slice(i, blockStart).trim();
    if (!selectorText) {
      result += css[i];
      i++;
      continue;
    }

    // Find the matching closing brace
    const blockEnd = findMatchingBrace(css, blockStart);
    const body = css.slice(blockStart, blockEnd + 1);

    // Parse comma-separated selectors
    const selectors = splitSelectors(selectorText);

    // Add prefix to each selector
    const prefixedSelectors = selectors.map((sel) => {
      sel = sel.trim();
      if (!sel) return sel;

      // Don't prefix :root
      if (sel === ":root") return sel;

      // Already prefixed
      if (sel.startsWith(prefix + " ") || sel.startsWith(prefix)) return sel;

      return prefix + " " + sel;
    });

    result += prefixedSelectors.join(", ") + " " + body;

    i = blockEnd + 1;
  }

  return result;
}

/**
 * Find the end of an @-rule (handles nested braces).
 */
function findAtRuleEnd(css, start) {
  const braceIdx = css.indexOf("{", start);
  const semiIdx = css.indexOf(";", start);

  if (braceIdx === -1 || (semiIdx !== -1 && semiIdx < braceIdx)) {
    return semiIdx !== -1 ? semiIdx + 1 : css.length;
  }

  return findMatchingBrace(css, braceIdx) + 1;
}

/**
 * Find the matching closing brace for an opening brace at `openIdx`.
 */
function findMatchingBrace(css, openIdx) {
  let depth = 0;
  for (let j = openIdx; j < css.length; j++) {
    if (css[j] === "{") depth++;
    else if (css[j] === "}") {
      depth--;
      if (depth === 0) return j;
    }
  }
  return css.length - 1;
}

/**
 * Split comma-separated selectors, respecting parentheses (for :is(), :not(), etc.).
 */
function splitSelectors(selectorText) {
  const selectors = [];
  let depth = 0;
  let current = "";
  for (let k = 0; k < selectorText.length; k++) {
    const ch = selectorText[k];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      selectors.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) selectors.push(current.trim());
  return selectors;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ===== MAIN =====

const mainCSS = fs.readFileSync(path.join(CSS_DIR, "main.css"), "utf8");
const homeCSS = fs.readFileSync(path.join(CSS_DIR, "home.css"), "utf8");
const angularCSS = fs.readFileSync(path.join(CSS_DIR, "angular.css"), "utf8");
let headerCSSStr = "";
try {
  headerCSSStr = fs.readFileSync(path.join(CSS_DIR, "header.css"), "utf8");
} catch (e) {
  console.warn("⚠ header.css not found — skipping.");
}

// Extract :root vars from main.css before stripping
const rootVars = extractRootVars(mainCSS);
console.log("📋 Extracted CSS variables from main.css");

// Strip :root block from all CSS sources so it doesn't get scoped
const stripRoot = (css) => css.replace(/:root\s*\{[^}]*\}\s*/gs, "");
const combined =
  stripRoot(mainCSS) + "\n" +
  stripRoot(homeCSS) + "\n" +
  stripRoot(angularCSS) + "\n" +
  stripRoot(headerCSSStr);

let scoped = scopeCSS(combined, "#page-render");

// Prefix animation names referenced in animation/transition properties
scoped = scoped.replace(/animation(?:-name)?:\s*([^;}{]+)/g, (match, names) => {
  const prefixed = names.split(",").map((n) => {
    n = n.trim();
    if (!n || n === "none" || n === "inherit" || n === "initial" || n.startsWith("pr-"))
      return n;
    return "pr-" + n;
  });
  return match.replace(names, prefixed.join(", "));
});

// Build the output
const output =
  "/* Auto-generated from v3 main.css + home.css + angular.css + header.css, scoped to #page-render */\n" +
  "/* CSS variables extracted dynamically from main.css :root */\n" +
  rootVars +
  "\n/* ===== SCOPED STYLES ===== */\n" +
  scoped;

fs.writeFileSync(path.join(OUT_DIR, "preview.css"), output, "utf8");
console.log("✅ preview.css generated successfully (" + (output.length / 1024).toFixed(1) + " KB)");