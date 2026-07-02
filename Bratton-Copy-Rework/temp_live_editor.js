/* =============================================================
    BRATTON PT COPY EDITOR — APPLICATION
   ================================================================
   Modules:
     DB    — Data layer: loads _page-index.json & _sections/*.json
     SB    — Sidebar: grouped navigation, search, active tracking
     TABS  — Tab management: open/close/rename tabs, +Tab
     REN   — Page Renderer: renders snippets freeform inside main
     FT    — Floating Text Toolbar: appears on text selection
     IMG   — Image Editor: floating overlay on image click
     SUBS  — Submit Flow: review modal → Discord webhook + GitHub API
     TOAST — Toast notifications
     INIT  — Bootstrap
   ================================================================ */

(function () {
  "use strict";

  // ========== GLOBAL STATE ==========
  const STATE = {
    pageIndex: [],          // [{ file, pageName, category, section }]
    pagesByCategory: {},    // category → [pageIndexItem]
    categories: [],         // ordered category names
    loadedSections: {},     // file → { html, snippets }  (raw section data)
    dirtyFiles: {},         // file → true
    dirtySnapshots: {},     // snippetId → { file, oldHtml, newHtml, pageName }
    activeTabId: null,
    tabs: [],               // [{ id, file, pageName, label, isDirty, snippets }]
    settings: {
      discordWebhook: "",
      githubToken: "",
      githubRepo: ""
    },
    sidebarCollapsed: false,
    nextTabId: 1,
    jenaActive: false,        // whether Jena-edited content is currently shown
    jenaAvailable: false,     // whether a Jena-edited version was found
    pristineSnapshots: {}     // snippetId → original innerHTML (before Jena overwrite)
  };

  // ========== DOM REFS ==========
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const DOM = {
    sidebar: $("#sidebar"),
    sidebarNav: $("#sidebar-nav"),
    sidebarSearch: $("#sidebar-search"),
    sidebarToggle: $("#btn-sidebar-toggle"),
    editorMain: $("#editor-main"),
    pageRender: $("#page-render"),
    pageLoading: $("#page-loading"),
    pageEmpty: $("#page-empty"),
    currentPageLabel: $("#current-page-label"),
    pageStatus: $("#page-status"),
    dirtyCount: $("#dirty-count"),
    btnSubmit: $("#btn-submit"),
    btnSettings: $("#btn-settings"),
    floatingToolbar: $("#floating-toolbar"),
    imageOverlay: $("#image-overlay"),
    imageUrlModal: $("#image-url-modal"),
    imageUrlInput: $("#image-url-input"),
    imageFileDrop: $("#image-file-drop"),
    imageFileInput: $("#image-file-input"),
    submitModal: $("#submit-modal"),
    submitSummary: $("#submit-summary"),
    settingsModal: $("#settings-modal"),
    settingsDiscordInput: $("#settings-discord-input"),
    settingsGithubInput: $("#settings-github-input"),
    settingsRepoInput: $("#settings-repo-input"),
    tabManager: $("#tab-manager"),
    tabManagerTabs: $("#tab-manager-tabs"),
    tabRenameModal: $("#tab-rename-modal"),
    tabRenameInput: $("#tab-rename-input"),
    toastContainer: $("#toast-container"),
    hiddenFileInput: $("#hidden-file-input"),
    ctxMenu: $("#context-menu"),
    statsDisplay: $("#stats-display"),
    btnJenaToggle: $("#btn-jena-toggle")
  };

  // ========== UTILS ==========
  function slugify(text) { return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ========== TOAST ==========
  function toast(msg, type = "info", duration = 3000) {
    const el = document.createElement("div");
    el.className = `toast toast--${type}`;
    el.innerHTML = `<span>${msg}</span>`;
    DOM.toastContainer.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transition = "opacity 0.3s ease";
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  // ========== SETTINGS ==========
  function loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem("br-editor-settings") || "{}");
      STATE.settings.discordWebhook = s.discordWebhook || "";
      STATE.settings.githubToken = s.githubToken || "";
      STATE.settings.githubRepo = s.githubRepo || "nawnawnawnawnaw55-jpg/Bratton-Copy-Rework";
      DOM.settingsDiscordInput.value = STATE.settings.discordWebhook;
      DOM.settingsGithubInput.value = STATE.settings.githubToken;
      DOM.settingsRepoInput.value = STATE.settings.githubRepo;
    } catch (e) { /* ignore */ }
  }

  function saveSettings() {
    try {
      localStorage.setItem("br-editor-settings", JSON.stringify(STATE.settings));
    } catch (e) { /* ignore */ }
  }

  // ========== DATA LAYER: DB ==========
  const DB = {
    async loadPageIndex() {
      const res = await fetch("_page-index.json");
      if (!res.ok) throw new Error(`Failed to load page index: ${res.status}`);
      const data = await res.json();
      // _page-index.json is a raw array
      STATE.pageIndex = Array.isArray(data) ? data : (data.pages || []);
      // Build categories
      const catOrder = [];
      const catMap = {};
      STATE.pageIndex.forEach(p => {
        const cat = p.category || "uncategorized";
        if (!catMap[cat]) {
          catMap[cat] = [];
          catOrder.push(cat);
        }
        catMap[cat].push(p);
      });
      STATE.pagesByCategory = catMap;
      STATE.categories = catOrder;
    },

    async loadSection(file) {
      if (STATE.loadedSections[file]) return STATE.loadedSections[file];
      // file is like "about/index.html" — strip to get section JSON
      // The section JSON is in _sections/ directory, named by section
      // We need to find which section contains this file
      const page = STATE.pageIndex.find(p => p.file === file);
      if (!page) return null;
      const sectionName = page.section || page.category || "homepage";
      const sectionFile = `_sections/${slugify(sectionName)}.json`;
      let res;
      try {
        res = await fetch(sectionFile);
        if (!res.ok) {
          // Try without slugify
          res = await fetch(`_sections/${sectionName.toLowerCase()}.json`);
        }
      } catch (e) {
        return null;
      }
      if (!res.ok) return null;
      const data = await res.json();
      STATE.loadedSections[file] = {
        html: data.html || data.pageHtml || "",
        snippets: data.snippets || {}
      };
      return STATE.loadedSections[file];
    },

    async getSnippetsForFile(file) {
      // Get all snippets that belong to this file
      const page = STATE.pageIndex.find(p => p.file === file);
      if (!page) return [];

      // Derive section filename from the "section" field (e.g., "Medical Library > Foot & Ankle")
      const sectionField = page.section || "";
      const parts = sectionField.split(/\s*>\s*/);
      const mainSlug = slugify(parts[0] || "");
      const subSlug = parts.length > 1 ? slugify(parts[1]) : null;

      // Build a filename-safe slug that matches the actual _sections/*.json filenames.
      // The files strip "&" entirely and preserve hyphens from the source section name.
      let subSlugFixed = null;
      if (parts.length > 1) {
        subSlugFixed = parts[1].toLowerCase()
          .replace(/[^a-z0-9&\s-]/g, "")   // keep letters, digits, &, whitespace, hyphens
          .trim()
          .replace(/\s+/g, "-")             // whitespace → single hyphen
          .replace(/&/g, "")                // strip & (actual filenames omit it)
          .replace(/-+/g, "-")              // collapse multi-hyphen runs
          .replace(/^-|-$/g, "");           // trim leading/trailing hyphens
      }

      const candidateFiles = [];
      if (subSlugFixed) {
        candidateFiles.push(`_sections/${mainSlug}---${subSlugFixed}.json`);
      }
      candidateFiles.push(`_sections/${mainSlug}.json`);

      // For the homepage (index.html), only include homepage.json — exclude header/footer
      if (file === "index.html") {
        if (!candidateFiles.includes("_sections/homepage.json")) candidateFiles.push("_sections/homepage.json");
      } else {
        // Also try homepage, header, footer as fallbacks for other pages
        if (!candidateFiles.includes("_sections/homepage.json")) candidateFiles.push("_sections/homepage.json");
        if (!candidateFiles.includes("_sections/header.json")) candidateFiles.push("_sections/header.json");
        if (!candidateFiles.includes("_sections/footer.json")) candidateFiles.push("_sections/footer.json");
      }

      let data = null;
      for (const sectionFile of candidateFiles) {
        try {
          const res = await fetch(sectionFile);
          if (res.ok) {
            data = await res.json();
            break;
          }
        } catch (e) { /* try next */ }
      }
      if (!data) return [];

      const allSnippets = data.snippets || {};
      // Filter snippets that have a location matching this file
      const result = [];
      for (const [id, snippet] of Object.entries(allSnippets)) {
        if (snippet.locations && Array.isArray(snippet.locations)) {
          for (const loc of snippet.locations) {
            if (loc.file === file || loc.file === file.replace(/^\//, "") || `/${loc.file}` === file) {
              result.push({ ...snippet, id, _location: loc });
              break;
            }
          }
        }
      }
      return result;
    }
  };

  // ========== SIDEBAR: SB ==========
  const SB = {
    render() {
      DOM.sidebarNav.innerHTML = "";
      const frag = document.createDocumentFragment();
      STATE.categories.forEach(cat => {
        const pages = STATE.pagesByCategory[cat];
        if (!pages || pages.length === 0) return;
        const group = document.createElement("div");
        group.className = "sb-group sb-group--collapsed";
        group.innerHTML = `
          <div class="sb-group__header">
            <i class="fas fa-chevron-right"></i>
            <span>${escapeHTML(cat)}</span>
            <span style="margin-left:auto;font-size:10px;opacity:0.5;">${pages.length}</span>
          </div>
          <div class="sb-group__items" style="max-height:0;">
            ${pages.map(p => `
              <button class="sb-item" data-file="${escapeHTML(p.file)}">
                ${escapeHTML(p.pageName || p.file)}
                <span class="sb-item__dirty">●</span>
                <span class="sb-item__finished">●</span>
              </button>
            `).join("")}
          </div>
        `;
        // Toggle group collapse
        const header = group.querySelector(".sb-group__header");
        const items = group.querySelector(".sb-group__items");
        header.addEventListener("click", () => {
          group.classList.toggle("sb-group--collapsed");
          if (group.classList.contains("sb-group--collapsed")) {
            items.style.maxHeight = "0";
          } else {
            items.style.maxHeight = items.scrollHeight + "px";
          }
        });
        frag.appendChild(group);
      });
      DOM.sidebarNav.appendChild(frag);

      // Click handler on items
      DOM.sidebarNav.addEventListener("click", (e) => {
        const item = e.target.closest(".sb-item");
        if (!item) return;
        const file = item.dataset.file;
        if (file) TABS.openTab(file);
      });

      // Apply finished status dots and category-all-done headers
      this.refreshStatus();
    },

    /** Re-apply .sb-item--finished and .sb-group__header--all-finished classes */
    refreshStatus() {
      // Per-item: green dot if page has ever been submitted AND is not currently dirty
      DOM.sidebarNav.querySelectorAll(".sb-item").forEach(item => {
        const file = item.dataset.file;
        if (!file) return;
        const isDirty = item.classList.contains("sb-item--dirty");
        if (STATS.isPageFinished(file) && !isDirty) {
          item.classList.add("sb-item--finished");
        } else {
          item.classList.remove("sb-item--finished");
        }
      });

      // Per-category: green header if ALL pages in that category are finished
      DOM.sidebarNav.querySelectorAll(".sb-group").forEach(group => {
        const header = group.querySelector(".sb-group__header");
        const catLabel = header ? (header.querySelector(":scope > span") || header).textContent.trim() : "";
        if (catLabel && STATS.areAllCategoryFinished(catLabel)) {
          group.classList.add("sb-group--all-finished");
        } else {
          group.classList.remove("sb-group--all-finished");
        }
      });
    },

    setActive(file) {
      DOM.sidebarNav.querySelectorAll(".sb-item--active").forEach(el => el.classList.remove("sb-item--active"));
      const item = DOM.sidebarNav.querySelector(`.sb-item[data-file="${CSS.escape(file)}"]`);
      if (item) {
        item.classList.add("sb-item--active");
        item.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    },

    markDirty(file, isDirty) {
      const item = DOM.sidebarNav.querySelector(`.sb-item[data-file="${CSS.escape(file)}"]`);
      if (!item) return;
      if (isDirty) {
        item.classList.add("sb-item--dirty");
      } else {
        item.classList.remove("sb-item--dirty");
      }
    },

    search(query) {
      const q = query.toLowerCase().trim();
      DOM.sidebarNav.querySelectorAll(".sb-item").forEach(item => {
        const name = (item.textContent || "").toLowerCase();
        const file = item.dataset.file || "";
        if (q === "" || name.includes(q) || file.toLowerCase().includes(q)) {
          item.classList.remove("sb-item--hidden");
        } else {
          item.classList.add("sb-item--hidden");
        }
      });
      // Show/hide groups
      DOM.sidebarNav.querySelectorAll(".sb-group").forEach(group => {
        const visible = group.querySelectorAll(".sb-item:not(.sb-item--hidden)").length;
        group.style.display = visible > 0 ? "" : "none";
      });
    }
  };

  // ========== TAB MANAGEMENT: TABS ==========
  const TABS = {
    openTab(file) {
      // Check if already open
      let tab = STATE.tabs.find(t => t.file === file);
      if (tab) {
        this.activateTab(tab.id);
        return;
      }
      // Create new tab
      const page = STATE.pageIndex.find(p => p.file === file);
      if (!page) {
        toast("Page not found in index.", "error");
        return;
      }
      const id = STATE.nextTabId++;
      const label = page.pageName || file;
      tab = { id, file, pageName: page.pageName, label, isDirty: false, snippets: null };
      STATE.tabs.push(tab);
      this.renderTabBar();
      this.activateTab(id);
    },

    activateTab(id) {
      STATE.activeTabId = id;
      this.renderTabBar();
      const tab = STATE.tabs.find(t => t.id === id);
      if (!tab) {
        DOM.pageRender.style.display = "none";
        DOM.pageEmpty.style.display = "flex";
        DOM.pageLoading.style.display = "none";
        DOM.currentPageLabel.textContent = "No page selected";
        this.updateTabManagerVisibility();
        return;
      }
      DOM.pageLoading.style.display = "none";
      DOM.pageEmpty.style.display = "none";
      DOM.pageRender.style.display = "block";
      DOM.currentPageLabel.textContent = tab.label;
      SB.setActive(tab.file);
      this.updateTabManagerVisibility();
      // Re-render snippets
      if (tab.snippets) {
        REN.renderSnippets(tab);
      } else {
        DOM.pageLoading.style.display = "flex";
        DOM.pageRender.style.display = "none";
        REN.loadPage(tab.file, id);
      }
      this.updateSubmitButton();
    },

    closeTab(id) {
      const idx = STATE.tabs.findIndex(t => t.id === id);
      if (idx === -1) return;
      const tab = STATE.tabs[idx];

      // If dirty, warn
      if (tab.isDirty) {
        if (!confirm(`"${tab.label}" has unsaved changes. Close anyway?`)) return;
        // Clear dirty tracking for this tab
        this.clearDirtyForTab(tab);
      }

      STATE.tabs.splice(idx, 1);
      this.renderTabBar();

      if (STATE.activeTabId === id) {
        if (STATE.tabs.length > 0) {
          this.activateTab(STATE.tabs[STATE.tabs.length - 1].id);
        } else {
          STATE.activeTabId = null;
          DOM.pageRender.style.display = "none";
          DOM.pageEmpty.style.display = "flex";
          DOM.pageLoading.style.display = "none";
          DOM.currentPageLabel.textContent = "No page selected";
          DOM.tabManager.style.display = "none";
          DOM.editorMain.classList.remove("has-tabs");
          this.updateSubmitButton();
        }
      }
    },

    clearDirtyForTab(tab) {
      const file = tab.file;
      STATE.dirtyFiles[file] = false;
      for (const key of Object.keys(STATE.dirtySnapshots)) {
        if (STATE.dirtySnapshots[key].file === file) {
          delete STATE.dirtySnapshots[key];
        }
      }
      tab.isDirty = false;
      SB.markDirty(file, false);
      this.renderTabBar();
    },

    renameTab(id) {
      const tab = STATE.tabs.find(t => t.id === id);
      if (!tab) return;
      DOM.tabRenameInput.value = tab.label;
      DOM.tabRenameModal.style.display = "flex";
      DOM.tabRenameModal._renameTarget = id;
    },

    renderTabBar() {
      DOM.tabManagerTabs.innerHTML = "";
      STATE.tabs.forEach(tab => {
        const el = document.createElement("div");
        el.className = "tab-item" +
          (tab.id === STATE.activeTabId ? " tab-item--active" : "") +
          (tab.isDirty ? " tab-item--dirty" : "");
        el.innerHTML = `
          <span class="tab-item__label" data-tab-id="${tab.id}">${escapeHTML(tab.label)}${tab.isDirty ? " ●" : ""}</span>
          <span class="tab-item__rename" data-tab-rename="${tab.id}" title="Rename"><i class="fas fa-pencil-alt"></i></span>
          <span class="tab-item__close" data-tab-close="${tab.id}" title="Close"><i class="fas fa-times"></i></span>
        `;
        el.querySelector(".tab-item__label").addEventListener("click", () => this.activateTab(tab.id));
        el.querySelector(".tab-item__rename").addEventListener("click", (e) => { e.stopPropagation(); this.renameTab(tab.id); });
        el.querySelector(".tab-item__close").addEventListener("click", (e) => { e.stopPropagation(); this.closeTab(tab.id); });
        DOM.tabManagerTabs.appendChild(el);
      });
      this.updateTabManagerVisibility();
    },

    updateTabManagerVisibility() {
      if (STATE.tabs.length > 1) {
        DOM.tabManager.style.display = "flex";
        DOM.editorMain.classList.add("has-tabs");
      } else if (STATE.tabs.length === 1) {
        // Show bar only if there are multiple tabs
        DOM.tabManager.style.display = "flex";
        DOM.editorMain.classList.add("has-tabs");
      } else {
        DOM.tabManager.style.display = "none";
        DOM.editorMain.classList.remove("has-tabs");
      }
    },

    markDirty(id) {
      const tab = STATE.tabs.find(t => t.id === id);
      if (!tab) return;
      tab.isDirty = true;
      STATE.dirtyFiles[tab.file] = true;
      SB.markDirty(tab.file, true);
      this.renderTabBar();
      this.updateSubmitButton();
    },

    updateSubmitButton() {
      const dirtyCount = Object.values(STATE.dirtyFiles).filter(Boolean).length;
      DOM.btnSubmit.disabled = dirtyCount === 0;
      if (dirtyCount > 0) {
        DOM.dirtyCount.style.display = "";
        DOM.dirtyCount.textContent = `${dirtyCount} file${dirtyCount > 1 ? "s" : ""} edited`;
        DOM.pageStatus.className = "page-status page-status--dirty";
      } else {
        DOM.dirtyCount.style.display = "none";
        DOM.dirtyCount.textContent = "";
        DOM.pageStatus.className = "page-status page-status--clean";
      }
    }
  };

  // ========== PAGE RENDERER: REN ==========
  const REN = {
    async loadPage(file, tabId) {
      DOM.pageLoading.style.display = "flex";
      DOM.pageRender.style.display = "none";
      DOM.pageEmpty.style.display = "none";
      DOM.currentPageLabel.textContent = "Loading...";

      try {
        const snippets = await DB.getSnippetsForFile(file);
        const tab = STATE.tabs.find(t => t.id === tabId);
        if (!tab) {
          DOM.pageLoading.style.display = "none";
          DOM.pageEmpty.style.display = "flex";
          DOM.pageRender.style.display = "none";
          return;
        }
        tab.snippets = snippets;
        DOM.pageLoading.style.display = "none";
        DOM.pageRender.style.display = "block";
        DOM.currentPageLabel.textContent = tab.label;
        this.renderSnippets(tab);
        // After rendering, check if there's a Jena-edited version on GitHub and auto-load it
        this._checkJenaEditedPage(file, tab);
      } catch (e) {
        console.error("Failed to load page:", file, e);
        DOM.pageLoading.style.display = "none";
        DOM.pageRender.style.display = "none";
        DOM.pageEmpty.style.display = "flex";
        DOM.pageEmpty.querySelector("p").textContent = `Failed to load: ${file}`;
        toast("Failed to load page: " + file, "error");
      }
    },

    /**
     * Checks GitHub Pages for an existing Jena-edited version of the current page.
     * If found, loads the edited snippet content into the editor by default.
     * Adds a small badge indicator showing edits are loaded.
     */
    async _checkJenaEditedPage(file, tab) {
      try {
        // Fetch from the live URL (served from main branch)
        const jenaFile = `JenaEditedPages/${file}`;
        const res = await fetch(jenaFile);
        if (!res.ok) {
          console.log(`[_checkJenaEditedPage] No Jena-edited version for ${file} (status ${res.status})`);
          STATE.jenaAvailable = false;
          DOM.btnJenaToggle.style.display = "none";
          return; // no edited version exists — use pristine content
        }

        const editedHtml = await res.text();

        // Parse the edited HTML and extract snippet content using DOM selectors
        const parser = new DOMParser();
        const doc = parser.parseFromString(editedHtml, "text/html");

        // For each snippet in the tab, save the pristine (original) HTML, then overwrite with Jena edits
        let loadedCount = 0;
        STATE.pristineSnapshots = {};
        for (const snippet of tab.snippets) {
          if (!snippet.selector) continue;
          try {
            // Save the original HTML before it gets overwritten
            STATE.pristineSnapshots[snippet.id] = snippet.originalHtml;
            const el = doc.querySelector(snippet.selector);
            if (el) {
              snippet.originalHtml = el.innerHTML;
              loadedCount++;
            }
          } catch (selectorErr) {
            // selector didn't match — skip this snippet
          }
        }

        if (loadedCount > 0) {
          // Re-render with the Jena-edited content
          this.renderSnippets(tab);
          // Show the toggle and mark state
          STATE.jenaAvailable = true;
          STATE.jenaActive = true;
          DOM.btnJenaToggle.style.display = "";
          DOM.btnJenaToggle.style.display = "";
          DOM.btnJenaToggle.innerHTML = "✏️ Show Original";
          DOM.currentPageLabel.textContent = `✏️ ${tab.label}`;
          console.log(`[_checkJenaEditedPage] Loaded ${loadedCount} edited snippets for ${file}`);
        }
      } catch (e) {
        // Non-critical — just log and continue with pristine content
        console.warn(`[_checkJenaEditedPage] Error loading Jena edits for ${file}:`, e.message);
      }
    },

    /**
     * Toggle the editor preview between Jena-edited content and the original (pristine) content.
     */
    _toggleJenaEdits() {
      const tab = STATE.tabs.find(t => t.id === STATE.activeTabId);
      if (!tab || !tab.snippets) return;

      if (STATE.jenaActive) {
        // Currently showing Jena edits — switch to pristine original
        for (const snippet of tab.snippets) {
          if (STATE.pristineSnapshots[snippet.id] !== undefined) {
            snippet.originalHtml = STATE.pristineSnapshots[snippet.id];
          }
        }
        STATE.jenaActive = false;
        DOM.btnJenaToggle.innerHTML = "✏️ Show Jena Edits";
        DOM.currentPageLabel.textContent = `📄 ${tab.label}`;
        this.renderSnippets(tab);
        console.log("[_toggleJenaEdits] Switched to ORIGINAL (pristine) content");
      } else {
        // Currently showing original — switch back to Jena edits
        // Need to re-fetch from the JenaEditedPages file
        this._reloadJenaEdits(tab);
      }
    },

    async _reloadJenaEdits(tab) {
      try {
        const jenaFile = `JenaEditedPages/${tab.file}`;
        const res = await fetch(jenaFile);
        if (!res.ok) {
          toast("Jena-edited file no longer available.", "warning");
          return;
        }
        const editedHtml = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(editedHtml, "text/html");
        let loadedCount = 0;
        for (const snippet of tab.snippets) {
          if (!snippet.selector) continue;
          try {
            const el = doc.querySelector(snippet.selector);
            if (el) {
              snippet.originalHtml = el.innerHTML;
              loadedCount++;
            }
          } catch (e) { /* skip */ }
        }
        if (loadedCount > 0) {
          STATE.jenaActive = true;
          DOM.btnJenaToggle.innerHTML = "✏️ Show Original";
          DOM.currentPageLabel.textContent = `✏️ ${tab.label}`;
          this.renderSnippets(tab);
          console.log(`[_reloadJenaEdits] Reloaded ${loadedCount} Jena edits for ${tab.file}`);
        }
      } catch (e) {
        console.warn("[_reloadJenaEdits] Error:", e.message);
        toast("Failed to reload Jena edits.", "error");
      }
    },

    /**
     * Extract section-internal wrapper elements from previewContext that are NOT snippets.
     * These are structural elements like hero__bg divs, logo strips, parallax shapes,
     * and dividers that appear INSIDE the section but BEFORE the first snippet.
     * Returns an object:
     *   { beforeFirstSnippet: string, afterLastSnippet: string, betweenGroupDividers: string }
     */
    extractSectionInnerElements(previewContext, sectionKey) {
      const result = { beforeFirstSnippet: "", afterLastSnippet: "", betweenGroupDividers: "" };
      if (!previewContext) return result;

      // We're passed the leading portion of previewContext (before the
      // snippet's originalHtml).  Some structural elements, however, only
      // appear in the TRAILING portion — e.g. hero__logo-strip sits between
      // the hero__overlay and the hero closing </section> tag.
      // So we scan both halves independently.

      // 1. Hero background images: <div class="hero__bg ..."></div>
      const heroBgRegex = /<div\s+class="hero__bg[^"]*"[^>]*>[\s\S]*?<\/div>/gi;
      const heroBgMatches = [];
      let bgMatch;
      while ((bgMatch = heroBgRegex.exec(previewContext)) !== null) {
        heroBgMatches.push(bgMatch[0]);
      }

      // 1a. Orphaned hero bg fragments — the previewContext (±300-char window)
      // may truncate the opening <div class="hero__bg" tag, leaving only the
      // URL tail + background-position + closing tag (e.g. for the very first
      // snippet on a page).  Detect these and reconstruct the full element.
      const orphanBgRegex = /(?:^|\n)\s*([^\s<\[][^\n]*?background-position[^\n]*?"><\/div>)/gi;
      let orphanMatch;
      while ((orphanMatch = orphanBgRegex.exec(previewContext)) !== null) {
        const fragment = orphanMatch[1].trim();
        // Skip if already captured by the normal heroBgRegex
        if (heroBgMatches.some(m => m.includes(fragment))) continue;
        // Extract pexels base URL from nearby content (the mobile bg div)
        const pexelsBaseMatch = previewContext.match(/(https:\/\/images\.pexels\.com\/photos\/\d+\/)/i);
        const pexelsBase = pexelsBaseMatch ? pexelsBaseMatch[1] : "";
        // Extract pexels photo ID
        const photoIdMatch = previewContext.match(/pexels-photo-(\d+)/);
        const photoId = photoIdMatch ? photoIdMatch[1] : "";
        // Fragment format: "file.jpeg?params');bg-position:50% 60%"></div>"
        // Split at the first "');" to get urlTail vs restOfStyle
        const splitIdx = fragment.indexOf("');");
        const urlTail = splitIdx >= 0 ? fragment.slice(0, splitIdx) : fragment;
        const restOfStyle = splitIdx >= 0 ? fragment.slice(splitIdx) : "";
        // Build full URL: BASE + pexels-photo-ID- + urlTail
        const fullUrl = pexelsBase && photoId
          ? `${pexelsBase}pexels-photo-${photoId}-${urlTail}`
          : urlTail;
        const reconstructed = `<div class="hero__bg" style="background-image:url('${fullUrl}${restOfStyle}`;
        heroBgMatches.push(reconstructed);
      }

      if (heroBgMatches.length > 0) {
        result.beforeFirstSnippet += heroBgMatches.join("\n") + "\n";
      }

      // 2. Hero logo strip: <div class="hero__logo-strip">...</div>
      // Appears AFTER the first snippet (hero__overlay) but still inside
      // the hero section, before the closing </section>.
      const logoStripMatch = previewContext.match(/<div\s+class="hero__logo-strip"[^>]*>[\s\S]*?<\/div>/gi);
      if (logoStripMatch) {
        // Deduplicate — multiple snippets may share the same previewContext window
        result.beforeFirstSnippet += [...new Set(logoStripMatch)].join("\n") + "\n";
      }

      // 3. Angular parallax bg shapes: <div class="angular-parallax-bg-shape ..."></div>
      const parallaxRegex = /<div\s+class="angular-parallax-bg-shape[^"]*"[^>]*>[\s\S]*?<\/div>/gi;
      let parallaxMatch;
      while ((parallaxMatch = parallaxRegex.exec(previewContext)) !== null) {
        result.beforeFirstSnippet += parallaxMatch[0] + "\n";
      }

      // 4. Angular slash dividers (between sections): standalone divider elements
      const dividerRegex = /<div\s+class="angular-slash-divider"[^>]*>[\s\S]*?<\/div>/gi;
      let divMatch;
      while ((divMatch = dividerRegex.exec(previewContext)) !== null) {
        result.betweenGroupDividers += divMatch[0] + "\n";
      }

      // 5. Hero content wrapper open tag (needed so hero__content has a parent)
      const heroContentRegex = /<div\s+class="hero__content"[^>]*>/i;
      const heroContentMatch = previewContext.match(heroContentRegex);
      if (heroContentMatch) {
        result.beforeFirstSnippet += heroContentMatch[0] + "\n";
      }

      return result;
    },

    /**
     * Extract the outer section wrapper from a previewContext string.
     * Returns { tag, classAttr, otherAttrs } or null.
     * Handles: <section class="hero hero--logo-overlap">, <section class="section section--light hero-next-section">, etc.
     */
    extractSectionWrapper(previewContext) {
      if (!previewContext) return null;
      // The previewContext shows HTML leading up to the snippet's originalHtml.
      // When a grid is split across multiple snippets (e.g., three cards in a 2-column grid),
      // later snippets may not contain the opening <section> tag of their parent section —
      // the tag has already scrolled out of the previewContext. A naive first-match
      // regex would latch onto a different (wrong) section tag that appears later.
      //
      // Fix: scan ALL <section open> and </section close> tags in order, maintain a stack
      // of currently-open sections. The section open at the END of previewContext is the
      // one that actually encloses this snippet.
      const tagRegex = /<\/?section(?:\s[^>]*)?>/gi;
      const attrRegex = /<section\s+([^>]*?)class="([^"]*)"([^>]*?)>/i;
      let stack = []; // stack of { tag, classAttr, fullTag }
      let match;

      while ((match = tagRegex.exec(previewContext)) !== null) {
        const tagStr = match[0];
        if (tagStr.startsWith('</section')) {
          // Closing tag — pop the stack
          if (stack.length > 0) stack.pop();
        } else {
          // Opening tag — extract class and push
          const attrMatch = tagStr.match(attrRegex);
          if (attrMatch) {
            stack.push({
              tag: 'section',
              classAttr: attrMatch[2],
              fullTag: tagStr
            });
          } else {
            // Section tag without a class attribute — push placeholder
            stack.push({
              tag: 'section',
              classAttr: '',
              fullTag: tagStr
            });
          }
        }
      }

      if (stack.length > 0) {
        return stack[stack.length - 1];
      }

      // Also handle <div> wrappers that act as sections (same stack-based approach)
      const divTagRegex = /<\/?div(?:\s[^>]*)?>/gi;
      const divAttrRegex = /<(div)\s+([^>]*?)class="([^"]*section[^"]*)"([^>]*?)>/i;
      let divStack = [];

      while ((match = divTagRegex.exec(previewContext)) !== null) {
        const tagStr = match[0];
        if (tagStr.startsWith('</div')) {
          if (divStack.length > 0) divStack.pop();
        } else {
          const attrMatch = tagStr.match(divAttrRegex);
          if (attrMatch) {
            divStack.push({
              tag: 'div',
              classAttr: attrMatch[3],
              fullTag: tagStr
            });
          }
        }
      }

      if (divStack.length > 0) {
        return divStack[divStack.length - 1];
      }

      return null;
    },

    renderSnippets(tab) {
      DOM.pageRender.innerHTML = "";
      if (!tab.snippets || tab.snippets.length === 0) {
        DOM.pageRender.innerHTML = '<div style="padding:40px;text-align:center;color:var(--c-text-muted);">No editable content found for this page.</div>';
        return;
      }

      // Group snippets by their section wrapper for proper CSS scoping
      let currentSection = null;
      let sectionContainer = null;

      tab.snippets.forEach(snippet => {
        // previewContext is a ±300-char symmetric window around the snippet.
        // The trailing half can bleed into the NEXT section's <section> tag,
        // causing extractSectionWrapper to return the wrong section.
        // Only scan the portion BEFORE the snippet's own originalHtml.
        const pc = snippet.previewContext || "";
        const idx = pc.indexOf(snippet.originalHtml);
        const leadingCtx = idx >= 0 ? pc.slice(0, idx) : pc;
        const sectionInfo = this.extractSectionWrapper(leadingCtx);

        // Determine if we need a new section container.
        // We only create a new section when:
        // 1. It's the first snippet (no sectionContainer yet)
        // 2. The extracted section class differs from the current one
        const needsNewSection = 
          !sectionContainer || // first snippet
          (sectionInfo && (!currentSection || currentSection.classAttr !== sectionInfo.classAttr)); // section changed

        if (needsNewSection) {
          if (sectionInfo) {
            currentSection = sectionInfo;
            sectionContainer = document.createElement(sectionInfo.tag || "section");
            sectionContainer.className = currentSection.classAttr;
            // Preserve inline styles from the original section tag
            const styleMatch = currentSection.fullTag.match(/style="([^"]*)"/i);
            if (styleMatch) {
              sectionContainer.setAttribute("style", styleMatch[1]);
            }
          } else {
            // No section info — the opening tag is >300 chars before this snippet
            // (common for hero section). Infer section class from previewContext patterns.
            if (!sectionContainer) {
              // Detect hero section by content patterns (hero__bg, hero__overlay, hero__logo-strip)
              const fullCtx = snippet.previewContext || "";
              if (fullCtx.indexOf("hero__overlay") !== -1 || fullCtx.indexOf("hero__bg") !== -1 || fullCtx.indexOf("hero__logo-strip") !== -1) {
                currentSection = { classAttr: "hero hero--logo-overlap", fullTag: '<section class="hero hero--logo-overlap">', tag: 'section' };
                sectionContainer = document.createElement("section");
                sectionContainer.className = "hero hero--logo-overlap";
              } else {
                currentSection = { classAttr: "section", fullTag: '<section class="section">', tag: 'section' };
                sectionContainer = document.createElement("section");
                sectionContainer.className = "section";
              }
            }
            // If we already have a sectionContainer, reuse it (do nothing).
          }
          // Inject section-internal structural elements (hero bg images, logo strip,
          // parallax shapes, dividers) for the FIRST snippet of each section.
          // Scan the FULL previewContext, not just the leading half.  Structural
          // elements like hero__logo-strip sit between the first snippet and the
          // closing </section> tag — i.e. in the TRAILING portion.
          const innerEls = this.extractSectionInnerElements(pc, currentSection.classAttr);
          if (innerEls.beforeFirstSnippet) {
            sectionContainer.insertAdjacentHTML("afterbegin", innerEls.beforeFirstSnippet);
          }
          if (innerEls.betweenGroupDividers) {
            sectionContainer._pendingDividers = innerEls.betweenGroupDividers;
          }
          // Only append to DOM if we created a new container
          if (sectionContainer && !sectionContainer.parentNode) {
            DOM.pageRender.appendChild(sectionContainer);
          }
        }

        const wrapper = document.createElement("div");
        wrapper.className = "br-snippet";
        wrapper.dataset.snippetId = snippet.id;
        wrapper.innerHTML = snippet.originalHtml;

        // Make most text-containing elements editable
        // But NOT: images, anchors with href only, structural wrappers
        const editableTags = ["H1", "H2", "H3", "H4", "H5", "H6", "P", "LI", "A", "SPAN", "DIV", "TD", "TH", "STRONG", "EM", "B", "I", "BLOCKQUOTE", "PRE", "CODE", "LABEL", "LEGEND", "FIGCAPTION"];
        const skipTags = ["IMG", "SCRIPT", "STYLE", "SVG", "VIDEO", "AUDIO", "IFRAME", "BR", "HR", "INPUT", "BUTTON", "SELECT", "TEXTAREA"];

        wrapper.querySelectorAll("*").forEach(el => {
          const tag = el.tagName.toUpperCase();
          if (skipTags.includes(tag)) {
            el.setAttribute("contenteditable", "false");
            return;
          }
          // If it's an anchor without text content, skip
          if (tag === "A" && !el.textContent.trim() && el.querySelector("img")) {
            el.setAttribute("contenteditable", "false");
            return;
          }
          // If element has only image children, mark container as noedit
          if (el.querySelector("img") && !el.textContent.trim()) {
            el.setAttribute("contenteditable", "false");
            return;
          }
          if (editableTags.includes(tag) && el.textContent.trim()) {
            el.setAttribute("contenteditable", "true");
            el.dataset.placeholder = "Edit " + tag.toLowerCase() + "...";
          } else if (el.children.length === 0 && el.textContent.trim()) {
            el.setAttribute("contenteditable", "true");
          } else {
            el.setAttribute("contenteditable", "false");
          }
        });

        // Fix relative image paths — use local files/ directory
        wrapper.querySelectorAll("img").forEach(img => {
          const src = img.getAttribute("src");
          if (src && !src.startsWith("data:") && !src.startsWith("http")) {
            // Convert /files/... or files/... to local files/ path
            const cleanPath = src.replace(/^\/+/, "");
            img.src = cleanPath;
          }
          // Also fix srcset
          const srcset = img.getAttribute("srcset");
          if (srcset) {
            img.setAttribute("srcset", srcset.replace(/(?:^|,\s*)(\/[^,\s]+)/g, (m, p) => m.replace(p, p.replace(/^\/+/, ""))));
          }
          img.setAttribute("contenteditable", "false");
          img.style.cursor = "pointer";
          img.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            IMG.show(img, wrapper);
          });
        });

        // Image audit: check all images load, flag broken ones
        this.auditImages(wrapper, snippet.id, tab);

        // Track edits
        wrapper.addEventListener("input", (e) => {
          const el = e.target;
          if (el.isContentEditable && el.closest(".br-snippet")) {
            const snippetWrapper = el.closest(".br-snippet");
            const snippetId = snippetWrapper.dataset.snippetId;
            const snippet = tab.snippets.find(s => s.id === snippetId);
            if (snippet) {
              const newHtml = snippetWrapper.innerHTML;
              if (snippet._originalHtml === undefined) {
                snippet._originalHtml = snippet.originalHtml;
              }
              // Find the CSS selector for this snippet
              let sel = null;
              if (snippet.locations && Array.isArray(snippet.locations)) {
                const loc = snippet.locations.find(l =>
                  l.file === tab.file ||
                  l.file === tab.file.replace(/^\//, "") ||
                  "/" + l.file === tab.file
                );
                if (loc && loc.selector) sel = loc.selector;
              }
              STATE.dirtySnapshots[snippetId] = {
                file: tab.file,
                oldHtml: snippet._originalHtml,
                newHtml: newHtml,
                pageName: tab.pageName,
                snippetId: snippetId,
                selector: sel
              };
              LOG.append(STATE.dirtySnapshots[snippetId], tab.id);
              TABS.markDirty(tab.id);
            }
          }
        });

        sectionContainer.appendChild(wrapper);
      });

      // Post-process: Re-group orphan grid children into their parent grids.
      // When snippets are split mid-grid, grid children end up in separate .br-snippet
      // wrappers, breaking CSS grid layout. This moves them back as direct grid children.
      this._reGroupOrphanGridChildren();

      // Post-process: Re-group orphan tab children (ml-tab-nav, ml-tab-panels, etc.)
      // back into their parent .ml-tabs container — same root cause as grid orphan issue.
      this._reGroupOrphanTabChildren();

      // After re-grouping tab orphans, refresh sidebar tab sub-items
      this._refreshSidebarTabSubItems();

      // Bind click handlers to .ml-tab-btn buttons in the preview.
      // The live site uses inline <script> tags for this, but the editor
      // strips scripts when rendering snippets.  Event delegation on the
      // preview container ensures tab switching works after every render.
      this._bindTabButtonClicks();


    },

    /**
     * Attach a delegated click handler on the preview container so that
     * clicking any .ml-tab-btn in a .ml-tabs component switches panels.
     * This replaces the inline <script> removed during snippet rendering.
     */
    _bindTabButtonClicks() {
      // Remove any previously attached handler to avoid duplicates
      if (this._tabClickHandler) {
        DOM.pageRender.removeEventListener("click", this._tabClickHandler);
      }

      this._tabClickHandler = (e) => {
        const btn = e.target.closest(".ml-tab-btn");
        if (!btn) return;

        e.preventDefault();
        e.stopPropagation();

        const tabsContainer = btn.closest(".ml-tabs");
        if (!tabsContainer) return;

        const targetId = btn.getAttribute("data-ml-tab");
        if (!targetId) return;

        const allBtns = tabsContainer.querySelectorAll(".ml-tab-btn");
        const allPanels = tabsContainer.querySelectorAll(".ml-tab-panel");

        // Deactivate all buttons and panels
        allBtns.forEach(b => {
          b.classList.remove("ml-tab-btn--active");
          b.setAttribute("aria-selected", "false");
        });
        allPanels.forEach(p => {
          p.classList.remove("ml-tab-panel--active");
          p.setAttribute("hidden", "");
        });

        // Activate the clicked button
        btn.classList.add("ml-tab-btn--active");
        btn.setAttribute("aria-selected", "true");

        // Find matching panel by data-ml-tab-panel attribute
        let matched = tabsContainer.querySelector(`[data-ml-tab-panel="${targetId}"]`);

        // Fallback: match by positional index
        if (!matched) {
          const btnsArr = Array.from(allBtns);
          const panelsArr = Array.from(allPanels);
          const idx = btnsArr.indexOf(btn);
          if (idx >= 0 && idx < panelsArr.length) {
            matched = panelsArr[idx];
          }
        }

        if (matched) {
          matched.classList.add("ml-tab-panel--active");
          matched.removeAttribute("hidden");
        }
      };

      DOM.pageRender.addEventListener("click", this._tabClickHandler);
    },

    /**
     * After rendering, find all .br-snippet wrappers that contain a .grid element
     * and merge orphan grid-children from subsequent sibling wrappers into the grid.
     * This fixes side-by-side / grid layouts that render as vertical stacks.
     *
     * Grid containers (e.g. .grid--3 for 3-column layouts) and their child divs
     * can get split across separate .br-snippet wrappers when the page content
     * spans multiple snippets.  This function scans ALL subsequent sibling wrappers
     * after each grid, identifies orphan grid children (divs that are NOT structural
     * containers/sections/grids themselves), and moves them back into the grid.
     */
    _reGroupOrphanGridChildren() {

      /** True when a direct child div is a structural layout block that starts a new independent section. */
      const isStructuralChild = (el) => {
        const cls = (el.className || "").toLowerCase();
        return /\b(?:container|section|grid)\b/.test(cls);
      };

      const allGrids = Array.from(DOM.pageRender.querySelectorAll(".br-snippet .grid"));
      for (const gridEl of allGrids) {
        const gridWrapper = gridEl.closest(".br-snippet");
        if (!gridWrapper) continue;

        const toRemove = [];
        // Scan subsequent sibling wrappers up to the next structural boundary
        let next = gridWrapper.nextElementSibling;

        while (next && next.classList.contains("br-snippet")) {
          const children = Array.from(next.children);

          if (children.length === 0) {
            // Empty wrapper — safe to remove
            toRemove.push(next);
            next = next.nextElementSibling;
            continue;
          }

          // Separate structural children from orphan grid children.
          // If a wrapper contains BOTH (e.g., an orphan grid-card and a new
          // container/section), we must move the orphans into the grid BEFORE
          // breaking, so the last grid child doesn't get stranded outside.
          const structuralKids = children.filter(isStructuralChild);
          const orphanKids = children.filter(c => !isStructuralChild(c));

          // Move only the non-structural (orphan) children into the grid
          for (const child of orphanKids) {
            gridEl.appendChild(child);
          }

          if (structuralKids.length > 0) {
            // This wrapper also contains structural layout blocks that
            // start a new section — stop scanning after this wrapper.
            break;
          }

          // All children were orphans — safe to remove the now-empty wrapper
          toRemove.push(next);
          next = next.nextElementSibling;
        }

        // Remove wrappers that were emptied by the merge
        for (const w of toRemove) w.remove();
      }

      // Final cleanup: remove any remaining empty .br-snippet wrappers
      DOM.pageRender.querySelectorAll(".br-snippet").forEach(w => {
        if (!w.firstElementChild) w.remove();
      });
    },

    /**
     * After rendering, find .ml-tabs containers and merge orphan tab children
     * (buttons in .ml-tab-nav and panels in .ml-tab-panels) from subsequent
     * sibling .br-snippet wrappers back into the parent .ml-tabs container.
     *
     * This fixes medical library tabs that render broken because the
     * .ml-tab-btn buttons and .ml-tab-panel divs got split across separate
     * .br-snippet wrappers — the same root cause as the grid orphan issue.
     */
    _reGroupOrphanTabChildren() {

      /** True when a wrapper's direct children are NOT structural layout blocks. */
      const isOrphanWrapper = (wrapper) => {
        if (!wrapper || !wrapper.classList.contains("br-snippet")) return false;
        const kids = Array.from(wrapper.children);
        if (kids.length === 0) return true; // empty → safe to remove
        return !kids.some(c => {
          const cls = (c.className || "").toLowerCase();
          // NOTE: ml-tab-nav, ml-tab-panels, and ml-tab-panel are NOT treated as structural
          // here so they get merged back into the parent .ml-tabs container during re-grouping.
          // Otherwise tab buttons can't find their panels and clicks do nothing.
          return /\bcontainer\b/.test(cls) || /\bsection\b/.test(cls) || /\bgrid\b/.test(cls)
            || /\bml-tabs\b/.test(cls);
        });
      };

      /** True when a wrapper starts a new structural section. */
      const isStructuralBoundary = (wrapper) => {
        if (!wrapper || !wrapper.classList.contains("br-snippet")) return true;
        const kids = Array.from(wrapper.children);
        if (kids.length === 0) return false;
        return kids.some(c => {
          const cls = (c.className || "").toLowerCase();
          return /\bcontainer\b/.test(cls) || /\bsection\b/.test(cls);
        });
      };

      const allTabGroups = Array.from(DOM.pageRender.querySelectorAll(".br-snippet .ml-tabs"));
      for (const tabsEl of allTabGroups) {
        const tabsWrapper = tabsEl.closest(".br-snippet");
        if (!tabsWrapper) continue;

        // Locate the .ml-tab-nav and .ml-tab-panels containers (they may not
        // exist yet if all children are orphaned)
        let tabNav = tabsEl.querySelector(".ml-tab-nav");
        let tabPanels = tabsEl.querySelector(".ml-tab-panels");

        const toRemove = [];
        let next = tabsWrapper.nextElementSibling;

        while (next && next.classList.contains("br-snippet")) {
          // Stop at structural boundaries
          if (isStructuralBoundary(next)) break;

          const children = Array.from(next.children);

          if (children.length === 0) {
            // Empty wrapper — safe to remove
            toRemove.push(next);
            next = next.nextElementSibling;
            continue;
          }

          if (isOrphanWrapper(next)) {
            // This wrapper contains orphan tab children — figure out where
            // each child belongs and move it into the .ml-tabs container.
            for (const child of children) {
              const cls = (child.className || "").toLowerCase();

              if (/\bml-tab-nav\b/.test(cls)) {
                // This is the tab navigation bar — if we don't have one yet, use it
                if (!tabNav) {
                  tabNav = child;
                  tabsEl.appendChild(child);
                } else {
                  // Merge buttons from this nav into the existing nav
                  const buttons = Array.from(child.querySelectorAll(".ml-tab-btn"));
                  buttons.forEach(btn => tabNav.appendChild(btn));
                }
              } else if (/\bml-tab-panels\b/.test(cls)) {
                // This is the panel container
                if (!tabPanels) {
                  tabPanels = child;
                  tabsEl.appendChild(child);
                } else {
                  // Merge panels from this container into the existing one
                  const panels = Array.from(child.querySelectorAll(".ml-tab-panel"));
                  panels.forEach(p => tabPanels.appendChild(p));
                }
              } else if (/\bml-tab-btn\b/.test(cls)) {
                // Individual button — append to tabNav (create it if needed)
                if (!tabNav) {
                  tabNav = document.createElement("div");
                  tabNav.className = "ml-tab-nav";
                  tabsEl.appendChild(tabNav);
                }
                tabNav.appendChild(child);
              } else if (/\bml-tab-panel\b/.test(cls)) {
                // Individual panel — append to tabPanels (create it if needed)
                if (!tabPanels) {
                  tabPanels = document.createElement("div");
                  tabPanels.className = "ml-tab-panels";
                  tabsEl.appendChild(tabPanels);
                }
                tabPanels.appendChild(child);
              } else {
                // Non-tab child (e.g. an h3 title, spacer div) — append directly
                // into the .ml-tabs container itself (before tabPanels)
                tabsEl.insertBefore(child, tabPanels || null);
              }
            }
            toRemove.push(next);
          } else {
            // Unexpected wrapper content (e.g. a new .ml-tabs) — stop walking
            break;
          }

          next = next.nextElementSibling;
        }

        // Remove wrappers that were emptied by the merge
        for (const w of toRemove) w.remove();
      }

      // Final cleanup: remove any remaining empty .br-snippet wrappers
      DOM.pageRender.querySelectorAll(".br-snippet").forEach(w => {
        if (!w.firstElementChild) w.remove();
      });
    },

    /**
     * After rendering, scan the rendered content for .ml-tabs containers
     * and populate tab sub-items under the active sidebar page. This
     * lets the copy editor click individual tabs (Treatments, Goals, etc.)
     * directly from the sidebar to switch panels in the preview.
     */
    _refreshSidebarTabSubItems() {
      // Remove any previously injected sub-items
      DOM.sidebarNav.querySelectorAll(".sb-sub-item").forEach(el => el.remove());

      // Find the active sidebar page item
      const activeItem = DOM.sidebarNav.querySelector(".sb-item--active");
      if (!activeItem) return;

      // Find all .ml-tabs groups in the rendered preview
      const allTabGroups = DOM.pageRender.querySelectorAll(".ml-tabs");
      if (allTabGroups.length === 0) return;

      // Collect all tab button labels from all .ml-tab-nav containers
      const allButtons = DOM.pageRender.querySelectorAll(".ml-tab-nav .ml-tab-btn");
      if (allButtons.length === 0) return;

      // Build sub-items
      const subContainer = document.createElement("div");
      subContainer.className = "sb-sub-items";

      allButtons.forEach(btn => {
        const label = btn.textContent.trim();
        if (!label) return;

        const subItem = document.createElement("button");
        subItem.className = "sb-sub-item";
        subItem.textContent = label;
        subItem.dataset.tabLabel = label;

        // Clicking the sub-item activates the corresponding tab button
        subItem.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          // Find the corresponding .ml-tab-btn in the preview and click it
          const allBtns = Array.from(DOM.pageRender.querySelectorAll(".ml-tab-nav .ml-tab-btn"));
          const targetBtn = allBtns.find(b => b.textContent.trim() === label);
          if (targetBtn) {
            targetBtn.scrollIntoView({ block: "center", behavior: "smooth" });

            // Simulate the tab click logic
            const tabsContainer = targetBtn.closest(".ml-tabs");
            if (tabsContainer) {
              const panels = tabsContainer.querySelectorAll(".ml-tab-panel");

              // Deactivate all buttons and panels
              tabsContainer.querySelectorAll(".ml-tab-btn").forEach(b => {
                b.classList.remove("ml-tab-btn--active");
                b.removeAttribute("aria-selected");
              });
              panels.forEach(p => {
                p.classList.remove("ml-tab-panel--active");
                p.setAttribute("hidden", "");
              });

              // Activate clicked button
              targetBtn.classList.add("ml-tab-btn--active");
              targetBtn.setAttribute("aria-selected", "true");

              // Find matching panel
              const targetId = targetBtn.getAttribute("data-ml-tab") || targetBtn.getAttribute("data-tab") || label;
              let matched = null;
              for (const panel of panels) {
                if (panel.getAttribute("data-ml-tab-panel") === targetId ||
                    panel.getAttribute("data-ml-tab") === targetId ||
                    panel.getAttribute("data-tab") === targetId ||
                    (panel.querySelector("h2, h3, h4") || {}).textContent === targetId ||
                    panel.id === targetId) {
                  matched = panel;
                  break;
                }
              }
              if (!matched) {
                const btns = Array.from(tabsContainer.querySelectorAll(".ml-tab-btn"));
                const idx = btns.indexOf(targetBtn);
                if (idx >= 0 && idx < panels.length) matched = panels[idx];
              }
              if (matched) {
                matched.classList.add("ml-tab-panel--active");
                matched.removeAttribute("hidden");
              }
            }

            // Highlight the clicked sub-item
            activeItem.parentElement.querySelectorAll(".sb-sub-item").forEach(s => {
              s.classList.remove("sb-sub-item--active");
            });
            subItem.classList.add("sb-sub-item--active");
          }
        });

        subContainer.appendChild(subItem);
      });

      // Insert after the active sidebar item
      activeItem.insertAdjacentElement("afterend", subContainer);

      // Highlight the first sub-item by default (first tab is active by default)
      const firstSub = subContainer.querySelector(".sb-sub-item");
      if (firstSub) firstSub.classList.add("sb-sub-item--active");
    },

    /**
     * Audit all images in a snippet wrapper — flag broken ones with red border + badge.
     */
    auditImages(wrapper, snippetId, tab) {
      const origin = "https://www.brattonpt.com";
      const staffDomains = ["gravatar.com", "brattonpt.com/wp-content/uploads/staff", "brattonpt.com/wp-content/headshots"];

      const isStaffImage = (url) => {
        return staffDomains.some(d => url.toLowerCase().includes(d.toLowerCase()));
      };

      const checkImage = (img) => {
        const src = img.getAttribute("src") || "";
        // Skip data URIs and local files (cannot be tested via remote fetch)
if (!src || src.startsWith("data:") || src.startsWith("files/") || src.startsWith("/files/") || src.startsWith("/assets/") || src.startsWith("assets/")) return;
        // Normalize: if relative, prepend origin
        const url = src.startsWith("http") ? src : (origin + (src.startsWith("/") ? "" : "/") + src);
        // Test load
        const testImg = new Image();
        testImg.onload = () => {
          // Image loaded — remove any stale badge
          const badge = img.parentNode?.querySelector?.(".br-img-badge");
          if (badge) badge.remove();
          img.style.outline = "";
        };
        testImg.onerror = () => {
          // Mark broken
          img.style.outline = "3px dashed #dc2626";
          img.style.outlineOffset = "2px";
          // Add badge if not already present
          const badgeSelector = `.br-img-badge[data-img-src="${CSS.escape(src)}"]`;
          if (!img.parentNode?.querySelector?.(badgeSelector)) {
            const shortUrl = url.length > 50 ? url.substring(0, 47) + "…" : url;
            const staffLabel = isStaffImage(src) ? " 👤 staff" : "";
            const badge = document.createElement("span");
            badge.className = "br-img-badge";
            badge.dataset.imgSrc = src;
            badge.title = `Broken: ${url}\nClick badge to attempt fixes`;
            badge.innerHTML = `⚠️ broken${staffLabel}`;
            badge.style.cssText =
              "position:absolute;top:2px;right:2px;background:#dc2626;color:#fff;" +
              "font-size:10px;padding:2px 6px;border-radius:4px;z-index:10;cursor:pointer;" +
              "max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
            // Also show a small URL label
            const urlLabel = document.createElement("span");
            urlLabel.className = "br-img-url-label";
            urlLabel.textContent = shortUrl;
            urlLabel.style.cssText =
              "position:absolute;bottom:2px;left:2px;background:rgba(0,0,0,0.7);color:#fff;" +
              "font-size:9px;padding:1px 5px;border-radius:3px;z-index:10;max-width:200px;" +
              "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;pointer-events:none;";
            // Wrap img in relative container if not already
            if (getComputedStyle(img).position === "static") {
              const wrap = document.createElement("span");
              wrap.style.cssText = "position:relative;display:inline-block;vertical-align:top;";
              img.parentNode.insertBefore(wrap, img);
              wrap.appendChild(img);
              wrap.appendChild(badge);
              wrap.appendChild(urlLabel);
            } else {
              img.parentNode.appendChild(badge);
              img.parentNode.appendChild(urlLabel);
            }
            // Click badge to cycle through fallback strategies
            badge.addEventListener("click", (e) => {
              e.stopPropagation();
              const currentSrc = img.src;
              // Strategy 1: Try with brattonpt.com origin
              if (!currentSrc.startsWith(origin)) {
                img.src = origin + (src.startsWith("/") ? "" : "/") + src;
                badge.textContent = "🔄 trying…";
                const retry = new Image();
                retry.onload = () => {
                  badge.remove();
                  urlLabel.remove();
                  img.style.outline = "";
                  this.markDirtyFromSnippet(snippetId, tab);
                };
                retry.onerror = () => {
                  // Strategy 2: Try replacing wp-content URLs with root relative
                  const pathOnly = src.replace(/^https?:\/\/[^/]+/, "");
                  img.src = origin + pathOnly;
                  badge.textContent = "🔄 v2…";
                  const retry2 = new Image();
                  retry2.onload = () => {
                    badge.remove();
                    urlLabel.remove();
                    img.style.outline = "";
                    this.markDirtyFromSnippet(snippetId, tab);
                  };
                  retry2.onerror = () => {
                    img.style.outline = "3px dashed #f59e0b";
                    badge.style.background = "#f59e0b";
                    badge.textContent = "❌ all failed";
                    urlLabel.textContent = `Tried: ${url}`;
                    this.markDirtyFromSnippet(snippetId, tab);
                  };
                  retry2.src = origin + pathOnly;
                };
                retry.src = origin + (src.startsWith("/") ? "" : "/") + src;
              }
            });
          }
        };
        testImg.src = url;
      };

      // Check all <img> elements
      wrapper.querySelectorAll("img").forEach(checkImage);

      // Check <picture> elements
      wrapper.querySelectorAll("picture source").forEach(source => {
        const srcset = source.getAttribute("srcset");
        if (!srcset) return;
        const firstUrl = srcset.split(",")[0].trim().split(/\s+/)[0];
        if (!firstUrl) return;
        const url = firstUrl.startsWith("http") ? firstUrl : (origin + (firstUrl.startsWith("/") ? "" : "/") + firstUrl);
        const testImg = new Image();
        testImg.onerror = () => {
          const picture = source.closest("picture");
          if (picture) {
            picture.style.outline = "3px dashed #dc2626";
            picture.style.outlineOffset = "2px";
          }
        };
        testImg.onload = () => {
          const picture = source.closest("picture");
          if (picture) picture.style.outline = "";
        };
        testImg.src = url;
      });
    },

    markDirtyFromSnippet(snippetId, tab) {
      if (!tab) return;
      const wrapper = DOM.pageRender.querySelector(`.br-snippet[data-snippet-id="${snippetId}"]`);
      if (!wrapper) return;
      const snippet = tab.snippets.find(s => s.id === snippetId);
      if (!snippet) return;
      const newHtml = wrapper.innerHTML;
      if (snippet._originalHtml === undefined) {
        snippet._originalHtml = snippet.originalHtml;
      }
      // Find CSS selector for DOM-based replacement
      let sel = null;
      if (snippet.locations && Array.isArray(snippet.locations)) {
        const loc = snippet.locations.find(l =>
          l.file === tab.file ||
          l.file === tab.file.replace(/^\//, "") ||
          "/" + l.file === tab.file
        );
        if (loc && loc.selector) sel = loc.selector;
      }
      STATE.dirtySnapshots[snippetId] = {
        file: tab.file,
        oldHtml: snippet._originalHtml,
        newHtml: newHtml,
        pageName: tab.pageName,
        snippetId: snippetId,
        selector: sel
      };
      TABS.markDirty(tab.id);
    },

    getCurrentRenderedSnippets() {
      const result = {};
      DOM.pageRender.querySelectorAll(".br-snippet").forEach(wrapper => {
        const id = wrapper.dataset.snippetId;
        result[id] = wrapper.innerHTML;
      });
      return result;
    }
  };

  // ========== FLOATING TEXT TOOLBAR: FT ==========
  const FT = {
    currentTarget: null,

    show(selection) {
      if (!selection || selection.isCollapsed) {
        this.hide();
        return;
      }
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (!rect || (rect.top === 0 && rect.left === 0)) {
        this.hide();
        return;
      }
      const top = rect.top - 50;
      const left = rect.left + rect.width / 2;
      DOM.floatingToolbar.style.top = Math.max(8, top) + "px";
      DOM.floatingToolbar.style.left = left + "px";
      DOM.floatingToolbar.style.display = "flex";
      this.currentTarget = range.commonAncestorContainer;
    },

    hide() {
      DOM.floatingToolbar.style.display = "none";
      this.currentTarget = null;
    },

    exec(cmd, arg) {
      document.execCommand(cmd, false, arg || null);
      // Update active states
      this.updateStates();
    },

    updateStates() {
      DOM.floatingToolbar.querySelectorAll(".ft-btn[data-cmd]").forEach(btn => {
        const cmd = btn.dataset.cmd;
        if (cmd === "bold" || cmd === "italic" || cmd === "underline" || cmd === "strikeThrough") {
          btn.classList.toggle("active", document.queryCommandState(cmd));
        }
      });
    },

    handleLink() {
      const url = prompt("Enter URL:", "https://");
      if (url) {
        document.execCommand("createLink", false, url);
      }
    }
  };

  // ========== EDIT LOG: LOG ==========
  const LOG = {
    /**
     * Append an edit record to localStorage log and return the record.
     * Each record: { id, timestamp, file, pageName, snippetId, oldHtml, newHtml, tabId }
     */
    append(snap, tabId) {
      const record = {
        id: "el_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
        timestamp: new Date().toISOString(),
        file: snap.file,
        pageName: snap.pageName || snap.file,
        snippetId: snap.snippetId,
        oldHtml: snap.oldHtml || "",
        newHtml: snap.newHtml || "",
        tabId: tabId
      };
      const log = this.load();
      log.push(record);
      this.save(log);
      return record;
    },

    load() {
      try {
        return JSON.parse(localStorage.getItem("br-edits-log") || "[]");
      } catch (e) { return []; }
    },

    save(log) {
      // Keep only last 500 entries
      if (log.length > 500) log = log.slice(-500);
      try {
        localStorage.setItem("br-edits-log", JSON.stringify(log));
      } catch (e) {
        toast("Edit log storage full. Clearing old entries...", "warning");
        log = log.slice(-100);
        localStorage.setItem("br-edits-log", JSON.stringify(log));
      }
    },

    /**
     * Get all log entries for a specific file.
     */
    getForFile(file) {
      return this.load().filter(r => r.file === file);
    },

    /**
     * Get all log entries for the current tab.
     */
    getForActiveTab() {
      if (!STATE.activeTabId) return [];
      return this.load().filter(r => r.tabId === STATE.activeTabId);
    },

    /**
     * Clear log entries for a specific file.
     */
    clearForFile(file) {
      const log = this.load().filter(r => r.file !== file);
      this.save(log);
    }
  };

  // ========== LIFETIME STATS: STATS ==========
  const STATS = {
    STORAGE_KEY: "br-editor-stats",
    /** { uniqueFilesEdited: number, totalSubmissions: number, editedFileSet: string[] } */
    data: null,

    load() {
      try {
        this.data = JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || {
          uniqueFilesEdited: 0,
          totalSubmissions: 0,
          editedFileSet: []
        };
      } catch (e) {
        this.data = { uniqueFilesEdited: 0, totalSubmissions: 0, editedFileSet: [] };
      }
    },

    save() {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
      } catch (e) {
        toast("Stats storage full — counts preserved in memory only.", "warning");
      }
    },

    /**
     * Record a successful submission.
     * @param {string[]} files — array of file paths that were just submitted
     */
    recordSubmission(files) {
      if (!this.data) this.load();
      let newFiles = 0;
      files.forEach(f => {
        if (!this.data.editedFileSet.includes(f)) {
          this.data.editedFileSet.push(f);
          newFiles++;
        }
      });
      this.data.uniqueFilesEdited += newFiles;
      this.data.totalSubmissions += 1;
      this.save();
      this.render();
    },

    render() {
      if (!this.data) this.load();
      if (DOM.statsDisplay) {
        DOM.statsDisplay.innerHTML =
          `<span title="Unique pages ever submitted">📄 ${this.data.uniqueFilesEdited}</span>` +
          `<span class="stats-sep">|</span>` +
          `<span title="Total submissions">📨 ${this.data.totalSubmissions}</span>`;
      }
    },

    /** Check if a page has ever been submitted (i.e., is "finished") */
    isPageFinished(file) {
      if (!this.data) this.load();
      return this.data.editedFileSet.includes(file);
    },

    /** Check if EVERY page in a category has been submitted */
    areAllCategoryFinished(category) {
      if (!this.data) this.load();
      const pages = STATE.pagesByCategory[category];
      if (!pages || pages.length === 0) return false;
      return pages.every(p => this.data.editedFileSet.includes(p.file));
    }
  };

  // ========== IMAGE EDITOR: IMG ==========
  const IMG = {
    currentImg: null,
    currentWrapper: null,

    show(img, wrapper) {
      this.currentImg = img;
      this.currentWrapper = wrapper;
      const rect = img.getBoundingClientRect();
      DOM.imageOverlay.style.top = (rect.top - 48) + "px";
      DOM.imageOverlay.style.left = (rect.left + rect.width / 2) + "px";
      DOM.imageOverlay.style.transform = "translateX(-50%)";
      DOM.imageOverlay.style.display = "block";
    },

    hide() {
      DOM.imageOverlay.style.display = "none";
      this.currentImg = null;
      this.currentWrapper = null;
    },

    replace() {
      DOM.hiddenFileInput.click();
      DOM.hiddenFileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (this.currentImg) {
            this.currentImg.src = ev.target.result;
            this.markDirty();
          }
          this.hide();
        };
        reader.readAsDataURL(file);
      };
    },

    remove() {
      if (this.currentImg) {
        this.currentImg.remove();
        this.markDirty();
      }
      this.hide();
    },

    addBefore() {
      this.showImageModal((url) => {
        const newImg = document.createElement("img");
        newImg.src = url;
        newImg.style.maxWidth = "100%";
        newImg.style.height = "auto";
        newImg.setAttribute("contenteditable", "false");
        newImg.style.cursor = "pointer";
        newImg.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          IMG.show(newImg, this.currentWrapper);
        });
        if (this.currentImg) {
          this.currentImg.parentNode.insertBefore(newImg, this.currentImg);
        } else if (this.currentWrapper) {
          this.currentWrapper.appendChild(newImg);
        }
        this.markDirty();
      });
    },

    addAfter() {
      this.showImageModal((url) => {
        const newImg = document.createElement("img");
        newImg.src = url;
        newImg.style.maxWidth = "100%";
        newImg.style.height = "auto";
        newImg.setAttribute("contenteditable", "false");
        newImg.style.cursor = "pointer";
        newImg.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          IMG.show(newImg, this.currentWrapper);
        });
        if (this.currentImg) {
          this.currentImg.parentNode.insertBefore(newImg, this.currentImg.nextSibling);
        } else if (this.currentWrapper) {
          this.currentWrapper.appendChild(newImg);
        }
        this.markDirty();
      });
    },

    showImageModal(callback) {
      DOM.imageUrlModal.style.display = "flex";
      DOM.imageUrlInput.value = "";
      DOM.imageUrlInput.focus();
      this._imageCallback = callback;
    },

    markDirty() {
      if (this.currentWrapper) {
        const snippetId = this.currentWrapper.dataset.snippetId;
        if (snippetId && STATE.activeTabId) {
          const tab = STATE.tabs.find(t => t.id === STATE.activeTabId);
          if (tab) {
            const snippet = tab.snippets.find(s => s.id === snippetId);
            if (snippet) {
              const newHtml = this.currentWrapper.innerHTML;
              if (snippet._originalHtml === undefined) {
                snippet._originalHtml = snippet.originalHtml;
              }
              // Find CSS selector for DOM-based replacement
              let sel = null;
              if (snippet.locations && Array.isArray(snippet.locations)) {
                const loc = snippet.locations.find(l =>
                  l.file === tab.file ||
                  l.file === tab.file.replace(/^\//, "") ||
                  "/" + l.file === tab.file
                );
                if (loc && loc.selector) sel = loc.selector;
              }
              STATE.dirtySnapshots[snippetId] = {
                file: tab.file,
                oldHtml: snippet._originalHtml,
                newHtml: newHtml,
                pageName: tab.pageName,
                snippetId: snippetId,
                selector: sel
              };
              TABS.markDirty(tab.id);
            }
          }
        }
      }
    }
  };

  // ========== RIGHT-CLICK CONTEXT MENU: CMS ==========
  const CMS = {
    currentSnippet: null,

    show(e, snippetId, wrapper) {
      // Only show on contenteditable elements or the snippet wrapper
      const target = e.target;
      if (!target.closest("#page-render")) return;

      // Hide FT if visible
      FT.hide();

      this.currentSnippet = { id: snippetId, wrapper };

      // Position menu at cursor
      const x = e.clientX;
      const y = e.clientY;

      // Keep menu within viewport
      const menuW = 220;
      const menuH = 220; // approximate

      let left = x;
      let top = y;

      if (left + menuW > window.innerWidth) left = window.innerWidth - menuW - 8;
      if (top + menuH > window.innerHeight) top = window.innerHeight - menuH - 8;
      if (left < 8) left = 8;
      if (top < 8) top = 8;

      DOM.ctxMenu.style.left = left + "px";
      DOM.ctxMenu.style.top = top + "px";
      DOM.ctxMenu.style.display = "block";
    },

    hide() {
      DOM.ctxMenu.style.display = "none";
      this.currentSnippet = null;
    },

    execCmd(cmd, arg) {
      if (!this.currentSnippet) return;
      this.hide();

      const sel = window.getSelection();

      switch (cmd) {
        case "createLink":
          const url = prompt("Enter URL:", "https://");
          if (url) document.execCommand("createLink", false, url);
          break;

        case "insertImage":
          IMG.showImageModal((imgUrl) => {
            const newImg = document.createElement("img");
            newImg.src = imgUrl;
            newImg.style.maxWidth = "100%";
            newImg.style.height = "auto";
            newImg.setAttribute("contenteditable", "false");
            newImg.style.cursor = "pointer";
            newImg.addEventListener("click", (e) => {
              e.preventDefault(); e.stopPropagation();
              IMG.show(newImg, this.currentSnippet.wrapper);
            });
            const activeSel = window.getSelection();
            if (activeSel && activeSel.rangeCount > 0 && !activeSel.getRangeAt(0).collapsed) {
              activeSel.getRangeAt(0).insertNode(newImg);
            } else {
              this.currentSnippet.wrapper.appendChild(newImg);
            }
            this.trackDirty();
          });
          return; // trackDirty called in callback

        case "removeFormat":
          if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            const fragment = range.extractContents();
            const textNode = document.createTextNode(fragment.textContent);
            range.insertNode(textNode);
            sel.removeAllRanges();
            const newRange = document.createRange();
            newRange.setStartAfter(textNode);
            newRange.collapse(true);
            sel.addRange(newRange);
          } else {
            document.execCommand("removeFormat", false, null);
          }
          break;

        default:
          // Generic execCommand: bold, italic, underline, strikeThrough,
          // justifyLeft, justifyCenter, justifyRight,
          // insertUnorderedList, insertOrderedList, formatBlock
          document.execCommand(cmd, false, arg || null);
          break;
      }

      // Track dirty after changes
      this.trackDirty();
    },

    trackDirty() {
      if (!this.currentSnippet) return;
      const tab = STATE.tabs.find(t => t.id === STATE.activeTabId);
      if (!tab) return;
      const snippet = tab.snippets.find(s => s.id === this.currentSnippet.id);
      if (!snippet) return;
      const newHtml = this.currentSnippet.wrapper.innerHTML;
      if (snippet._originalHtml === undefined) {
        snippet._originalHtml = snippet.originalHtml;
      }
      // Find the CSS selector for this snippet from its locations (for the current file)
      let selector = null;
      if (snippet.locations && Array.isArray(snippet.locations)) {
        const loc = snippet.locations.find(l =>
          l.file === tab.file ||
          l.file === tab.file.replace(/^\//, "") ||
          "/" + l.file === tab.file
        );
        if (loc && loc.selector) selector = loc.selector;
      }
      STATE.dirtySnapshots[this.currentSnippet.id] = {
        file: tab.file,
        oldHtml: snippet._originalHtml,
        newHtml: newHtml,
        pageName: tab.pageName,
        snippetId: this.currentSnippet.id,
        selector: selector
      };
      TABS.markDirty(tab.id);
    }
  };

  // ========== SUBMIT FLOW: SUBS ==========
  const SUBS = {
    showReview() {
      const dirty = Object.values(STATE.dirtySnapshots);
      if (dirty.length === 0) {
        toast("No changes to submit.", "info");
        return;
      }
      DOM.submitSummary.innerHTML = "";
      dirty.forEach(snap => {
        const item = document.createElement("div");
        item.className = "submit-summary__item";
        item.innerHTML = `
          <div class="submit-summary__label">${escapeHTML(snap.pageName || snap.file)}</div>
          <div class="submit-summary__old">
            <span>OLD</span>
            <div>${escapeHTML(snap.oldHtml || "(empty)")}</div>
          </div>
          <div class="submit-summary__new">
            <span>NEW</span>
            <div>${snap.newHtml}</div>
          </div>
        `;
        DOM.submitSummary.appendChild(item);
      });
      DOM.submitModal.style.display = "flex";
    },

    /**
     * Strip HTML tags for a plain-text preview string.
     */
    stripHtmlPreview(html, maxLen = 200) {
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      const text = (tmp.textContent || tmp.innerText || "").replace(/\s+/g, " ").trim();
      return text.length > maxLen ? text.substring(0, maxLen) + "…" : text;
    },

    async submit() {
      const dirty = Object.values(STATE.dirtySnapshots);
      if (dirty.length === 0) return;

      const webhook = STATE.settings.discordWebhook;
      const token = STATE.settings.githubToken;
      const repo = STATE.settings.githubRepo;

      if (!webhook) {
        toast("Discord webhook URL not set. Go to Settings.", "error");
        return;
      }

      DOM.submitModal.style.display = "none";
      toast("Sending changes to Discord and GitHub...", "info", 5000);

      // Build a FormData payload so we can attach actual .html files
      const formData = new FormData();

      // Build Discord embed with preview snippets
      const fields = dirty.map((snap, idx) => {
        const oldPreview = this.stripHtmlPreview(snap.oldHtml || "");
        const newPreview = this.stripHtmlPreview(snap.newHtml || "");
        const fileName = (snap.pageName || snap.file || "snippet").replace(/[^\w.-]/g, "_");
        return {
          name: `📄 ${snap.pageName || snap.file}`,
          value:
            `**Old** (${oldPreview || "(empty)"})\n` +
            `**New** (${newPreview || "(empty)"})\n` +
            `📎 Files: \`old_${idx}_${fileName}.html\`, \`new_${idx}_${fileName}.html\``,
          inline: false
        };
      });

      const embed = {
        title: "✏️ Copy Editor — Changes Submitted",
        description: `${dirty.length} snippet${dirty.length > 1 ? "s" : ""} edited across ${Object.keys(STATE.dirtyFiles).filter(k => STATE.dirtyFiles[k]).length} page(s).`,
        color: 0x2563eb,
        fields: fields.slice(0, 10), // Discord limit: 10 fields max
        timestamp: new Date().toISOString(),
        footer: { text: "Bratton PT Copy Editor" }
      };

      // Attach the embed JSON as the payload_json field (Discord multipart convention)
      formData.append("payload_json", JSON.stringify({ embeds: [embed] }));

      // Attach a single combined file per snippet (old + new in one file)
      dirty.forEach((snap, idx) => {
        const fileName = (snap.pageName || snap.file || "snippet").replace(/[^\w.-]/g, "_");
        const oldPreview = this.stripHtmlPreview(snap.oldHtml || "").substring(0, 120);
        const newPreview = this.stripHtmlPreview(snap.newHtml || "").substring(0, 120);
        const combined = [
          "=== OLD CONTENT ===",
          snap.oldHtml || "(empty)",
          "",
          "=== NEW CONTENT ===",
          snap.newHtml || "(empty)",
        ].join("\n");
        const blob = new Blob([combined], { type: "text/html" });
        formData.append(`files[${idx}]`, blob, `${fileName}.html`);
      });

      let githubOk = true;
      try {
        // Send to Discord as multipart with file attachments
        const discordRes = await fetch(webhook, {
          method: "POST",
          body: formData
        });
        if (!discordRes.ok) {
          const errText = await discordRes.text();
          throw new Error(`Discord webhook failed: ${discordRes.status} ${errText}`);
        }
        toast("✓ Sent to Discord with file attachments!", "success");

        // Save via GitHub API
        if (token) {
          await SUBS.saveToGitHub(dirty, token, repo);
        } else {
          toast("No GitHub token set — changes were NOT saved to GitHub.", "warning");
          githubOk = false;
        }

        // Only clear dirty state if GitHub save succeeded (or was skipped without error)
        if (githubOk) {
          // Record the submission for lifetime stats (capture files BEFORE clearing)
          const submittedFiles = Object.keys(STATE.dirtyFiles).filter(k => STATE.dirtyFiles[k]);
          STATS.recordSubmission(submittedFiles);

          // Clear dirty state
          STATE.dirtyFiles = {};
          STATE.dirtySnapshots = {};
          STATE.tabs.forEach(tab => {
            tab.isDirty = false;
            SB.markDirty(tab.file, false);
            // Update originalHtml for each snippet
            if (tab.snippets) {
              tab.snippets.forEach(s => {
                s._originalHtml = undefined;
                const wrapper = DOM.pageRender.querySelector(`.br-snippet[data-snippet-id="${s.id}"]`);
                if (wrapper) {
                  s.originalHtml = wrapper.innerHTML;
                }
              });
            }
          });
          // Update sidebar green dots — submitted pages are now "finished"
          SB.refreshStatus();

          TABS.renderTabBar();
          TABS.updateSubmitButton();
          DOM.pageStatus.className = "page-status page-status--sent";
        }

      } catch (e) {
        console.error("Submit error:", e);
        toast("Submit failed — your changes are preserved. " + e.message, "error", 8000);
      }
    },

    async saveToGitHub(dirty, token, repo) {
      // Group changes by file
      const filesMap = {};
      dirty.forEach(snap => {
        if (!filesMap[snap.file]) filesMap[snap.file] = [];
        filesMap[snap.file].push(snap);
      });

      for (const [rawFile, snaps] of Object.entries(filesMap)) {
        try {
          // Save edited files into Bratton-Copy-Rework/JenaEditedPages/ on the MAIN branch.
          // IMPORTANT: do NOT point this at gh-pages directly — deploy.yml force-replaces
          // the entire gh-pages branch from Bratton-Copy-Rework/* on every push to main
          // (keep_files defaults to false), so anything written straight to gh-pages is
          // deleted the next time anyone pushes to main. Writing here instead means the
          // edit rides along naturally with the next deploy.
          const file = `Bratton-Copy-Rework/JenaEditedPages/${rawFile}`;
          const branchRef = "?ref=main";
          // Get current Jena-edited file from GitHub (from main branch)
          const apiUrl = `https://api.github.com/repos/${repo}/contents/${file}${branchRef}`;
          let sha = null;
          let fileContent = "";
          try {
            const getRes = await fetch(apiUrl, {
              headers: {
                Authorization: `token ${token}`,
                Accept: "application/vnd.github.v3+json"
              }
            });
            if (getRes.ok) {
              const data = await getRes.json();
              sha = data.sha;
              // UTF-8 safe base64 decode
              const binaryStr = atob(data.content.replace(/\n/g, ""));
              const bytes = new Uint8Array(binaryStr.length);
              for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
              fileContent = new TextDecoder("utf-8").decode(bytes);
              console.log(`[saveToGitHub] Fetched existing JenaEdited file: ${file}, sha=${sha.substring(0,8)}...`);
            } else {
              console.log(`[saveToGitHub] No existing JenaEdited file for ${file} (${getRes.status}), will create new`);
            }
          } catch (e) { /* file may not exist yet */ }

          // If Jena-edited version doesn't exist yet, fetch the original page as starting content
          if (!fileContent) {
            // For index.html, the live GitHub Pages URL IS the editor itself — so we fetch
            // the actual homepage source from _vercel_homepage.html in the repo instead.
            let liveUrl;
            if (rawFile === "index.html" || rawFile === "/" || rawFile === "./") {
              // Use authenticated GitHub API to fetch _vercel_homepage.html (raw.githubusercontent.com can 404 on _-prefixed files)
              const vercelApiUrl = `https://api.github.com/repos/${repo}/contents/Bratton-Copy-Rework/_vercel_homepage.html?ref=main`;
              console.log(`[saveToGitHub] index.html: fetching _vercel_homepage.html via API: ${vercelApiUrl}`);
              try {
                const vercelRes = await fetch(vercelApiUrl, {
                  headers: {
                    Authorization: `token ${token}`,
                    Accept: "application/vnd.github.v3+json"
                  }
                });
                if (vercelRes.ok) {
                  const vercelData = await vercelRes.json();
                  const binaryStr = atob(vercelData.content.replace(/\n/g, ""));
                  const bytes = new Uint8Array(binaryStr.length);
                  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
                  fileContent = new TextDecoder("utf-8").decode(bytes);
                  console.log(`[saveToGitHub] Fetched _vercel_homepage.html via API (${fileContent.length} bytes)`);
                } else {
                  console.error(`[saveToGitHub] _vercel_homepage.html API returned ${vercelRes.status}`);
                }
              } catch (e) {
                console.error(`[saveToGitHub] Failed to fetch _vercel_homepage.html via API:`, e);
              }
            } else {
              liveUrl = `https://nawnawnawnawnaw55-jpg.github.io/Bratton-Copy-Rework/${rawFile}`;
              try {
                const origRes = await fetch(liveUrl, { cache: "no-store" });
                if (origRes.ok) {
                  fileContent = await origRes.text();
                  console.log(`[saveToGitHub] Fetched original page from: ${liveUrl} (${fileContent.length} bytes)`);
                } else {
                  console.error(`[saveToGitHub] URL returned ${origRes.status} for ${liveUrl}`);
                }
              } catch (e) {
                console.error(`[saveToGitHub] Failed to fetch original page from ${liveUrl}:`, e);
              }
            }
          }

          // GUARD: Don't push empty content — that erases the JenaEdited file silently
          if (!fileContent || fileContent.trim().length === 0) {
            console.error(`[saveToGitHub] CRITICAL: fileContent is empty for ${rawFile} — aborting push to prevent data loss`);
            toast(`⚠ Could not load base content for ${rawFile} — edit NOT saved to GitHub. Check browser console.`, "error", 6000);
            throw new Error(`Empty base content for ${rawFile} — source fetch may have failed`);
          }

          // Strip editor-only attributes from saved HTML (contenteditable, data-placeholder)
          const cleanContentEditable = (html) => {
            return html
              .replace(/\s*contenteditable="[^"]*"/gi, "")
              .replace(/\s*data-placeholder="[^"]*"/gi, "");
          };

          // Apply edits using the shared helper
          const applyEdits = (html) => {
            let modified = html;
            snaps.forEach(snap => {
              if (!snap.newHtml && snap.newHtml !== "") return;
              // Clean both old and new HTML to remove editor-only attributes (contenteditable, data-placeholder)
              // This ensures the text-based fallback can find oldHtml in the base file (which never has those attrs)
              snap.newHtml = cleanContentEditable(snap.newHtml);
              const cleanOldHtml = snap.oldHtml ? cleanContentEditable(snap.oldHtml) : null;
              console.log(`[applyEdits] Processing snippet ${snap.snippetId}, selector: ${snap.selector}, oldHtml length: ${cleanOldHtml ? cleanOldHtml.length : 0}, newHtml length: ${snap.newHtml.length}`);

              // DOM-based replacement via CSS selector (preferred — whitespace tolerant)
              if (snap.selector) {
                try {
                  const parser = new DOMParser();
                  const doc = parser.parseFromString(modified, "text/html");
                  const el = doc.querySelector(snap.selector);
                  if (el) {
                    // Capture old outerHTML for text replacement
                    const oldOuterHTML = el.outerHTML;
                    el.innerHTML = snap.newHtml;
                    const newOuterHTML = el.outerHTML;
                    // Replace only this element's outerHTML in the original string to avoid full re-serialization
                    const elIdx = modified.indexOf(oldOuterHTML);
                    if (elIdx !== -1) {
                      modified = modified.substring(0, elIdx) + newOuterHTML + modified.substring(elIdx + oldOuterHTML.length);
                      console.log(`[applyEdits] ✓ DOM replace succeeded for selector "${snap.selector}" via outerHTML swap`);
                    } else {
                      // Fallback: use full document re-serialization (may mangle formatting)
                      console.warn(`[applyEdits] outerHTML indexOf failed for selector "${snap.selector}", falling back to doc.documentElement.outerHTML`);
                      modified = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
                    }
                    return; // success — skip text fallback
                  } else {
                    console.warn(`[applyEdits] DOM selector "${snap.selector}" not found in parsed HTML`);
                  }
                } catch (domErr) {
                  console.warn("[applyEdits] DOM replace failed for selector", snap.selector, domErr);
                }
              }
              // Text-based fallback using CLEANED oldHtml
              if (cleanOldHtml) {
                const idx = modified.indexOf(cleanOldHtml);
                if (idx !== -1) {
                  modified = modified.substring(0, idx) + snap.newHtml + modified.substring(idx + cleanOldHtml.length);
                  console.log(`[applyEdits] ✓ Text replace succeeded for snippet ${snap.snippetId} at index ${idx}`);
                } else {
                  console.warn("[applyEdits] Text replace FAILED: could not find cleaned oldHtml in file. Snippet id:", snap.snippetId, "File:", snap.file);
                  // Debug: log first 120 chars of what we're searching for
                  console.warn("[applyEdits] Searched for (first 200 chars):", cleanOldHtml.substring(0, 200));
                }
              }
            });
            return modified;
          };

          fileContent = applyEdits(fileContent);

          // Push to GitHub with conflict-retry loop
          const MAX_RETRIES = 3;
          let saved = false;
          for (let attempt = 0; attempt < MAX_RETRIES && !saved; attempt++) {
            // Safer base64 encoding that handles all UTF-8 characters
            const utf8Bytes = new TextEncoder().encode(fileContent);
            let binaryStr = '';
            for (let i = 0; i < utf8Bytes.length; i++) {
              binaryStr += String.fromCharCode(utf8Bytes[i]);
            }
            const base64Content = btoa(binaryStr);
            const putPayload = {
              message: `Copy Editor: Updated ${file} (${snaps.length} snippet${snaps.length > 1 ? "s" : ""})`,
              content: base64Content,
              branch: "main"
            };
            if (sha) putPayload.sha = sha;

            const putUrl = `https://api.github.com/repos/${repo}/contents/${file}`;
            console.log(`[saveToGitHub] PUT ${putUrl} (branch: ${putPayload.branch}, sha: ${sha ? sha.substring(0,8)+'...' : 'none'})`);
            const putRes = await fetch(putUrl, {
              method: "PUT",
              headers: {
                Authorization: `token ${token}`,
                "Content-Type": "application/json",
                Accept: "application/vnd.github.v3+json"
              },
              body: JSON.stringify(putPayload)
            });

            if (putRes.ok) {
              const putData = await putRes.json().catch(() => ({}));
              console.log(`[saveToGitHub] ✓ Successfully saved ${file} to ${putPayload.branch} branch (commit: ${putData.commit?.sha?.substring(0,8) || 'unknown'})`);
              toast(`✓ Saved ${file} to the editor (use "Publish to Live Site" to push it live)`, "success");
              saved = true;
            } else {
              const errData = await putRes.json().catch(() => ({}));
              const errMsg = errData.message || "";
              if ((putRes.status === 409 || putRes.status === 422) && errMsg.includes("does not match") && attempt < MAX_RETRIES - 1) {
                console.warn(`SHA mismatch for ${file}, retrying (attempt ${attempt + 1})...`);
                try {
                  const refetchRes = await fetch(apiUrl, {
                    headers: {
                      Authorization: `token ${token}`,
                      Accept: "application/vnd.github.v3+json"
                    }
                  });
                  if (refetchRes.ok) {
                    const refetchData = await refetchRes.json();
                    sha = refetchData.sha;
                    const refetchBinary = atob(refetchData.content.replace(/\n/g, ""));
                    const refetchBytes = new Uint8Array(refetchBinary.length);
                    for (let i = 0; i < refetchBinary.length; i++) refetchBytes[i] = refetchBinary.charCodeAt(i);
                    fileContent = new TextDecoder("utf-8").decode(refetchBytes);
                    fileContent = applyEdits(fileContent);
                    continue;
                  }
                } catch (refetchErr) {
                  console.error("Re-fetch failed:", refetchErr);
                }
              }
              console.error(`[saveToGitHub] PUT failed (status ${putRes.status}): ${errMsg || putRes.status}`);
              throw new Error(`GitHub save failed for ${file}: ${errMsg || putRes.status}`);
            }
          }

          if (!saved) {
            throw new Error(`GitHub save failed for ${file} after ${MAX_RETRIES} attempts`);
          }
        } catch (e) {
          console.error(`[saveToGitHub] Error for ${rawFile}:`, e);
          toast(`⚠ ${e.message}`, "warning", 5000);
          throw e; // re-throw so submit() knows GitHub save failed
        }
      }
  };

  // ========== EVENT BINDINGS ==========

  // Sidebar toggle
  DOM.sidebarToggle.addEventListener("click", () => {
    STATE.sidebarCollapsed = !STATE.sidebarCollapsed;
    DOM.sidebar.classList.toggle("sidebar--collapsed", STATE.sidebarCollapsed);
  });

  // Sidebar search
  DOM.sidebarSearch.addEventListener("input", () => {
    SB.search(DOM.sidebarSearch.value);
  });

  // Settings
  DOM.btnSettings.addEventListener("click", () => {
    DOM.settingsDiscordInput.value = STATE.settings.discordWebhook;
    DOM.settingsGithubInput.value = STATE.settings.githubToken;
    DOM.settingsRepoInput.value = STATE.settings.githubRepo;
    DOM.settingsModal.style.display = "flex";
  });

  document.getElementById("btn-settings-close").addEventListener("click", () => {
    DOM.settingsModal.style.display = "none";
  });

  document.getElementById("btn-settings-discord-save").addEventListener("click", () => {
    STATE.settings.discordWebhook = DOM.settingsDiscordInput.value.trim();
    saveSettings();
    toast("Discord webhook saved.", "success");
  });

  document.getElementById("btn-settings-github-save").addEventListener("click", () => {
    STATE.settings.githubToken = DOM.settingsGithubInput.value.trim();
    saveSettings();
    toast("GitHub token saved.", "success");
  });

  document.getElementById("btn-settings-repo-save").addEventListener("click", () => {
    STATE.settings.githubRepo = DOM.settingsRepoInput.value.trim();
    saveSettings();
    toast("Repository saved.", "success");
  });

  // Jena toggle button
  DOM.btnJenaToggle.addEventListener("click", () => {
    REN._toggleJenaEdits();
  });

  // Submit button
  DOM.btnSubmit.addEventListener("click", () => {
    SUBS.showReview();
  });

  document.getElementById("btn-submit-cancel").addEventListener("click", () => {
    DOM.submitModal.style.display = "none";
  });

  document.getElementById("btn-submit-confirm").addEventListener("click", () => {
    SUBS.submit();
  });

  // Close modals on overlay click
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.style.display = "none";
      }
    });
  });

  // Floating toolbar buttons
  DOM.floatingToolbar.querySelectorAll(".ft-btn[data-cmd]").forEach(btn => {
    btn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const cmd = btn.dataset.cmd;
      if (cmd === "createLink") {
        FT.handleLink();
      } else {
        FT.exec(cmd, btn.dataset.arg || null);
      }
    });
  });

  // Text selection → show floating toolbar
  document.addEventListener("selectionchange", () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      FT.hide();
      return;
    }
    const range = selection.getRangeAt(0);
    const parent = range.commonAncestorContainer;
    // Only show if inside page-render
    if (parent && DOM.pageRender.contains(parent.nodeType === 1 ? parent : parent.parentElement)) {
      FT.show(selection);
    } else {
      FT.hide();
    }
  });

  // Click outside selection → hide floating toolbar
  document.addEventListener("mousedown", (e) => {
    if (!DOM.floatingToolbar.contains(e.target) && !DOM.pageRender.contains(e.target)) {
      FT.hide();
    }
  });

  // Image overlay buttons
  document.getElementById("img-btn-replace").addEventListener("click", () => IMG.replace());
  document.getElementById("img-btn-remove").addEventListener("click", () => IMG.remove());
  document.getElementById("img-btn-add-before").addEventListener("click", () => IMG.addBefore());
  document.getElementById("img-btn-add-after").addEventListener("click", () => IMG.addAfter());
  document.getElementById("img-btn-close").addEventListener("click", () => IMG.hide());

  // Click outside image → hide image overlay
  document.addEventListener("click", (e) => {
    if (DOM.imageOverlay.style.display === "block" &&
        !DOM.imageOverlay.contains(e.target) &&
        e.target.tagName !== "IMG") {
      IMG.hide();
    }
  });

  // Image URL modal
  document.getElementById("btn-image-insert").addEventListener("click", () => {
    const url = DOM.imageUrlInput.value.trim();
    if (url && IMG._imageCallback) {
      IMG._imageCallback(url);
    }
    DOM.imageUrlModal.style.display = "none";
    IMG._imageCallback = null;
  });

  document.getElementById("btn-image-cancel").addEventListener("click", () => {
    DOM.imageUrlModal.style.display = "none";
    IMG._imageCallback = null;
  });

  // Image file drop
  DOM.imageFileDrop.addEventListener("click", () => {
    DOM.imageFileInput.click();
  });
  DOM.imageFileDrop.addEventListener("dragover", (e) => {
    e.preventDefault();
    DOM.imageFileDrop.style.borderColor = "var(--c-accent)";
  });
  DOM.imageFileDrop.addEventListener("dragleave", () => {
    DOM.imageFileDrop.style.borderColor = "";
  });
  DOM.imageFileDrop.addEventListener("drop", (e) => {
    e.preventDefault();
    DOM.imageFileDrop.style.borderColor = "";
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        DOM.imageUrlInput.value = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  });
  DOM.imageFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        DOM.imageUrlInput.value = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  // Tab rename modal
  document.getElementById("btn-tab-rename-save").addEventListener("click", () => {
    const newName = DOM.tabRenameInput.value.trim();
    const id = DOM.tabRenameModal._renameTarget;
    if (newName && id) {
      const tab = STATE.tabs.find(t => t.id === id);
      if (tab) {
        tab.label = newName;
        if (STATE.activeTabId === id) {
          DOM.currentPageLabel.textContent = newName;
        }
        TABS.renderTabBar();
      }
    }
    DOM.tabRenameModal.style.display = "none";
    DOM.tabRenameModal._renameTarget = null;
  });

  document.getElementById("btn-tab-rename-cancel").addEventListener("click", () => {
    DOM.tabRenameModal.style.display = "none";
    DOM.tabRenameModal._renameTarget = null;
  });

  // +Tab button
  document.getElementById("btn-tab-add").addEventListener("click", () => {
    // Open a new empty tab — just show the sidebar prompt
    DOM.pageRender.style.display = "none";
    DOM.pageEmpty.style.display = "flex";
    DOM.pageEmpty.querySelector("p").textContent = "Select a page from the sidebar to open a new tab.";
    toast("Select a page from the sidebar.", "info");
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    // Ctrl+S → submit
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      if (!DOM.btnSubmit.disabled) {
        SUBS.showReview();
      }
    }
    // Escape → close modals
    if (e.key === "Escape") {
      DOM.imageOverlay.style.display = "none";
      DOM.imageUrlModal.style.display = "none";
      DOM.submitModal.style.display = "none";
      DOM.settingsModal.style.display = "none";
      DOM.tabRenameModal.style.display = "none";
      FT.hide();
      IMG.hide();
    }
  });

  // Close modals by clicking overlay background
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-overlay")) {
      e.target.style.display = "none";
    }
  });

  // ========== CONTEXT MENU EVENTS ==========
  // Right-click on page-render to show context menu
  DOM.pageRender.addEventListener("contextmenu", (e) => {
    const wrapper = e.target.closest(".br-snippet");
    if (!wrapper) {
      CMS.hide();
      return;
    }
    e.preventDefault();
    const snippetId = wrapper.dataset.snippetId;
    CMS.show(e, snippetId, wrapper);
  });

  // Click anywhere else → hide context menu
  document.addEventListener("click", (e) => {
    if (!DOM.ctxMenu.contains(e.target)) {
      CMS.hide();
    }
  });

  // Context menu button actions — for all ctx-item buttons with data-cmd
  DOM.ctxMenu.addEventListener("click", (e) => {
    const item = e.target.closest(".ctx-item[data-cmd]");
    if (!item) return;
    e.preventDefault();
    const cmd = item.dataset.cmd;
    const arg = item.dataset.arg || null;
    CMS.execCmd(cmd, arg);
  });

  // Medical Library tab click delegation — activates clicked tab via data-tab attr match
  DOM.pageRender.addEventListener("click", (e) => {
    const btn = e.target.closest(".ml-tab-btn");
    if (!btn) return;

    e.preventDefault();
    const tabsContainer = btn.closest(".ml-tabs");
    if (!tabsContainer) return;

    // Determine the target panel — prefer data-ml-tab, fall back to index
    const targetId = btn.getAttribute("data-ml-tab") || btn.getAttribute("data-tab") || btn.textContent.trim();
    const panels = tabsContainer.querySelectorAll(".ml-tab-panel");

    // Deactivate all buttons and panels within this .ml-tabs group
    tabsContainer.querySelectorAll(".ml-tab-btn").forEach(b => {
      b.classList.remove("ml-tab-btn--active");
      b.removeAttribute("aria-selected");
    });
    panels.forEach(p => {
      p.classList.remove("ml-tab-panel--active");
      p.setAttribute("hidden", "");
    });

    // Activate clicked button
    btn.classList.add("ml-tab-btn--active");
    btn.setAttribute("aria-selected", "true");

    // Find matching panel — try data-ml-tab-panel first (v3 WordPress markup), then data-ml-tab, data-tab, text content, then id
    let matched = null;
    for (const panel of panels) {
      if (panel.getAttribute("data-ml-tab-panel") === targetId ||
          panel.getAttribute("data-ml-tab") === targetId ||
          panel.getAttribute("data-tab") === targetId ||
          (panel.querySelector("h2, h3, h4") || {}).textContent === targetId ||
          panel.id === targetId) {
        matched = panel;
        break;
      }
    }
    // Fallback: use index of button
    if (!matched) {
      const btns = Array.from(tabsContainer.querySelectorAll(".ml-tab-btn"));
      const idx = btns.indexOf(btn);
      if (idx >= 0 && idx < panels.length) matched = panels[idx];
    }

    if (matched) {
      matched.classList.add("ml-tab-panel--active");
      matched.removeAttribute("hidden");
    }
  });

  // ========== INIT ==========
  async function init() {
    try {
      loadSettings();
      STATS.load();
      STATS.render();
      DOM.pageLoading.style.display = "flex";
      DOM.pageEmpty.style.display = "none";
      DOM.pageRender.style.display = "none";

      await DB.loadPageIndex();
      SB.render();

      DOM.pageLoading.style.display = "none";
      DOM.pageEmpty.style.display = "flex";
      DOM.pageRender.style.display = "none";
      DOM.currentPageLabel.textContent = `${STATE.pageIndex.length} pages loaded`;
      toast(`${STATE.pageIndex.length} pages loaded. Select a page to start editing.`, "info", 4000);
    } catch (e) {
      console.error("Init error:", e);
      DOM.pageLoading.style.display = "none";
      DOM.pageEmpty.style.display = "flex";
      DOM.pageEmpty.querySelector("p").textContent = "Failed to load pages. Check that _page-index.json exists.";
      toast("Failed to load page index: " + e.message, "error", 6000);
    }
  }

  init();

  // ================================================================
  // PROGRAMMATIC API (exposed for testing)
  // ================================================================
  window.BR = {
    /**
     * Open a page file in the editor and wait for it to finish rendering.
     * @param {string} file - e.g. "labral-tear/index.html"
     * @returns {Promise<void>}
     */
    loadPage: function (file) {
      return new Promise(function (resolve, reject) {
        try {
          TABS.openTab(file);

          // Poll until the page render is visible and loading spinner is hidden
          var attempts = 0;
          var maxAttempts = 200; // 20 seconds max
          var check = setInterval(function () {
            attempts++;
            var render = document.getElementById("page-render");
            var loading = document.getElementById("page-loading");
            var empty = document.getElementById("page-empty");

            var renderVisible = render && render.style.display !== "none";
            var loadingHidden = !loading || loading.style.display === "none";
            var emptyHidden = !empty || empty.style.display === "none";

            if (renderVisible && loadingHidden && emptyHidden) {
              clearInterval(check);
              resolve();
            } else if (attempts >= maxAttempts) {
              clearInterval(check);
              // If render is visible but empty is also showing (no snippets), still resolve
              if (renderVisible) {
                resolve();
              } else {
                reject(new Error("Timed out waiting for page to render: " + file));
              }
            }
          }, 100);
        } catch (e) {
          reject(e);
        }
      });
    }
  };

})();
