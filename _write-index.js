const fs = require('fs');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bratton PT — Copy Rework Editor</title>
  <link rel="stylesheet" href="editor.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>

  <!-- ===== TOP HEADER BAR ===== -->
  <header class="top-bar">
    <div class="top-bar__left">
      <h1 class="app-logo">Bratton PT <span>Copy Editor</span></h1>
    </div>
    <div class="top-bar__center">
      <select id="section-group-filter" class="select-compact" onchange="onSectionGroupChange()" aria-label="Filter by section group">
        <option value="">All Pages</option>
      </select>
      <select id="page-selector" class="select-compact select-page" onchange="onPageChange()" aria-label="Select page to edit">
        <option value="">— Select a Page —</option>
      </select>
    </div>
    <div class="top-bar__right">
      <span id="sync-indicator" class="sync-indicator" style="display:none" title="GitHub sync status">
        <span class="sync-dot"></span>
        <span id="sync-status" class="sync-label"></span>
      </span>
      <span id="version-badge" class="version-badge" style="display:none" title="Latest commit"></span>
      <button id="btn-sync" class="btn btn--ghost btn--sm" onclick="syncWithGitHub()" disabled title="Sync progress to GitHub">☁️ Sync</button>
      <button id="btn-settings" class="btn btn--ghost btn--sm" onclick="openSettings()">⚙️ Settings</button>
    </div>
  </header>

  <!-- ===== PAGE STATUS BAR ===== -->
  <div id="page-status-bar" class="page-status-bar" style="display:none">
    <span id="page-title-display" class="page-title-display"></span>
    <span class="page-status-right">
      <span id="dirty-count" class="dirty-count" style="display:none"></span>
      <span id="page-status-text" class="page-status-text"></span>
    </span>
  </div>

  <!-- ===== FLOATING FORMATTING TOOLBAR ===== -->
  <div id="float-toolbar" class="float-toolbar" style="display:none">
    <div class="tb-group">
      <button class="tb-btn" data-cmd="bold" title="Bold (Ctrl+B)"><strong>B</strong></button>
      <button class="tb-btn" data-cmd="italic" title="Italic (Ctrl+I)"><em>I</em></button>
      <button class="tb-btn" data-cmd="underline" title="Underline (Ctrl+U)"><u>U</u></button>
    </div>
    <div class="tb-divider"></div>
    <div class="tb-group">
      <button class="tb-btn" data-cmd="formatBlock" data-arg="h1" title="Heading 1">H1</button>
      <button class="tb-btn" data-cmd="formatBlock" data-arg="h2" title="Heading 2">H2</button>
      <button class="tb-btn" data-cmd="formatBlock" data-arg="h3" title="Heading 3">H3</button>
      <button class="tb-btn" data-cmd="formatBlock" data-arg="p" title="Paragraph">¶</button>
    </div>
    <div class="tb-divider"></div>
    <div class="tb-group">
      <button class="tb-btn" data-cmd="insertUnorderedList" title="Bullet List">•≡</button>
      <button class="tb-btn" data-cmd="insertOrderedList" title="Numbered List">1≡</button>
    </div>
    <div class="tb-divider"></div>
    <div class="tb-group">
      <button class="tb-btn" data-cmd="justifyLeft" title="Align Left">⇤</button>
      <button class="tb-btn" data-cmd="justifyCenter" title="Align Center">⇔</button>
      <button class="tb-btn" data-cmd="justifyRight" title="Align Right">⇥</button>
    </div>
    <div class="tb-divider"></div>
    <div class="tb-group">
      <button class="tb-btn" data-cmd="createLink" title="Insert Link">🔗</button>
      <button class="tb-btn" id="tb-image-btn" title="Insert Image">🖼️</button>
      <input type="file" id="image-upload-input" accept="image/*" style="display:none" onchange="handleImageUpload(event)">
      <button class="tb-btn" data-cmd="insertHorizontalRule" title="Divider">—</button>
    </div>
    <div class="tb-divider"></div>
    <div class="tb-group">
      <button class="tb-btn" data-cmd="removeFormat" title="Clear Formatting">✕</button>
    </div>
  </div>

  <!-- ===== EMPTY STATE ===== -->
  <div id="empty-state" class="empty-state">
    <div class="empty-state__icon">📄</div>
    <h2>Select a Page to Edit</h2>
    <p>Choose a page from the dropdown above to start rewriting copy.</p>
    <p class="empty-state__hint">Click any text on the rendered page to edit it directly.</p>
  </div>

  <!-- ===== PAGE CONTENT ===== -->
  <main id="page-content" class="page-content" style="display:none">
    <div id="snippets-container" class="snippets-container"></div>
  </main>

  <!-- ===== BOTTOM SUBMIT BAR ===== -->
  <footer class="bottom-bar">
    <div class="bottom-bar__left">
      <span class="shortcut-hint">Ctrl+S to submit</span>
    </div>
    <div class="bottom-bar__right">
      <button id="btn-submit-page" class="btn btn--submit btn--lg" onclick="submitPage()" disabled>
        📨 Submit Page to Discord
      </button>
    </div>
  </footer>

  <!-- ===== TOAST ===== -->
  <div id="submit-toast" class="submit-toast" style="display:none"></div>

  <!-- ===== SETTINGS MODAL ===== -->
  <div id="settings-modal" class="settings-modal">
    <div class="settings-modal__panel">
      <div class="settings-modal__header">
        <h3>⚙️ Settings</h3>
        <button class="btn--close" onclick="closeSettings()">✕</button>
      </div>
      <div class="settings-modal__body">
        <div class="form-group">
          <label for="github-token">GitHub Personal Access Token</label>
          <input type="password" id="github-token" class="form-input" placeholder="ghp_...">
          <span class="form-hint">Used to sync rewrite progress across devices. Create at github.com/settings/tokens with "repo" scope.</span>
        </div>
        <div class="form-group">
          <label for="github-repo">GitHub Repository</label>
          <input type="text" id="github-repo" class="form-input" placeholder="username/repo">
          <span class="form-hint">Format: owner/repository (e.g., nawnawnawnawnaw55-jpg/Bratton-Copy-Rework)</span>
        </div>
        <div class="form-group">
          <label for="discord-webhook">Discord Webhook URL</label>
          <input type="text" id="discord-webhook" class="form-input" placeholder="https://discord.com/api/webhooks/...">
          <span class="form-hint">Submissions will be sent here with the rewritten HTML as a file attachment.</span>
        </div>
        <div id="settings-status" class="form-status"></div>
      </div>
      <div class="settings-modal__footer">
        <button class="btn btn--ghost" onclick="closeSettings()">Cancel</button>
        <button class="btn btn--primary" onclick="saveSettings()">Save Settings</button>
      </div>
    </div>
  </div>

  <script src="editor.js"></script>
</body>
</html>`;

fs.writeFileSync('index.html', html, 'utf8');
console.log('index.html written successfully');