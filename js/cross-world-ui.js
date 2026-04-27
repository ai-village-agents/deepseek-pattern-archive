// The Pattern Archive - Cross-World UI Controller
// Mirrors the modular style of analytics.js, collaboration.js, and pattern-discovery-ui.js
(function () {
  const uiState = {
    isReady: false,
    isSyncing: false,
    worldStatuses: {},
    lastPing: null,
    pollTimer: null
  };

  let el = {};

  // ======== INIT ========
  function initCrossWorldUI(options = {}) {
    if (uiState.isReady || typeof document === 'undefined') return uiState;
    const root = ensureRoot(options.rootId || 'cross-world-ui');
    el = buildLayout(root);
    bindControls();
    bootstrapAPI(options);
    refreshUI();
    startStatusPolling();
    uiState.isReady = true;
    return uiState;
  }

  function bootstrapAPI(options = {}) {
    if (typeof CrossWorldAPI === 'undefined') {
      console.warn('CrossWorldAPI not available; UI will render shell only.');
      return;
    }
    try {
      CrossWorldAPI.initCrossWorldAPI({
        autoDiscover: options.autoDiscover !== false,
        autoSync: false,
        probeWorlds: options.probeWorlds !== false
      });
    } catch (err) {
      console.warn('CrossWorldAPI init failed', err);
    }
  }

  // ======== LAYOUT ========
  function ensureRoot(id) {
    let root = document.getElementById(id) || document.querySelector('.cross-world-section');
    if (!root) {
      root = document.createElement('section');
      root.id = id;
      root.className = 'content-section cross-world-section';
      const host = document.querySelector('.main-content') || document.body;
      host.appendChild(root);
    }
    root.innerHTML = `
      <h2>Cross-World Intelligence Lab</h2>
      <div class="section-description">
        <p>Explore correlations, sync data, and traverse the AI Village worlds through a single control surface.</p>
      </div>

      <div class="analytics-grid">
        <div class="analytics-card">
          <div class="analytics-card-header">
            <h3>World Control Center</h3>
            <p class="analytics-hint">Discover worlds, connect, and monitor live connectivity.</p>
          </div>
          <div class="crossworld-controls discovery-controls-container"></div>
          <div class="crossworld-actions discovery-actions"></div>
          <div class="crossworld-status-list discovery-patterns-container"></div>
        </div>

        <div class="analytics-card analytics-card-highlight">
          <div class="analytics-card-header">
            <h3>Ecosystem Pulse</h3>
            <p class="analytics-hint">Aggregated cross-world metrics, correlations, and automated insights.</p>
          </div>
          <div class="crossworld-metrics discovery-metrics-container"></div>
          <div class="crossworld-insights discovery-correlations-container"></div>
        </div>
      </div>

      <div class="analytics-card analytics-chart-panel">
        <div class="analytics-card-header">
          <h3>Cross-World Visualizations</h3>
          <p class="analytics-hint">Heatmaps and comparison tables reveal alignment between agent worlds.</p>
        </div>
        <div class="crossworld-visuals">
          <div id="cross-world-correlation" class="discovery-patterns-container"></div>
          <div id="cross-world-comparison" class="discovery-patterns-container"></div>
        </div>
      </div>

      <div class="analytics-card">
        <div class="analytics-card-header">
          <h3>World Explorer</h3>
          <p class="analytics-hint">Browse each world, compare pattern volumes, and trigger targeted syncs.</p>
        </div>
        <div class="crossworld-explorer discovery-patterns-container"></div>
      </div>

      <div class="analytics-card">
        <div class="analytics-card-header">
          <h3>Export & Sharing</h3>
          <p class="analytics-hint">Share normalized cross-world insights with other investigators.</p>
        </div>
        <div class="crossworld-export discovery-controls-container"></div>
      </div>
    `;
    return root;
  }

  function buildLayout(root) {
    const controls = root.querySelector('.crossworld-controls');
    const actions = root.querySelector('.crossworld-actions');
    const statusList = root.querySelector('.crossworld-status-list');
    const metrics = root.querySelector('.crossworld-metrics');
    const insights = root.querySelector('.crossworld-insights');
    const visuals = root.querySelector('.crossworld-visuals');
    const explorer = root.querySelector('.crossworld-explorer');
    const exportBox = root.querySelector('.crossworld-export');

    controls.innerHTML = `
      <div class="discovery-controls-grid">
        <div class="control-group">
          <label for="crossworld-hints">Discovery hints</label>
          <textarea id="crossworld-hints" class="discovery-select" rows="3" placeholder="https://new.world/api | New World"></textarea>
          <p class="discovery-hint">Comma or newline separated hints. Format: <code>BaseURL | Display Name</code>. Defaults to seeded worlds.</p>
        </div>
        <div class="control-group">
          <label>Register a world</label>
          <input id="crossworld-name" type="text" placeholder="World name e.g. Drift" />
          <input id="crossworld-url" type="text" placeholder="Base URL e.g. https://drift.world/api" />
          <div class="control-hint">Paths default to <code>/health</code> and <code>/patterns</code>. Override only if needed.</div>
        </div>
      </div>
    `;

    actions.innerHTML = `
      <button id="crossworld-discover" class="discovery-button discovery-button-primary">Discover Worlds</button>
      <button id="crossworld-ping" class="discovery-button">Ping Worlds</button>
      <button id="crossworld-sync" class="discovery-button">Sync All Worlds</button>
      <button id="crossworld-register" class="discovery-button">Add World</button>
    `;

    visuals.innerHTML = `
      <div class="discovery-grid">
        <div class="discovery-card">
          <div class="discovery-card-header">
            <h3>Correlation Heatmap</h3>
            <p class="discovery-hint">Cross-world archetype alignment with cosine similarity.</p>
          </div>
          <div id="cross-world-correlation" class="heatmap-host"></div>
        </div>
        <div class="discovery-card">
          <div class="discovery-card-header">
            <h3>World Comparison</h3>
            <p class="discovery-hint">Pattern totals, common archetypes, and severity signals.</p>
          </div>
          <div id="cross-world-comparison" class="comparison-host"></div>
        </div>
      </div>
    `;

    exportBox.innerHTML = `
      <div class="discovery-controls-grid">
        <div class="control-group">
          <label for="crossworld-export-select">Export scope</label>
          <select id="crossworld-export-select" class="discovery-select"></select>
          <div class="control-hint">Choose a specific world or export the full normalized dataset.</div>
        </div>
        <div class="control-group">
          <label for="crossworld-export-name">Label</label>
          <input id="crossworld-export-name" type="text" placeholder="Filename label (optional)" />
          <div class="control-hint">Adds a suffix to exported filenames for sharing.</div>
        </div>
      </div>
      <div class="discovery-actions">
        <button id="crossworld-export" class="discovery-button discovery-button-primary">Export Dataset</button>
      </div>
    `;

    return {
      root,
      controls,
      actions,
      statusList,
      metrics,
      insights,
      visuals,
      explorer,
      exportBox,
      discoverBtn: actions.querySelector('#crossworld-discover'),
      pingBtn: actions.querySelector('#crossworld-ping'),
      syncBtn: actions.querySelector('#crossworld-sync'),
      registerBtn: actions.querySelector('#crossworld-register'),
      hintsInput: controls.querySelector('#crossworld-hints'),
      nameInput: controls.querySelector('#crossworld-name'),
      urlInput: controls.querySelector('#crossworld-url'),
      exportSelect: exportBox.querySelector('#crossworld-export-select'),
      exportName: exportBox.querySelector('#crossworld-export-name'),
      exportBtn: exportBox.querySelector('#crossworld-export')
    };
  }

  // ======== EVENT BINDINGS ========
  function bindControls() {
    if (!el.actions) return;
    if (el.discoverBtn) el.discoverBtn.addEventListener('click', handleDiscover);
    if (el.pingBtn) el.pingBtn.addEventListener('click', () => pingWorlds());
    if (el.syncBtn) el.syncBtn.addEventListener('click', () => syncAllWorlds());
    if (el.registerBtn) el.registerBtn.addEventListener('click', () => registerWorldFromForm());
    if (el.exportBtn) el.exportBtn.addEventListener('click', () => exportSelection());
  }

  // ======== ACTIONS ========
  async function handleDiscover() {
    if (typeof CrossWorldAPI === 'undefined') return;
    setSyncing(true, 'Discovering worlds...');
    try {
      const hints = parseHints(el.hintsInput ? el.hintsInput.value : '');
      await CrossWorldAPI.discoverWorlds({ hints, probe: true });
      await pingWorlds({ silent: true });
      await syncAllWorlds({ silent: true });
    } catch (err) {
      console.warn('World discovery failed', err);
    } finally {
      setSyncing(false);
      refreshUI();
    }
  }

  async function registerWorldFromForm() {
    if (typeof CrossWorldAPI === 'undefined') return;
    const name = (el.nameInput && el.nameInput.value || '').trim();
    const baseUrl = (el.urlInput && el.urlInput.value || '').trim();
    if (!baseUrl) {
      alert('Provide a base URL for the world you want to register.');
      return;
    }
    CrossWorldAPI.registerWorld({
      name: name || baseUrl,
      baseUrl
    });
    if (el.nameInput) el.nameInput.value = '';
    if (el.urlInput) el.urlInput.value = '';
    await pingWorlds({ silent: true });
    refreshUI();
  }

  async function pingWorlds(options = {}) {
    if (typeof CrossWorldAPI === 'undefined') return;
    const state = CrossWorldAPI.getState ? CrossWorldAPI.getState() : { worlds: {} };
    const ids = Object.keys(state.worlds || {});
    if (!ids.length) return;
    setSyncing(true, 'Pinging worlds...');
    try {
      const results = await Promise.all(ids.map(id => CrossWorldAPI.pingWorld(id).catch(err => ({ id, ok: false, message: err.message }))));
      results.forEach(res => {
        uiState.worldStatuses[res.id] = {
          ok: !!res.ok,
          latency: res.latency,
          message: res.message,
          checkedAt: new Date().toISOString()
        };
      });
      uiState.lastPing = new Date().toISOString();
    } catch (err) {
      console.warn('Ping failed', err);
    } finally {
      setSyncing(false);
      if (!options.silent) refreshUI();
    }
  }

  async function syncAllWorlds(options = {}) {
    if (typeof CrossWorldAPI === 'undefined') return;
    setSyncing(true, 'Syncing worlds...');
    try {
      await CrossWorldAPI.fetchAllWorlds({ limit: 120 });
    } catch (err) {
      console.warn('Cross-world sync failed', err);
    } finally {
      setSyncing(false);
      if (!options.silent) refreshUI();
    }
  }

  function setSyncing(flag, label) {
    uiState.isSyncing = flag;
    if (el.syncBtn) {
      el.syncBtn.disabled = flag;
      el.syncBtn.textContent = flag ? (label || 'Syncing...') : 'Sync All Worlds';
    }
    if (el.discoverBtn) el.discoverBtn.disabled = flag;
    if (el.registerBtn) el.registerBtn.disabled = flag;
    if (el.pingBtn) el.pingBtn.disabled = flag;
  }

  function startStatusPolling() {
    if (uiState.pollTimer) return;
    uiState.pollTimer = setInterval(() => pingWorlds({ silent: true }), 45000);
  }

  // ======== RENDERING ========
  function refreshUI() {
    renderMetrics();
    renderInsights();
    renderStatus();
    renderVisuals();
    renderExplorer();
    renderExportOptions();
  }

  function renderMetrics() {
    if (!el.metrics) return;
    const state = CrossWorldAPI && CrossWorldAPI.getState ? CrossWorldAPI.getState() : {};
    const aggregates = state.aggregates || { countsByWorld: {}, countsByType: {} };
    const patterns = state.patterns || [];
    const worldCount = Object.keys(state.worlds || {}).length;
    const totalPatterns = patterns.length;
    const avgSeverity = totalPatterns
      ? (patterns.reduce((sum, p) => sum + (Number(p.severity) || 0), 0) / totalPatterns).toFixed(2)
      : '0.00';
    const correlation = aggregates.correlation || {};
    const strongest = correlation.strongestPair ? `${correlation.strongestPair[0]} ↔ ${correlation.strongestPair[1]}` : 'Pending sync';
    const lastSync = state.lastSync ? formatRelative(state.lastSync) : 'Not yet';

    el.metrics.innerHTML = `
      <div class="tech-metric">
        <div class="tech-metric-value">${worldCount}</div>
        <div class="tech-metric-label">Connected Worlds</div>
      </div>
      <div class="tech-metric">
        <div class="tech-metric-value">${totalPatterns}</div>
        <div class="tech-metric-label">Patterns Ingested</div>
      </div>
      <div class="tech-metric">
        <div class="tech-metric-value">${avgSeverity}</div>
        <div class="tech-metric-label">Avg Severity</div>
      </div>
      <div class="tech-metric">
        <div class="tech-metric-value">${Object.keys(aggregates.countsByType || {}).length}</div>
        <div class="tech-metric-label">Archetypes Observed</div>
      </div>
      <div class="tech-metric">
        <div class="tech-metric-value">${strongest}</div>
        <div class="tech-metric-label">Strongest Pair</div>
      </div>
      <div class="tech-metric">
        <div class="tech-metric-value">${lastSync}</div>
        <div class="tech-metric-label">Last Sync</div>
      </div>
    `;
  }

  function renderInsights() {
    if (!el.insights) return;
    const insights = getInsights();
    if (!insights.length) {
      el.insights.innerHTML = `
        <div class="discovery-loading">
          <p>No cross-world insights yet. Run a sync to generate automated findings.</p>
        </div>
      `;
      return;
    }
    const list = document.createElement('div');
    list.className = 'correlation-list';
    insights.slice(0, 6).forEach(item => {
      const row = document.createElement('div');
      row.className = 'correlation-item';
      row.innerHTML = `
        <div class="correlation-header">
          <strong>Insight</strong>
          <span style="color:#4dd6ff;font-weight:600;">Cross-World</span>
        </div>
        <div class="correlation-details">
          <p>${item}</p>
        </div>
      `;
      list.appendChild(row);
    });
    el.insights.innerHTML = '';
    el.insights.appendChild(list);
  }

  function renderStatus() {
    if (!el.statusList) return;
    const state = CrossWorldAPI && CrossWorldAPI.getState ? CrossWorldAPI.getState() : { worlds: {} };
    const worlds = state.worlds || {};
    const entries = Object.keys(worlds);
    if (!entries.length) {
      el.statusList.innerHTML = `
        <div class="discovery-loading">
          <p>No worlds registered yet. Use discovery or add a base URL to begin.</p>
        </div>
      `;
      return;
    }

    el.statusList.innerHTML = '';
    entries.forEach(id => {
      const status = uiState.worldStatuses[id] || {};
      const ok = status.ok !== false;
      const badge = document.createElement('div');
      badge.className = 'pattern-item';
      badge.innerHTML = `
        <div class="pattern-header">
          <div class="pattern-title">${escape(worlds[id].name || id)}</div>
          <div class="pattern-confidence ${ok ? 'high' : 'low'}">${ok ? 'Online' : 'Unreachable'}</div>
        </div>
        <div class="pattern-description">
          <p>${escape(worlds[id].baseUrl || '')}</p>
          <div class="pattern-reasoning">
            <strong>Status:</strong> ${status.message ? escape(status.message) : ok ? 'Healthy' : 'Pending probe'}
          </div>
        </div>
        <div class="pattern-metrics">
          <div class="metric-item">
            <div class="metric-label">Latency</div>
            <div class="metric-value">${status.latency ? `${Math.round(status.latency)} ms` : '—'}</div>
          </div>
          <div class="metric-item">
            <div class="metric-label">Patterns</div>
            <div class="metric-value">${(state.aggregates?.countsByWorld || {})[id] || 0}</div>
          </div>
          <div class="metric-item">
            <div class="metric-label">Checked</div>
            <div class="metric-value">${status.checkedAt ? formatRelative(status.checkedAt) : '—'}</div>
          </div>
        </div>
      `;
      el.statusList.appendChild(badge);
    });
  }

  function renderVisuals() {
    if (typeof CrossWorldAPI === 'undefined') return;
    CrossWorldAPI.renderCorrelationHeatmap('cross-world-correlation');
    CrossWorldAPI.renderWorldComparison('cross-world-comparison');
  }

  function renderExplorer() {
    if (!el.explorer) return;
    const state = CrossWorldAPI && CrossWorldAPI.getState ? CrossWorldAPI.getState() : { worlds: {} };
    const worlds = state.worlds || {};
    const aggregates = state.aggregates || { countsByWorld: {}, severityByWorld: {} };
    const ids = Object.keys(worlds);
    if (!ids.length) {
      el.explorer.innerHTML = `
        <div class="discovery-loading">
          <p>No connected worlds. Add a world to explore cross-world patterns.</p>
        </div>
      `;
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'discovery-grid';

    ids.forEach(id => {
      const card = document.createElement('div');
      card.className = 'discovery-card';
      const total = aggregates.countsByWorld[id] || 0;
      const sevEntry = aggregates.severityByWorld[id] || { total: 0, count: 0 };
      const avg = sevEntry.count ? (sevEntry.total / sevEntry.count).toFixed(2) : '0.00';
      card.innerHTML = `
        <div class="discovery-card-header">
          <h3>${escape(worlds[id].name || id)}</h3>
          <p class="discovery-hint">${escape(worlds[id].baseUrl || '')}</p>
        </div>
        <div class="discovery-patterns-container">
          <div class="pattern-metrics">
            <div class="metric-item">
              <div class="metric-label">Patterns</div>
              <div class="metric-value">${total}</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">Avg Severity</div>
              <div class="metric-value">${avg}</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">Last Sync</div>
              <div class="metric-value">${state.lastSync ? formatRelative(state.lastSync) : '—'}</div>
            </div>
          </div>
          <div class="discovery-actions">
            <button class="discovery-button" data-world-fetch="${id}">Fetch</button>
            <button class="discovery-button" data-world-export="${id}">Export</button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });

    el.explorer.innerHTML = '';
    el.explorer.appendChild(grid);

    el.explorer.querySelectorAll('[data-world-fetch]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (typeof CrossWorldAPI === 'undefined') return;
        const id = btn.getAttribute('data-world-fetch');
        await CrossWorldAPI.fetchWorldData(id).catch(err => console.warn('Fetch world failed', err));
        refreshUI();
      });
    });

    el.explorer.querySelectorAll('[data-world-export]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-world-export');
        exportWorld(id);
      });
    });
  }

  function renderExportOptions() {
    if (!el.exportSelect) return;
    const state = CrossWorldAPI && CrossWorldAPI.getState ? CrossWorldAPI.getState() : { worlds: {} };
    const ids = Object.keys(state.worlds || {});
    el.exportSelect.innerHTML = '';
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All worlds (full dataset)';
    el.exportSelect.appendChild(allOption);
    ids.forEach(id => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = state.worlds[id].name || id;
      el.exportSelect.appendChild(opt);
    });
  }

  // ======== EXPORTS ========
  function exportSelection() {
    const scope = el.exportSelect ? el.exportSelect.value : 'all';
    if (scope === 'all') {
      exportAll();
    } else {
      exportWorld(scope);
    }
  }

  function exportAll() {
    if (typeof CrossWorldAPI === 'undefined') return;
    const state = CrossWorldAPI.getState ? CrossWorldAPI.getState() : {};
    const payload = {
      worlds: state.worlds || {},
      patterns: state.patterns || [],
      aggregates: state.aggregates || {},
      insights: getInsights(),
      exportedAt: new Date().toISOString(),
      source: 'The Pattern Archive - Cross-World UI'
    };
    downloadJSON(buildFilename('cross-world-dataset'), payload);
  }

  function exportWorld(worldId) {
    if (typeof CrossWorldAPI === 'undefined') return;
    const data = CrossWorldAPI.exportForWorld ? CrossWorldAPI.exportForWorld(worldId) : [];
    downloadJSON(buildFilename(`cross-world-${worldId}`), data);
  }

  function downloadJSON(name, data) {
    const label = el.exportName && el.exportName.value ? `-${slugify(el.exportName.value)}` : '';
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name}${label}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ======== HELPERS ========
  function getInsights() {
    if (typeof CrossWorldAPI === 'undefined') return [];
    if (typeof CrossWorldAPI.getInsights === 'function') return CrossWorldAPI.getInsights() || [];
    if (typeof CrossWorldAPI.generateInsights === 'function') return CrossWorldAPI.generateInsights();
    return [];
  }

  function parseHints(raw = '') {
    if (!raw.trim()) return [];
    return raw
      .split(/[\n,]+/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const parts = line.split('|').map(p => p.trim()).filter(Boolean);
        if (parts.length === 2) {
          return { name: parts[1] || parts[0], baseUrl: parts[0] };
        }
        return { name: parts[0], baseUrl: parts[0] };
      });
  }

  function formatRelative(dateStr) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  function slugify(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  function escape(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ======== EXPORT ========
  window.CrossWorldUI = {
    init: initCrossWorldUI,
    refresh: refreshUI,
    sync: syncAllWorlds,
    discover: handleDiscover,
    getState: () => ({ ...uiState })
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCrossWorldUI);
  } else {
    setTimeout(initCrossWorldUI, 60);
  }
})();
