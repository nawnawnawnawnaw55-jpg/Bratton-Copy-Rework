# Bratton-Copy-Rework — "Jena Edit" System Diagnosis (v3 — Final)
## Created: July 12, 2026 | Updated after user clarification: everything is GitHub Pages only, no Vercel

---

## 1. WHAT THIS PROJECT DOES

Physical therapy website (Bratton PT, Slidell LA) with a custom "Copy Editor" tool at `index.html` that lets Jena edit pages visually, then save edits to GitHub. The live site is supposed to detect Jena-edited pages and display them by default, with a toggle to switch back to the original. Everything is hosted exclusively on GitHub Pages at `https://nawnawnawnawnaw55-jpg.github.io/Bratton-Copy-Rework/`.

---

## 2. DEPLOYMENT ARCHITECTURE

### GitHub Actions Workflow: `.github/workflows/deploy.yml`
This file lives at the **repo root** (parent of Bratton-Copy-Rework/) and runs on every push to `main`:

```yaml
# Line 24-25: Copies ONLY Bratton-Copy-Rework/* to gh-pages
mkdir -p /tmp/deploy
cp -r Bratton-Copy-Rework/* /tmp/deploy/

# Line 28-32: Force-publishes to gh-pages (NO keep_files: true)
- uses: peaceiris/actions-gh-pages@v4
  with:
    publish_dir: /tmp/deploy
    publish_branch: gh-pages
```

**What this means:**
1. Only files inside `Bratton-Copy-Rework/` on `main` get deployed to `gh-pages`
2. There is NO `keep_files: true` — every deploy **wipes gh-pages completely** and replaces it
3. Any file saved outside `Bratton-Copy-Rework/` on `main` will NEVER appear on the live site
4. Any file saved directly to `gh-pages` will be **DELETED** on the next push to `main`

### Two Branches:
| Branch | Purpose |
|--------|---------|
| `main` | Source. Files nested under `Bratton-Copy-Rework/`. Pushes trigger the deploy workflow. |
| `gh-pages` | Live site. Served at `https://nawnawnawnawnaw55-jpg.github.io/Bratton-Copy-Rework/`. Rebuilt by workflow from `main:Bratton-Copy-Rework/*`. |

---

## 3. TWO BUGS (BOTH IN editor.js)

### BUG 1: `saveToGitHub()` saves edits to wrong path (outside Bratton-Copy-Rework/)
**File:** `editor.js`, line 2215
```javascript
const file = `JenaEditedPages/${rawFile}`;   // ❌ Lands at repo root — NOT inside Bratton-Copy-Rework/
```

**Problem:** The deploy workflow only copies `Bratton-Copy-Rework/*`. Files saved to `JenaEditedPages/` at the repo root never get deployed to `gh-pages`.

**Fix:** Add the `Bratton-Copy-Rework/` prefix:
```javascript
const file = `Bratton-Copy-Rework/JenaEditedPages/${rawFile}`;   // ✅ Inside the folder the workflow copies
```

---

### BUG 2: Homepage base-content fallback URL missing `Bratton-Copy-Rework/` prefix
**File:** `editor.js`, line 2247
```javascript
liveUrl = `https://raw.githubusercontent.com/${repo}/main/_vercel_homepage.html`;   // ❌ Missing Bratton-Copy-Rework/
```

**Problem:** When Jena edits `index.html` for the FIRST time (no existing JenaEditedPages file), the code fetches the original homepage content from this URL. Because `_vercel_homepage.html` lives at `Bratton-Copy-Rework/_vercel_homepage.html` on `main`, this URL returns 404 → empty content → the guard on line 2263 aborts with "empty content" error. **First-time homepage edits silently fail every time.**

**Fix:** 
```javascript
liveUrl = `https://raw.githubusercontent.com/${repo}/main/Bratton-Copy-Rework/_vercel_homepage.html`;   // ✅ Correct path
```

---

## 4. WHAT'S NOT A BUG

### `main.js` relative path is CORRECT (line 256)
```javascript
var editedUrl = 'JenaEditedPages/' + path;   // ✅ Works perfectly — same GitHub Pages domain
```

Since everything is served from the same GitHub Pages domain (`nawnawnawnawnaw55-jpg.github.io`), the relative path resolves correctly to `https://nawnawnawnawnaw55-jpg.github.io/Bratton-Copy-Rework/JenaEditedPages/...`. No fix needed here.

---

## 5. SUMMARY TABLE (FINAL)

| # | File | Line | Current Code | Problem | Fix |
|---|------|------|-------------|---------|-----|
| 1 | `editor.js` | 2215 | `` `JenaEditedPages/${rawFile}` `` | Saves to repo root — outside workflow's copy range | `` `Bratton-Copy-Rework/JenaEditedPages/${rawFile}` `` |
| 2 | `editor.js` | 2247 | `.../main/_vercel_homepage.html` | URL 404s — `_vercel_homepage.html` is inside `Bratton-Copy-Rework/` on main | `.../main/Bratton-Copy-Rework/_vercel_homepage.html` |

---

## 6. VERIFIED FACTS

- ✅ `.github/workflows/deploy.yml` exists at repo root — line 25: `cp -r Bratton-Copy-Rework/* /tmp/deploy/`
- ✅ Workflow uses `peaceiris/actions-gh-pages@v4` WITHOUT `keep_files: true` (force-publish, wipes gh-pages each time)
- ✅ `editor.js` line 2348 hardcodes `branch: "main"` in the PUT payload (correct — stays on main)
- ✅ `editor.js` line 2213 `branchRef` is only used for the GET request (sha lookup), not the PUT
- ✅ `_vercel_homepage.html` lives at `Bratton-Copy-Rework/_vercel_homepage.html` on `main`
- ✅ Project is GitHub Pages only — no Vercel, single domain

---

## 7. STEPS TO FIX (IN ORDER)

1. **Edit `editor.js` line 2215:** Add `Bratton-Copy-Rework/` prefix to the save path
2. **Edit `editor.js` line 2247:** Add `Bratton-Copy-Rework/` prefix to the homepage base-content URL
3. **Commit and push to `main`**
4. **Wait 1-2 minutes** for the GitHub Actions workflow to rebuild `gh-pages`
5. **Test the flow:**
   - Open the editor at `https://nawnawnawnawnaw55-jpg.github.io/Bratton-Copy-Rework/`
   - Edit a page's copy and click Submit
   - Wait 1-2 minutes for deployment
   - Visit the live page — toggle button should appear
   - Click toggle to switch between Jena's edit and original

---

## 8. REPOSITORY INFO

- **GitHub Repo:** `nawnawnawnawnaw55-jpg/Bratton-Copy-Rework`
- **GitHub Pages URL:** `https://nawnawnawnawnaw55-jpg.github.io/Bratton-Copy-Rework/`
- **Deploy trigger:** Push to `main` → workflow copies `Bratton-Copy-Rework/*` → force-publishes to `gh-pages`
- **Token scope needed:** `public_repo` (for GitHub API push access from editor.js)

---

*Generated from project directory: `c:\Users\Naw\Desktop\Bratton 2\Project\Bratton-Copy-Rework`*