/* Prompt Library Application */
(function() {
  'use strict';

  // LocalStorage key
  const STORAGE_KEY = 'promptLibrary.prompts';

  // DOM Elements
  const form = document.getElementById('prompt-form');
  const titleInput = document.getElementById('prompt-title');
  const contentInput = document.getElementById('prompt-content');
  const saveBtn = document.getElementById('save-btn');
  const searchInput = document.getElementById('search');
  const promptListEl = document.getElementById('prompt-list');
  const emptyStateEl = document.getElementById('empty-state');
  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const importFileInput = document.getElementById('import-file');
  const template = document.getElementById('prompt-card-template');
  const themeToggleBtn = document.getElementById('theme-toggle');

  // State
  let prompts = loadPrompts();
  let filteredPrompts = prompts.slice();

  // Initialization
  validateForm();
  applyInitialTheme();
  render();
  bindEvents();

  /* --------------------- Persistence ---------------------- */
  function loadPrompts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return data.map(p => ({ ...p }));
    } catch (e) {
      console.warn('Failed to load prompts', e);
      return [];
    }
  }

  function savePrompts() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
    } catch (e) {
      console.error('Failed to save prompts', e);
    }
  }

  /* ----------------------- Utilities ---------------------- */
  function uid() {
    return Date.now().toString(36) + '-' + crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
  }

  function formatDate(ts) {
    try {
      return new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch { return ''; }
  }

  function escapeHTML(str) {
    return str.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  /* --------------------- Event Binding -------------------- */
  function bindEvents() {
    form.addEventListener('input', validateForm);
    form.addEventListener('submit', handleSubmit);
    searchInput.addEventListener('input', handleSearch);
    exportBtn.addEventListener('click', handleExport);
    importBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', handleImport);
    if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    if (!title || !content) return;

    const prompt = {
      id: uid(),
      title,
      content,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    prompts.unshift(prompt); // newest first
    savePrompts();
    form.reset();
    validateForm();
    filteredPrompts = prompts.slice();
    render();
    announce('Prompt saved');
  }

  function handleSearch() {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
      filteredPrompts = prompts.slice();
    } else {
      filteredPrompts = prompts.filter(p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q));
    }
    render();
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(prompts, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prompts-export-' + new Date().toISOString().slice(0,19).replace(/[:T]/g,'-') + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    announce('Exported prompts');
  }

  function handleImport(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = JSON.parse(evt.target.result);
        if (!Array.isArray(data)) throw new Error('Invalid format');
        // Basic schema validation
        const sanitized = data.filter(d => d && typeof d === 'object' && d.title && d.content).map(d => ({
          id: d.id || uid(),
          title: String(d.title).slice(0, 120),
          content: String(d.content),
          createdAt: d.createdAt || Date.now(),
          updatedAt: Date.now()
        }));
        prompts = mergeById(prompts, sanitized);
        savePrompts();
        filteredPrompts = prompts.slice();
        render();
        announce('Imported prompts');
      } catch (err) {
        console.error(err);
        announce('Import failed');
        alert('Import failed: ' + err.message);
      } finally {
        importFileInput.value = '';
      }
    };
    reader.readAsText(file);
  }

  function mergeById(existing, incoming) {
    const map = new Map(existing.map(p => [p.id, p]));
    for (const item of incoming) {
      if (!map.has(item.id)) map.set(item.id, item);
    }
    return Array.from(map.values()).sort((a,b) => b.createdAt - a.createdAt);
  }

  /* --------------------- Rendering ------------------------ */
  function render() {
    promptListEl.innerHTML = '';
    if (!filteredPrompts.length) {
      emptyStateEl.hidden = false;
      return;
    }
    emptyStateEl.hidden = true;
    const frag = document.createDocumentFragment();
    filteredPrompts.forEach(p => frag.appendChild(createCard(p)));
    promptListEl.appendChild(frag);
  }

  function createCard(prompt) {
    const { id, title, content, createdAt } = prompt;
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.id = id;
    node.querySelector('.prompt-title').textContent = title;
    node.querySelector('.prompt-content').textContent = content;
    node.querySelector('.timestamp').textContent = formatDate(createdAt);

    const copyBtn = node.querySelector('.copy-btn');
    const deleteBtn = node.querySelector('.delete-btn');

    copyBtn.addEventListener('click', () => copyPrompt(id));
    deleteBtn.addEventListener('click', () => deletePrompt(id));

    return node;
  }

  function deletePrompt(id) {
    if (!confirm('Delete this prompt?')) return;
    const idx = prompts.findIndex(p => p.id === id);
    if (idx === -1) return;
    prompts.splice(idx, 1);
    savePrompts();
    filteredPrompts = filteredPrompts.filter(p => p.id !== id);
    render();
    announce('Prompt deleted');
  }

  function copyPrompt(id) {
    const prompt = prompts.find(p => p.id === id);
    if (!prompt) return;
    const text = prompt.content;
    navigator.clipboard.writeText(text).then(() => {
      announce('Copied to clipboard');
    }).catch(err => {
      console.error('Copy failed', err);
      announce('Copy failed');
    });
  }

  /* --------------------- Form Logic ----------------------- */
  function validateForm() {
    const valid = titleInput.value.trim() && contentInput.value.trim();
    saveBtn.disabled = !valid;
  }

  /* --------------------- Theme Handling ------------------ */
  const THEME_KEY = 'promptLibrary.theme';
  function applyInitialTheme() {
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch {}
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    const theme = saved || (prefersLight ? 'light' : 'dark');
    applyTheme(theme);
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
      if (themeToggleBtn) themeToggleBtn.textContent = 'Switch to Dark Theme';
    } else {
      root.removeAttribute('data-theme');
      if (themeToggleBtn) themeToggleBtn.textContent = 'Switch to Light Theme';
    }
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
    announce(theme === 'light' ? 'Light theme enabled' : 'Dark theme enabled');
  }

  function toggleTheme() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    applyTheme(isLight ? 'dark' : 'light');
  }

  /* --------------------- Accessibility -------------------- */
  let liveRegion = null;
  function announce(msg) {
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.className = 'visually-hidden';
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      document.body.appendChild(liveRegion);
    }
    liveRegion.textContent = msg;
  }

  // Expose debugging helpers (optional)
  window.__PromptLibrary = {
    getPrompts: () => prompts.slice(),
    clear: () => { prompts = []; savePrompts(); filteredPrompts = []; render(); }
  };
})();
