// The Pattern Archive - Real-Time Visitor Analytics Dashboard
// Self-contained IIFE exposing analytics API while keeping internals scoped
(function () {
  const STORAGE_KEY_DATA = 'pattern-archive-anomalies';
  const STORAGE_KEY_STATE = 'pattern-archive-analytics-state';
  const THEME = {
    cyan: '#4dd6ff',
    magenta: '#ff2fa3',
    purple: '#7c6cff',
    background: '#070a12',
    panel: 'rgba(7,10,18,0.72)'
  };

  const analyticsState = {
    anomalies: [],
    filtered: [],
    filters: {
      timeRange: '7d', // 24h, 7d, 30d, all
      type: 'all',
      severity: 'all'
    },
    charts: {},
    containers: {}
  };

  // ======== PUBLIC API ========
  function initAnalyticsDashboard(rootId = 'analytics-dashboard') {
    const root = getOrCreateRoot(rootId);
    restoreFilters();
    analyticsState.anomalies = loadAnomalies();
    analyticsState.containers = buildDashboardShell(root);
    renderAnalyticsControls();
    updateAnalytics();
    return analyticsState;
  }

  function renderAnalyticsCharts(anomalies) {
    const container = analyticsState.containers.charts;
    if (!container) return;
    container.innerHTML = '';

    const chartConfigs = [
      {
        id: 'chart-temporal',
        title: 'Temporal Submission Patterns',
        build: () => buildTemporalConfig(anomalies)
      },
      {
        id: 'chart-types',
        title: 'Pattern Type Distribution',
        build: () => buildTypeConfig(anomalies)
      },
      {
        id: 'chart-severity',
        title: 'Severity Distribution',
        build: () => buildSeverityConfig(anomalies)
      },
      {
        id: 'chart-hourly',
        title: 'Hourly Submission Patterns',
        build: () => buildHourlyConfig(anomalies)
      }
    ];

    chartConfigs.forEach(cfg => {
      const card = createCard(cfg.title);
      const canvas = document.createElement('canvas');
      canvas.height = 260;
      card.appendChild(canvas);
      container.appendChild(card);

      const context = canvas.getContext('2d');
      const built = cfg.build();

      // Graceful fallback when Chart.js is not available
      if (typeof Chart === 'undefined' || !built) {
        drawFallbackChart(context, cfg.title, built && built.summary);
        analyticsState.charts[cfg.id] = null;
        return;
      }

      if (analyticsState.charts[cfg.id]) {
        analyticsState.charts[cfg.id].destroy();
      }

      analyticsState.charts[cfg.id] = new Chart(context, built.config);
    });
  }

  function renderAnalyticsControls() {
    const container = analyticsState.containers.controls;
    if (!container) return;
    container.innerHTML = '';

    const controls = document.createElement('div');
    controls.className = 'analytics-controls';
    controls.style.display = 'grid';
    controls.style.gridTemplateColumns = 'repeat(auto-fit, minmax(180px, 1fr))';
    controls.style.gap = '12px';

    controls.appendChild(
      createSelectControl(
        'Time Range',
        'timeRange',
        [
          { value: '24h', label: 'Last 24 hours' },
          { value: '7d', label: 'Last 7 days' },
          { value: '30d', label: 'Last 30 days' },
          { value: 'all', label: 'All time' }
        ],
        analyticsState.filters.timeRange
      )
    );

    controls.appendChild(
      createSelectControl(
        'Pattern Type',
        'type',
        [
          { value: 'all', label: 'All' },
          { value: 'incremental', label: 'Incremental' },
          { value: 'exponential', label: 'Exponential' },
          { value: 'clockwork', label: 'Clockwork' },
          { value: 'other', label: 'Other' }
        ],
        analyticsState.filters.type
      )
    );

    controls.appendChild(
      createSelectControl(
        'Severity',
        'severity',
        [
          { value: 'all', label: 'All' },
          { value: '1-2', label: 'Minor (1-2)' },
          { value: '3', label: 'Moderate (3)' },
          { value: '4', label: 'Significant (4)' },
          { value: '5', label: 'Major (5)' }
        ],
        analyticsState.filters.severity
      )
    );

    container.appendChild(controls);
  }

  function renderAnalyticsStats(anomalies) {
    const container = analyticsState.containers.stats;
    if (!container) return;
    container.innerHTML = '';

    const card = createCard('Engagement & Anomaly Pulse');
    card.style.display = 'grid';
    card.style.gridTemplateColumns = 'repeat(auto-fit, minmax(180px, 1fr))';
    card.style.gap = '12px';

    const total = anomalies.length;
    const severityAvg = total
      ? (anomalies.reduce((sum, a) => sum + (Number(a.severity) || 0), 0) / total).toFixed(2)
      : '0.00';

    const commonType = getMostCommon(
      anomalies.map(a => normalizeType(a.type || 'other'))
    ) || 'N/A';

    const velocity = computeVelocity(anomalies);
    const engagement = computeEngagement(anomalies);

    const stats = [
      { label: 'Total submissions', value: total },
      { label: 'Avg. severity', value: severityAvg },
      { label: 'Most common type', value: capitalize(commonType) },
      { label: 'Submission velocity', value: `${velocity.toFixed(2)} / day` },
      { label: 'Engagement (24h)', value: engagement.last24h },
      { label: 'Streak (days with submissions)', value: engagement.streak }
    ];

    const collabMetrics = getCollabMetrics();
    if (collabMetrics) {
      stats.push(
        { label: 'Active discussions', value: collabMetrics.activeThreads },
        { label: 'Collab comments', value: collabMetrics.totalComments },
        { label: 'Hypotheses logged', value: collabMetrics.totalHypotheses }
      );
    }

    stats.forEach(stat => {
      const tile = document.createElement('div');
      tile.style.padding = '12px';
      tile.style.border = `1px solid ${THEME.purple}33`;
      tile.style.borderRadius = '10px';
      tile.style.background = 'rgba(124,108,255,0.08)';
      tile.innerHTML = `
        <div style="opacity:0.7;font-size:12px;text-transform:uppercase;letter-spacing:0.05em">${stat.label}</div>
        <div style="font-size:22px;font-weight:700;color:${THEME.cyan};margin-top:4px">${stat.value}</div>
      `;
      card.appendChild(tile);
    });

    container.appendChild(card);
    renderRecentDiscussions(container);
  }

  function updateAnalytics() {
    const filtered = applyAnalyticsFilters(analyticsState.anomalies);
    analyticsState.filtered = filtered;
    renderAnalyticsStats(filtered);
    renderAnalyticsCharts(filtered);
  }

  function applyAnalyticsFilters(anomalies) {
    if (!Array.isArray(anomalies)) return [];
    const { timeRange, type, severity } = analyticsState.filters;
    const now = Date.now();
    const ranges = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    return anomalies.filter(item => {
      const timestamp = new Date(item.timestamp || item.date || item.created_at || Date.now()).getTime();
      if (!timestamp) return false;
      if (timeRange !== 'all' && now - timestamp > ranges[timeRange]) return false;

      const normalizedType = normalizeType(item.type || 'other');
      if (type !== 'all' && normalizedType !== type) return false;

      const sev = Number(item.severity || item.score || 0);
      if (severity === '1-2' && (sev < 1 || sev > 2)) return false;
      if (severity === '3' && sev !== 3) return false;
      if (severity === '4' && sev !== 4) return false;
      if (severity === '5' && sev !== 5) return false;
      return true;
    });
  }

  // ======== HELPERS ========
  function loadAnomalies() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DATA);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (err) {
      console.warn('Failed to load stored anomalies, using fallback data.', err);
    }
    return buildFallbackAnomalies();
  }

  function restoreFilters() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_STATE);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.filters) {
        analyticsState.filters = { ...analyticsState.filters, ...parsed.filters };
      }
    } catch (err) {
      console.warn('Analytics filters restore failed', err);
    }
  }

  function persistFilters() {
    try {
      localStorage.setItem(
        STORAGE_KEY_STATE,
        JSON.stringify({ filters: analyticsState.filters })
      );
    } catch (err) {
      console.warn('Analytics filters persist failed', err);
    }
  }

  function getOrCreateRoot(id) {
    let node = document.getElementById(id);
    if (!node) {
      node = document.createElement('section');
      node.id = id;
      document.body.appendChild(node);
    }
    node.style.background = THEME.panel;
    node.style.border = `1px solid ${THEME.cyan}33`;
    node.style.borderRadius = '14px';
    node.style.padding = '20px';
    node.style.margin = '20px auto';
    node.style.maxWidth = '1200px';
    node.style.color = '#e8ecff';
    node.style.fontFamily = "'Space Grotesk', 'Inter', system-ui, sans-serif";
    return node;
  }

  function buildDashboardShell(root) {
    root.innerHTML = '';
    const title = document.createElement('div');
    title.innerHTML = `
      <div style="color:${THEME.magenta};text-transform:uppercase;letter-spacing:0.08em;font-size:11px;">The Pattern Archive</div>
      <h2 style="margin:4px 0 12px;font-size:26px;color:${THEME.cyan}">Real-Time Visitor Analytics</h2>
      <p style="opacity:0.7;max-width:720px;">Monitoring anomaly submissions in the archive world with temporal, categorical, and severity-focused perspectives.</p>
    `;
    root.appendChild(title);

    const controls = document.createElement('div');
    const stats = document.createElement('div');
    const charts = document.createElement('div');
    charts.style.display = 'grid';
    charts.style.gridTemplateColumns = 'repeat(auto-fit, minmax(280px, 1fr))';
    charts.style.gap = '16px';
    charts.style.marginTop = '14px';

    root.appendChild(controls);
    root.appendChild(stats);
    root.appendChild(charts);
    return { controls, stats, charts };
  }

  function createCard(title) {
    const card = document.createElement('div');
    card.style.background = 'rgba(7,10,18,0.85)';
    card.style.border = `1px solid ${THEME.cyan}22`;
    card.style.borderRadius = '12px';
    card.style.padding = '12px';
    card.style.boxShadow = '0 10px 30px rgba(0,0,0,0.35)';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '8px';
    header.innerHTML = `
      <span style="color:${THEME.cyan};font-weight:600;">${title}</span>
      <span style="color:${THEME.magenta};font-size:11px;opacity:0.8;">live</span>
    `;
    card.appendChild(header);
    return card;
  }

  function createSelectControl(label, key, options, selectedValue) {
    const wrapper = document.createElement('label');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '6px';
    wrapper.style.background = 'rgba(77,214,255,0.06)';
    wrapper.style.border = `1px solid ${THEME.cyan}33`;
    wrapper.style.borderRadius = '10px';
    wrapper.style.padding = '10px';

    const title = document.createElement('span');
    title.textContent = label;
    title.style.fontSize = '12px';
    title.style.textTransform = 'uppercase';
    title.style.letterSpacing = '0.05em';
    title.style.opacity = '0.8';
    wrapper.appendChild(title);

    const select = document.createElement('select');
    select.style.padding = '8px';
    select.style.borderRadius = '8px';
    select.style.border = `1px solid ${THEME.purple}55`;
    select.style.background = THEME.background;
    select.style.color = '#e8ecff';

    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      select.appendChild(option);
    });

    select.value = selectedValue;

    select.addEventListener('change', () => {
      analyticsState.filters[key] = select.value;
      persistFilters();
      updateAnalytics();
    });

    wrapper.appendChild(select);
    return wrapper;
  }

  function drawFallbackChart(ctx, title, summary = 'Chart.js unavailable') {
    if (!ctx) return;
    ctx.fillStyle = '#0f1324';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = THEME.cyan;
    ctx.font = '16px sans-serif';
    ctx.fillText(title, 12, 24);
    ctx.fillStyle = '#b7c1f8';
    wrapText(ctx, summary, 12, 52, ctx.canvas.width - 24, 18);
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = String(text || '').split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }

  function buildTemporalConfig(anomalies) {
    if (!anomalies.length) return { summary: 'No submissions in this window.' };
    const buckets = {};
    anomalies.forEach(a => {
      const day = new Date(a.timestamp || a.date || a.created_at || Date.now());
      const key = day.toISOString().slice(0, 10);
      buckets[key] = (buckets[key] || 0) + 1;
    });
    const labels = Object.keys(buckets).sort();
    const data = labels.map(l => buckets[l]);
    return {
      summary: `Temporal series: ${labels.length} active day(s).`,
      config: {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Submissions',
              data,
              borderColor: THEME.cyan,
              backgroundColor: `${THEME.cyan}33`,
              tension: 0.25,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { labels: { color: '#d8def8' } } },
          scales: {
            x: { ticks: { color: '#d8def8' }, grid: { color: '#1a1f33' } },
            y: { ticks: { color: '#d8def8' }, grid: { color: '#1a1f33' }, beginAtZero: true }
          }
        }
      }
    };
  }

  function buildTypeConfig(anomalies) {
    if (!anomalies.length) return { summary: 'No data to chart types.' };
    const counts = { incremental: 0, exponential: 0, clockwork: 0, other: 0 };
    anomalies.forEach(a => {
      const t = normalizeType(a.type || 'other');
      counts[t] = (counts[t] || 0) + 1;
    });
    const labels = Object.keys(counts);
    const data = labels.map(l => counts[l]);
    return {
      summary: `Types: ${labels.map(l => `${l} ${counts[l]}`).join(', ')}`,
      config: {
        type: 'doughnut',
        data: {
          labels: labels.map(capitalize),
          datasets: [
            {
              data,
              backgroundColor: [THEME.cyan, THEME.magenta, THEME.purple, '#1a2035'],
              borderColor: '#0f1324',
              borderWidth: 1
            }
          ]
        },
        options: {
          plugins: { legend: { labels: { color: '#d8def8' } } }
        }
      }
    };
  }

  function buildSeverityConfig(anomalies) {
    if (!anomalies.length) return { summary: 'No severity data available.' };
    const buckets = [0, 0, 0, 0, 0];
    anomalies.forEach(a => {
      const sev = Math.min(5, Math.max(1, Number(a.severity || a.score || 0)));
      buckets[sev - 1] += 1;
    });
    return {
      summary: `Severity distribution across 1-5 with ${anomalies.length} points.`,
      config: {
        type: 'bar',
        data: {
          labels: ['1', '2', '3', '4', '5'],
          datasets: [
            {
              label: 'Submissions',
              data: buckets,
              backgroundColor: buckets.map((_, idx) =>
                idx >= 3 ? `${THEME.magenta}aa` : `${THEME.cyan}aa`
              ),
              borderRadius: 6
            }
          ]
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#d8def8' }, grid: { color: '#1a1f33' } },
            y: { ticks: { color: '#d8def8' }, grid: { color: '#1a1f33' }, beginAtZero: true }
          }
        }
      }
    };
  }

  function buildHourlyConfig(anomalies) {
    if (!anomalies.length) return { summary: 'No hourly signals in range.' };
    const hours = new Array(24).fill(0);
    anomalies.forEach(a => {
      const d = new Date(a.timestamp || a.date || a.created_at || Date.now());
      const h = d.getHours();
      hours[h] += 1;
    });
    const max = Math.max(...hours, 1);
    const colors = hours.map(v => {
      const intensity = v / max;
      const mag = Math.floor(40 + intensity * 215).toString(16).padStart(2, '0');
      return `${THEME.purple}${mag}`;
    });

    return {
      summary: `Hourly cadence, peak hour ${hours.indexOf(max)} with ${max} submission(s).`,
      config: {
        type: 'bar',
        data: {
          labels: hours.map((_, i) => `${i}:00`),
          datasets: [
            {
              label: 'Submissions',
              data: hours,
              backgroundColor: colors,
              borderRadius: 4
            }
          ]
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#d8def8', maxRotation: 0 }, grid: { display: false } },
            y: { ticks: { color: '#d8def8' }, grid: { color: '#1a1f33' }, beginAtZero: true }
          }
        }
      }
    };
  }

  function getCollabMetrics() {
    if (typeof Collaboration === 'undefined' || typeof Collaboration.getMetrics !== 'function') return null;
    try {
      return Collaboration.getMetrics();
    } catch (err) {
      console.warn('Unable to read collaboration metrics', err);
      return null;
    }
  }

  function renderRecentDiscussions(container) {
    if (!container) return;
    if (typeof Collaboration === 'undefined' || typeof Collaboration.getRecentDiscussions !== 'function') return;
    const feed = Collaboration.getRecentDiscussions(4) || [];
    const card = createCard('Recent Discussions');
    card.style.marginTop = '10px';

    if (!feed.length) {
      const empty = document.createElement('div');
      empty.style.color = '#b7c1f8';
      empty.style.fontSize = '12px';
      empty.textContent = 'No discussion threads yet. Start collaborating from the timeline.';
      card.appendChild(empty);
      container.appendChild(card);
      return;
    }

    feed.forEach(entry => {
      const row = document.createElement('div');
      row.style.padding = '8px 0';
      row.style.borderBottom = '1px solid rgba(124,108,255,0.15)';
      row.innerHTML = `
        <div style="color:${THEME.cyan};font-weight:600;">${escapeHtml(entry.anomaly?.title || 'Anomaly')}</div>
        <div style="color:#e8ecff;margin:4px 0;">${escapeHtml(entry.message)}</div>
        <div style="color:#b7c1f8;font-size:12px;">${escapeHtml(entry.author || 'Investigator')} · ${formatCollabDate(entry.createdAt)}</div>
      `;
      card.appendChild(row);
    });

    container.appendChild(card);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function formatCollabDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function computeVelocity(anomalies) {
    if (!anomalies.length) return 0;
    const timestamps = anomalies
      .map(a => new Date(a.timestamp || a.date || a.created_at || Date.now()).getTime())
      .filter(Boolean)
      .sort();
    const spanMs = Math.max(1, timestamps[timestamps.length - 1] - timestamps[0]);
    const days = spanMs / (1000 * 60 * 60 * 24);
    return anomalies.length / Math.max(days, 1 / 24);
  }

  function computeEngagement(anomalies) {
    if (!anomalies.length) {
      return { last24h: '0', streak: '0 days' };
    }
    const now = Date.now();
    const last24 = anomalies.filter(a => now - new Date(a.timestamp || a.date || a.created_at || now).getTime() <= 24 * 60 * 60 * 1000).length;

    // Calculate streak of days with submissions ending today
    const days = new Set(
      anomalies.map(a => new Date(a.timestamp || a.date || a.created_at || now).toISOString().slice(0, 10))
    );
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const day = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10);
      if (days.has(day)) {
        streak += 1;
      } else {
        break;
      }
    }
    return { last24h: `${last24} submissions`, streak: `${streak} day${streak === 1 ? '' : 's'}` };
  }

  function normalizeType(type) {
    const key = String(type || '').toLowerCase();
    if (['incremental', 'inc', 'steady'].includes(key)) return 'incremental';
    if (['exponential', 'exp', 'accelerating'].includes(key)) return 'exponential';
    if (['clockwork', 'cyclic', 'periodic'].includes(key)) return 'clockwork';
    return 'other';
  }

  function capitalize(str) {
    return String(str || '').charAt(0).toUpperCase() + String(str || '').slice(1);
  }

  function getMostCommon(list) {
    if (!list.length) return null;
    const counts = {};
    list.forEach(item => {
      counts[item] = (counts[item] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }

  function buildFallbackAnomalies() {
    const now = Date.now();
    const types = ['incremental', 'exponential', 'clockwork', 'other'];
    const list = [];
    for (let i = 0; i < 36; i++) {
      list.push({
        id: `seed-${i}`,
        title: `Synthetic Anomaly ${i + 1}`,
        type: types[i % types.length],
        severity: (i % 5) + 1,
        timestamp: new Date(now - i * 6 * 60 * 60 * 1000 + (i % 3) * 7000).toISOString(),
        description: 'Generated fallback event'
      });
    }
    return list;
  }

  // ======== EXPORTS ========
  window.initAnalyticsDashboard = initAnalyticsDashboard;
  window.renderAnalyticsCharts = renderAnalyticsCharts;
  window.renderAnalyticsControls = renderAnalyticsControls;
  window.renderAnalyticsStats = renderAnalyticsStats;
  window.updateAnalytics = updateAnalytics;
  window.applyAnalyticsFilters = applyAnalyticsFilters;
  window.analyticsState = analyticsState;
})();
