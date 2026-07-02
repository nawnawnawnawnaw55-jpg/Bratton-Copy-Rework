/* eslint-disable */
// @ts-check
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8765;
const ROOT = __dirname;

// ─── Simple static file server ────────────────────────
function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(ROOT, (req.url || '/') === '/' ? '/index.html' : (req.url || '/').split('?')[0]);
      const ext = path.extname(filePath);
      const mimeMap = {};
      mimeMap['.html'] = 'text/html';
      mimeMap['.css'] = 'text/css';
      mimeMap['.js'] = 'application/javascript';
      mimeMap['.json'] = 'application/json';
      mimeMap['.png'] = 'image/png';
      mimeMap['.jpg'] = 'image/jpeg';
      mimeMap['.svg'] = 'image/svg+xml';
      mimeMap['.ico'] = 'image/x-icon';
      mimeMap['.woff2'] = 'font/woff2';
      const mime = mimeMap[ext] || 'application/octet-stream';
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not Found'); }
        else { res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' }); res.end(data); }
      });
    });
    server.listen(PORT, () => { console.log(`Server running at http://localhost:${PORT}`); resolve(server); });
  });
}

// ─── Test runner ──────────────────────────────────────
const failures = [];

function fail(step, msg) {
  const err = `❌ [${step}] ${msg}`;
  console.error(err);
  failures.push(err);
}

async function runTests() {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. LOAD PAGE
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle', timeout: 15000 });
    console.log('✅ [load] Page loaded');

    // 2. TOP BAR
    const topBar = await page.$('#top-bar');
    if (!topBar) fail('topbar', 'Top bar not found');

    const logo = await page.$('.logo');
    if (!logo) fail('topbar-logo', 'Logo not found in top bar');

    // Version badge (starts as "v..." before API resolves)
    const versionBadge = await page.$('#version-badge');
    if (!versionBadge) fail('version-badge', 'Version badge not found');
    else {
      const badgeText = await versionBadge.textContent();
      console.log(`✅ [version-badge] Found: "${badgeText}"`);
    }

    // Settings button
    const settingsTrigger = await page.$('button[onclick="openSettings()"]');
    if (!settingsTrigger) fail('settings-btn', 'Settings button not found');
    else console.log('✅ [settings-btn] Settings button found');

    // Sync button
    const syncBtn = await page.$('#sync-btn');
    if (!syncBtn) fail('sync-btn', 'Sync button not found');
    else console.log('✅ [sync-btn] Sync button found');

    // Progress stats
    const statTotal = await page.$('#stat-total');
    const statDone = await page.$('#stat-done');
    const statActive = await page.$('#stat-active');
    if (!statTotal || !statDone || !statActive) fail('stats', 'Progress stats elements not found');
    else console.log('✅ [stats] Progress stats elements present');

    // 3. SIDEBAR
    const sidebar = await page.$('#sidebar');
    if (!sidebar) fail('sidebar', 'Sidebar not found');
    else console.log('✅ [sidebar] Sidebar found');

    // Sidebar search
    const sidebarSearch = await page.$('#sidebar-search');
    if (!sidebarSearch) fail('sidebar-search', 'Sidebar search input not found');
    else console.log('✅ [sidebar-search] Search input found');

    // Section filter
    const sectionFilter = await page.$('#section-filter');
    if (!sectionFilter) fail('section-filter', 'Section filter dropdown not found');
    else console.log('✅ [section-filter] Section filter found');

    // Wait for sidebar pages to populate (data loaded from copy-data.json or embedded)
    await page.waitForFunction(() => {
      const nav = document.getElementById('sidebar-nav');
      return nav && nav.children.length > 0;
    }, { timeout: 15000 });
    const sidebarPages = await page.$$('.sidebar-page');
    console.log(`✅ [sidebar-pages] ${sidebarPages.length} pages in sidebar`);

    if (sidebarPages.length === 0) {
      fail('sidebar-empty', 'No sidebar pages loaded');
    } else {
      // 4. CLICK FIRST SIDEBAR PAGE
      await sidebarPages[0].click();
      await page.waitForTimeout(800);

      // Check editor view is shown (empty state hidden)
      const emptyState = await page.$('#empty-state');
      const emptyDisplay = emptyState ? await emptyState.evaluate(el => window.getComputedStyle(el).display) : 'none';
      const editorView = await page.$('#editor-view');
      const editorDisplay = editorView ? await editorView.evaluate(el => window.getComputedStyle(el).display) : 'none';
      if (editorDisplay === 'none' || emptyDisplay !== 'none') fail('editor-view', 'Editor view not shown after page click');
      else console.log('✅ [editor-view] Editor view visible after page click');

      // Wait for Quill to initialize (visible now that editor view is shown)
      await page.waitForFunction(() => {
        const ql = document.querySelector('.ql-editor');
        return ql && ql.offsetParent !== null;
      }, { timeout: 10000 });
      console.log('✅ [quill] Quill editor initialized and visible');

      // Check editor title
      const editorTitle = await page.$('#editor-title');
      if (editorTitle) console.log(`✅ [editor-title] Title: "${await editorTitle.textContent()}"`);

      // Check snippet meta
      const snippetMeta = await page.$('#snippet-meta');
      if (snippetMeta) console.log(`✅ [snippet-meta] Meta: "${await snippetMeta.textContent()}"`);

      // 5. QUILL TOOLBAR
      await page.waitForSelector('.ql-toolbar', { timeout: 5000 });
      const toolbarVisible = await page.$eval('.ql-toolbar', el => !!el.offsetParent);
      if (!toolbarVisible) fail('quill-toolbar', 'Quill toolbar not visible');
      else console.log('✅ [quill-toolbar] Toolbar visible');

      // Check toolbar buttons
      const boldBtn = await page.$('.ql-bold');
      if (!boldBtn) fail('quill-bold', 'Bold button not found');
      const italicBtn = await page.$('.ql-italic');
      if (!italicBtn) fail('quill-italic', 'Italic button not found');
      const olBtn = await page.$('.ql-list[value="ordered"]');
      if (!olBtn) fail('quill-ol', 'Ordered list button not found');
      const ulBtn = await page.$('.ql-list[value="bullet"]');
      if (!ulBtn) fail('quill-ul', 'Unordered list button not found');
      const imageBtn = await page.$('.ql-image');
      if (!imageBtn) fail('quill-image', 'Image button not found');
      const linkBtn = await page.$('.ql-link');
      if (!linkBtn) fail('quill-link', 'Link button not found');
      const cleanBtn = await page.$('.ql-clean');
      if (!cleanBtn) fail('quill-clean', 'Clean/clear format button not found');
      console.log('✅ [quill-buttons] Bold, italic, OL, UL, image, link, clean buttons present');

      // Check HR button (our custom addition)
      const hrBtn = await page.$('.ql-hr');
      if (!hrBtn) fail('quill-hr', 'HR (horizontal rule) button not found');
      else console.log('✅ [quill-hr] HR button found in toolbar');

      // 6. PREVIEW IFRAME
      const previewFrame = await page.$('#preview-frame');
      if (!previewFrame) fail('preview-frame', 'Preview iframe not found');
      else {
        console.log('✅ [preview-frame] Preview iframe found');
        const frameContent = await page.evaluate(() => {
          const iframe = document.getElementById('preview-frame');
          if (!iframe || !iframe.contentDocument) return false;
          return iframe.contentDocument.body.innerHTML.length > 0;
        });
        if (!frameContent) fail('preview-content', 'Preview iframe has no content');
        else console.log('✅ [preview-content] Preview iframe has content');
      }

      // Preview toggle buttons
      const originalBtn = await page.$('.preview-toggle-btn[data-view="original"]');
      const rewrittenBtn = await page.$('.preview-toggle-btn[data-view="rewritten"]');
      if (!originalBtn) fail('preview-toggle-original', 'Original preview toggle not found');
      if (!rewrittenBtn) fail('preview-toggle-rewritten', 'Rewritten preview toggle not found');
      else console.log('✅ [preview-toggles] Both original and rewritten toggle buttons found');

      // 7. BUTTONS BAR
      const submitBtn = await page.$('#submit-btn');
      if (!submitBtn) fail('submit-btn', 'Submit button not found');
      else console.log('✅ [submit-btn] Submit button found');

      const resetBtn = await page.$('#reset-btn');
      if (!resetBtn) fail('reset-btn', 'Reset button not found');
      else console.log('✅ [reset-btn] Reset button found');

      const loadOriginalBtn = await page.$('#load-original-btn');
      if (!loadOriginalBtn) fail('load-original-btn', 'Load Original button not found');
      else console.log('✅ [load-original-btn] Load Original button found');

      const clearBtn = await page.$('#clear-btn');
      if (!clearBtn) fail('clear-btn', 'Clear button not found');
      else console.log('✅ [clear-btn] Clear button found');

      // 8. QUILL EDITOR CONTENT
      const quillContent = await page.$eval('.ql-editor', el => el.innerHTML);
      if (!quillContent || quillContent.trim() === '') fail('quill-content', 'Quill editor is empty after loading a page');
      else console.log(`✅ [quill-content] Editor has content (${quillContent.length} chars)`);

      // 9. SETTINGS MODAL
      await settingsTrigger.click();
      await page.waitForTimeout(400);
      const settingsModal = await page.$('#settings-modal');
      if (!settingsModal) fail('settings-modal', 'Settings modal not found');
      else {
        const isOpen = await settingsModal.evaluate(el => el.classList.contains('open'));
        if (!isOpen) fail('settings-modal', 'Settings modal did not open');
        else {
          console.log('✅ [settings-modal] Settings modal opens correctly');
          const ghToken = await page.$('#github-token');
          const discordWb = await page.$('#discord-webhook');
          const ghRepo = await page.$('#github-repo');
          if (!ghToken || !discordWb || !ghRepo) fail('settings-fields', 'Some settings fields missing');
          else console.log('✅ [settings-fields] All settings fields present');

          // Close modal via close button
          const closeBtn = await page.$('#settings-modal .close-btn');
          if (closeBtn) { await closeBtn.click(); await page.waitForTimeout(200); }
        }
      }

      // 10. NAVIGATE TO SECOND PAGE
      if (sidebarPages.length > 1) {
        await sidebarPages[1].click();
        await page.waitForTimeout(500);
        const editorTitle2 = await page.$('#editor-title');
        if (editorTitle2) console.log(`✅ [nav] Navigated to second page: "${await editorTitle2.textContent()}"`);
      }

      // 11. TOGGLE PREVIEW TO REWRITTEN
      if (rewrittenBtn) {
        await rewrittenBtn.click();
        await page.waitForTimeout(300);
        const active = await rewrittenBtn.evaluate(el => el.classList.contains('active'));
        if (!active) fail('preview-toggle-active', 'Rewritten toggle did not activate');
        else console.log('✅ [preview-toggle] Rewritten preview toggle active');
        // Toggle back
        if (originalBtn) await originalBtn.click();
      }

      // 12. CHECK SUBMIT STATUS AREA
      const submitStatus = await page.$('#submit-status');
      if (!submitStatus) fail('submit-status', 'Submit status element not found');
      else console.log('✅ [submit-status] Submit status area found');

      // 13. META SNIPPETS PANEL
      const metaContainer = await page.$('#meta-snippets-list');
      if (!metaContainer) fail('meta-snippets', 'Meta snippets container not found');
      else console.log('✅ [meta-snippets] Meta snippets panel found');
    }

  } catch (e) {
    fail('fatal', 'Test crashed: ' + (e && e.message || e));
    console.error(e);
  } finally {
    await browser.close();
    server.close();
    console.log('\n─── TEST RESULTS ───');
    if (failures.length === 0) {
      console.log('✅ ALL CHECKS PASSED!');
      process.exit(0);
    } else {
      console.log(`❌ ${failures.length} FAILURE(S):`);
      failures.forEach(f => console.log('   ' + f));
      process.exit(1);
    }
  }
}

runTests().catch(console.error);