// Portal analytics overlay that feeds CrossWorldNavigation with real-time intelligence,
// health score badges, and hover tooltips for the Pattern Archive cross-world portals.

const DEFAULT_POLL_MS = 12000;
const DEGRADED_LATENCY_MS = 650;
const STATUS_THRESHOLDS = {
  online: 70,
  warning: 60
};

function classifyTrend(delta = 0) {
  if (delta > 2) return 'rising';
  if (delta < -1.5) return 'falling';
  return 'stable';
}

function indicatorFromHealth(score) {
  if (typeof score !== 'number') {
    return { icon: '🟡', state: 'warning', label: 'unknown' };
  }
  if (score >= STATUS_THRESHOLDS.online) return { icon: '🟢', state: 'online', label: 'online' };
  if (score >= STATUS_THRESHOLDS.warning) return { icon: '🟡', state: 'warning', label: 'warning' };
  return { icon: '🔴', state: 'offline', label: 'critical' };
}

function liveAnnouncer(parent = document.body) {
  const el = document.createElement('div');
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'true');
  el.style.position = 'absolute';
  el.style.width = '1px';
  el.style.height = '1px';
  el.style.overflow = 'hidden';
  el.style.clip = 'rect(1px, 1px, 1px, 1px)';
  el.style.clipPath = 'inset(50%)';
  parent.appendChild(el);
  return text => {
    if (!text) return;
    el.textContent = text;
  };
}

function injectBadgeStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('portal-health-overlay-styles')) return;
  const style = document.createElement('style');
  style.id = 'portal-health-overlay-styles';
  style.textContent = `
    .portal-health-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 6;
    }
    .portal-health-badge {
      position: absolute;
      transform: translate(-50%, -50%) scale(0.98);
      padding: 6px 8px;
      border-radius: 10px;
      background: rgba(7, 11, 22, 0.82);
      border: 1px solid rgba(255,255,255,0.08);
      color: #e2e8f0;
      font-size: 13px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
      opacity: 0;
      transition: opacity 0.35s ease, transform 0.2s ease;
      pointer-events: auto;
    }
    .portal-health-badge[data-state="online"] { border-color: rgba(34,197,94,0.5); }
    .portal-health-badge[data-state="warning"] { border-color: rgba(251,191,36,0.5); }
    .portal-health-badge[data-state="offline"] { border-color: rgba(239,68,68,0.55); }
    .portal-health-badge .trend {
      margin-left: 6px;
      opacity: 0.75;
    }
    .portal-health-badge .tooltip {
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translate(-50%, 6px);
      background: rgba(7, 11, 22, 0.9);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 8px;
      padding: 8px 10px;
      color: #cbd5e1;
      font-size: 12px;
      min-width: 200px;
      max-width: 240px;
      line-height: 1.4;
      box-shadow: 0 8px 24px rgba(0,0,0,0.35);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.16s ease;
      white-space: normal;
    }
    .portal-health-badge:hover {
      transform: translate(-50%, -50%) scale(1.04);
      opacity: 1;
    }
    .portal-health-badge:hover .tooltip {
      opacity: 1;
    }
  `;
  document.head.appendChild(style);
}

export class PortalAnalyticsOverlay {
  constructor(options = {}) {
    this.crossNav = options.crossNav || null;
    this.summaryEl = options.summaryEl || null;
    this.listEl = options.listEl || null;
    this.filterButtons = options.filterButtons || [];
    this.filterSelect = options.filterSelect || null;
    this.onUpdate = options.onUpdate || null;

    this.sources = {
      health: options.healthSource || options.healthScoresSource || 'health_scores.json',
      healthApi: options.healthApi || options.healthEndpoint || null,
      connectivity: options.connectivitySource || 'connectivity-test-results.json',
      history: options.historySource || 'world-metrics-timeseries.json',
      unified: options.unifiedEndpoint || '/api/unified',
      fallbackUnified: options.fallbackUnified || 'unified-ecosystem-intelligence.json'
    };
    this.refreshInterval = options.refreshInterval || options.pollInterval || DEFAULT_POLL_MS;

    this.state = { portals: [], summary: null, filter: 'all' };
    this.timer = null;
    this.badgeLayer = null;
    this.badgeMap = new Map();
    this.badgeFrame = null;
    this.announce = options.announce ?? liveAnnouncer(options.announceParent || document.body);
  }

  async init() {
    this.attachFilterControls();
    this.createBadgeLayer();
    await this.refresh();
    this.timer = window.setInterval(() => this.refresh(), this.refreshInterval);
    this.startBadgeLoop();
    return this;
  }

  destroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.badgeFrame) {
      cancelAnimationFrame(this.badgeFrame);
      this.badgeFrame = null;
    }
    if (this.badgeLayer?.parentNode) {
      this.badgeLayer.parentNode.removeChild(this.badgeLayer);
    }
  }

  attachFilterControls() {
    if (this.filterSelect) {
      this.filterSelect.addEventListener('change', evt => this.setFilter(evt.target.value));
    }
    this.filterButtons.forEach(btn => {
      btn.addEventListener('click', () => this.setFilter(btn.dataset.portalFilter || 'all'));
    });
  }

  async refresh() {
    const [health, connectivity, history, unified] = await Promise.all([
      this.fetchHealthScores(),
      this.fetchConnectivity(),
      this.fetchHistory(),
      this.fetchUnifiedPayload()
    ]);

    const portals = this.mergePortals({ health, connectivity, history, unified });
    const summary = this.buildSummary(health, portals, unified);

    this.state = { portals, summary, filter: this.state.filter };
    this.render();
    this.syncBadgeData();
    this.updateCrossNav();

    if (this.onUpdate) {
      this.onUpdate(this.state);
    }

    if (summary) {
      this.announce(
        `Ecosystem health ${summary.healthScore}% with ${summary.onlineCount}/${summary.totalWorlds} worlds online.`
      );
    }
  }

  async fetchUnifiedPayload() {
    const primary = this.sources.unified ? await this.safeFetch(this.sources.unified) : null;
    if (primary) return primary;
    if (this.sources.fallbackUnified) return this.safeFetch(this.sources.fallbackUnified);
    return null;
  }

  async fetchHealthScores() {
    if (this.sources.healthApi) {
      const live = await this.safeFetch(this.sources.healthApi);
      if (live) return live;
    }
    return this.sources.health ? this.safeFetch(this.sources.health) : null;
  }

  async fetchConnectivity() {
    const result = this.sources.connectivity ? await this.safeFetch(this.sources.connectivity) : null;
    if (result?.results) return result;
    // fallback from CrossWorldAPI if available
    if (window.CrossWorldAPI?.getState) {
      const state = window.CrossWorldAPI.getState();
      const worlds = Object.values(state.worlds || {});
      return {
        timestamp: new Date().toISOString(),
        results: worlds.map(world => ({
          id: world.id,
          name: world.name,
          status: world.ok ? 'online' : 'warning',
          response_time: world.latency || world.response_ms || 0,
          url: world.baseUrl || world.homepage || ''
        }))
      };
    }
    return { timestamp: new Date().toISOString(), results: [] };
  }

  async fetchHistory() {
    return this.sources.history ? this.safeFetch(this.sources.history) : null;
  }

  async safeFetch(url) {
    if (!url) return null;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('bad status');
      return res.json();
    } catch (err) {
      console.warn('[portal-analytics-overlay] fetch failed for', url, err);
      return null;
    }
  }

  normalizeHealthMap(healthPayload) {
    const map = new Map();
    if (!healthPayload?.worlds) return map;
    healthPayload.worlds.forEach(world => {
      const snapshots = world.snapshots || [];
      const latest = snapshots[snapshots.length - 1] || {};
      const prev = snapshots[snapshots.length - 2] || null;
      const latestScore = latest.scores?.composite ?? world.latest_composite ?? null;
      const prevScore = prev?.scores?.composite ?? null;
      const velocity = typeof latestScore === 'number' && typeof prevScore === 'number' ? latestScore - prevScore : 0;
      map.set(world.world_id || world.id || world.name, {
        id: world.world_id || world.id || world.name,
        name: world.name || world.world_id || 'Unknown world',
        latestScore,
        prevScore,
        velocity,
        growth: latest.scores?.growth ?? null,
        connectivity: latest.scores?.connectivity ?? null,
        performance: latest.scores?.performance ?? null,
        snapshots,
        url: world.homepage || world.baseUrl || ''
      });
    });
    return map;
  }

  computeGrowthTrends(history) {
    const trends = {};
    if (!Array.isArray(history)) return trends;
    const byWorld = new Map();
    history.slice(-6).forEach(entry => {
      (entry.worlds || []).forEach(world => {
        if (!byWorld.has(world.id)) byWorld.set(world.id, []);
        byWorld.get(world.id).push({
          ts: new Date(entry.timestamp || Date.now()).getTime(),
          size: world.content?.content_size || 0
        });
      });
    });
    byWorld.forEach((points, id) => {
      if (points.length < 2) return;
      const sorted = points.sort((a, b) => a.ts - b.ts);
      const latest = sorted[sorted.length - 1];
      const prev = sorted[sorted.length - 2];
      const delta = latest.size - prev.size;
      trends[id] = { delta, trend: classifyTrend(delta), velocity: delta };
    });
    return trends;
  }

  computeTrendsFromHealth(healthMap) {
    const trends = new Map();
    healthMap.forEach((entry, id) => {
      const trend = classifyTrend(entry.velocity || 0);
      trends.set(id, { trend, velocity: entry.velocity || 0 });
    });
    return trends;
  }

  mergePortals(payloads = {}) {
    const { health, connectivity, history, unified } = payloads;
    const healthMap = this.normalizeHealthMap(health);
    const connectivityMap = new Map();
    (connectivity?.results || []).forEach(entry => connectivityMap.set(entry.id, entry));
    const trendsFromHealth = this.computeTrendsFromHealth(healthMap);
    const fallbackTrends = this.computeGrowthTrends(history);

    const portalIds = new Set([
      ...Array.from(healthMap.keys()),
      ...Array.from(connectivityMap.keys()),
      ...(this.crossNav?.portals?.map(p => p.id) || [])
    ]);

    const portals = [];
    portalIds.forEach(id => {
      const base = this.crossNav?.portals?.find(p => p.id === id) || {};
      const healthEntry = healthMap.get(id);
      const conn = connectivityMap.get(id);
      const trendEntry = trendsFromHealth.get(id) || fallbackTrends[id] || { trend: 'stable', velocity: 0 };
      const response = conn?.response_time ?? conn?.response_ms ?? base.latency ?? null;
      const healthScore = healthEntry?.latestScore ?? this.estimateHealth(conn?.status, response);
      const indicator = indicatorFromHealth(healthScore);
      const connectivityState =
        conn?.status ||
        (indicator.state === 'offline' ? 'offline' : indicator.state === 'warning' ? 'warning' : 'online');
      const alert =
        connectivityState === 'offline' || response > DEGRADED_LATENCY_MS || indicator.state === 'offline'
          ? 'degraded'
          : conn?.status === 'warning'
            ? 'warning'
            : null;
      const name = base.name || healthEntry?.name || conn?.name || id;
      const tooltip = this.composeTooltip({
        name,
        healthScore,
        response,
        trend: trendEntry.trend,
        growthVelocity: trendEntry.velocity,
        connectivity: connectivityState,
        performance: healthEntry?.performance
      });

      portals.push({
        id,
        name,
        url: base.homepage || base.url || conn?.url || healthEntry?.url || '',
        status: connectivityState,
        connectivity: connectivityState,
        responseTime: response,
        latency: response,
        trend: trendEntry.trend,
        growthVelocity: trendEntry.velocity,
        growthDelta: trendEntry.velocity,
        healthScore,
        indicator: indicator.icon,
        indicatorState: indicator.state,
        tooltip,
        alert,
        analyticsSource:
          health?.generated_at || connectivity?.timestamp || unified?.generated_at || new Date().toISOString(),
        unifiedHealth: unified?.health?.latest || null
      });
    });

    return portals.sort((a, b) => (b.healthScore || 0) - (a.healthScore || 0));
  }

  estimateHealth(status, responseTime) {
    if (status === 'offline') return 0;
    if (status === 'warning' || status === 'degraded') return 55;
    if (typeof responseTime !== 'number') return 70;
    const bounded = Math.max(50, Math.min(1200, responseTime));
    return Math.round(100 - bounded / 12);
  }

  buildSummary(healthPayload, portals, unified) {
    if (!healthPayload && !portals.length) return null;
    const total = portals.length || 0;
    const online = portals.filter(p => p.status !== 'offline').length;
    const degraded = portals.filter(p => p.alert === 'degraded').length;
    const composite =
      healthPayload?.ecosystem?.snapshots?.slice(-1)[0]?.scores?.composite ??
      unified?.health?.composite ??
      (online / Math.max(total, 1)) * 100;
    return {
      healthScore: Math.round(composite),
      totalWorlds: total,
      onlineCount: online,
      degradedCount: degraded,
      generatedAt: healthPayload?.generated_at || unified?.generated_at || new Date().toISOString(),
      latest: healthPayload?.ecosystem?.snapshots?.slice(-1)[0]?.scores || unified?.health?.latest || null
    };
  }

  setFilter(filter = 'all') {
    this.state.filter = filter;
    if (this.crossNav?.setPortalFilter) {
      this.crossNav.setPortalFilter(filter);
    }
    this.filterButtons.forEach(btn => {
      btn.classList.toggle('active', (btn.dataset.portalFilter || 'all') === filter);
    });
    if (this.filterSelect) {
      this.filterSelect.value = filter;
    }
    this.render();
  }

  getFilteredPortals() {
    if (!this.state.filter || this.state.filter === 'all') return this.state.portals;
    return this.state.portals.filter(p => {
      if (this.state.filter === 'healthy') return p.status === 'online' || p.status === 'healthy';
      if (this.state.filter === 'warning') return p.alert === 'degraded' || p.status === 'warning';
      if (this.state.filter === 'offline') return p.status === 'offline';
      return true;
    });
  }

  render() {
    this.renderSummary();
    this.renderList();
  }

  renderSummary() {
    if (!this.summaryEl || !this.state.summary) return;
    const { healthScore, onlineCount, totalWorlds, degradedCount, latest } = this.state.summary;
    const parts = [];
    const indicator = indicatorFromHealth(healthScore);
    parts.push(`${indicator.icon} Composite health ${Math.round(healthScore)}%`);
    parts.push(`${onlineCount}/${totalWorlds} online`);
    if (degradedCount) parts.push(`${degradedCount} degraded`);
    if (latest?.connectivity) parts.push(`connectivity ${latest.connectivity.toFixed?.(0) ?? latest.connectivity}%`);
    if (latest?.performance) parts.push(`performance ${latest.performance.toFixed?.(0) ?? latest.performance}%`);
    this.summaryEl.textContent = parts.join(' • ');
  }

  renderList() {
    if (!this.listEl) return;
    this.listEl.innerHTML = '';
    const list = this.getFilteredPortals();
    list.forEach(portal => {
      const item = document.createElement('div');
      item.className = 'portal-analytics-row';
      item.dataset.state = portal.status;
      const trendIcon = portal.trend === 'rising' ? '📈' : portal.trend === 'falling' ? '📉' : '📊';
      const indicator = portal.indicator || indicatorFromHealth(portal.healthScore).icon;
      const responseText = typeof portal.responseTime === 'number' ? `${Math.round(portal.responseTime)}ms` : 'n/a';
      const healthText = typeof portal.healthScore === 'number' ? `${Math.round(portal.healthScore)}%` : 'n/a';
      item.innerHTML = `
        <div class="row-main">
          <div class="row-title">${indicator} ${portal.name}</div>
          <div class="row-meta" title="${portal.tooltip || ''}">
            ${portal.status || 'unknown'} • ${trendIcon} ${portal.trend || 'stable'} • ${responseText} • health ${healthText}
          </div>
        </div>
        <div class="row-actions">
          <span class="row-badge ${portal.status === 'offline' ? 'bad' : portal.alert || portal.status === 'warning' ? 'warn' : 'ok'}">${indicator} ${portal.status || 'unknown'}</span>
          <button class="row-link" data-url="${portal.url || '#'}" data-tooltip="Open ${portal.name}">Open</button>
          <button class="row-link" data-detail="${portal.id}" data-tooltip="Jump to detailed analytics">Analytics</button>
        </div>
      `;
      item.querySelectorAll('.row-link').forEach(btn => {
        const tooltip = btn.dataset.tooltip;
        if (tooltip) btn.title = tooltip;
        btn.addEventListener('click', () => {
          const url = btn.dataset.url;
          const detail = btn.dataset.detail;
          if (url && url !== '#') {
            window.open(url, '_blank', 'noopener,noreferrer');
          } else if (detail) {
            window.location.href = `portal-status-dashboard.html#${detail}`;
          }
        });
      });
      this.listEl.appendChild(item);
    });
  }

  composeTooltip({ name, healthScore, response, trend, growthVelocity, connectivity, performance }) {
    const parts = [];
    if (typeof healthScore === 'number') parts.push(`Health ${Math.round(healthScore)}%`);
    if (typeof response === 'number') parts.push(`Response ${Math.round(response)}ms`);
    if (typeof growthVelocity === 'number') parts.push(`Δ ${growthVelocity.toFixed(1)} growth`);
    if (trend) parts.push(`Trend ${trend}`);
    if (performance) parts.push(`Perf ${Math.round(performance)}%`);
    if (connectivity) parts.push(`Connectivity ${connectivity}`);
    const summary = parts.join(' • ') || 'No live metrics available';
    return `${name || 'Portal'}: ${summary}`;
  }

  createBadgeLayer() {
    if (typeof document === 'undefined') return;
    injectBadgeStyles();
    const host = document.querySelector('.world-shell') || document.body;
    this.badgeLayer = document.createElement('div');
    this.badgeLayer.className = 'portal-health-layer';
    host.appendChild(this.badgeLayer);
  }

  syncBadgeData() {
    if (!this.badgeLayer) return;
    const portals = this.getFilteredPortals();
    const alive = new Set();
    portals.forEach(portal => {
      alive.add(portal.id);
      let badge = this.badgeMap.get(portal.id);
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'portal-health-badge';
        badge.dataset.portalId = portal.id;
        this.badgeLayer.appendChild(badge);
        this.badgeMap.set(portal.id, badge);
      }
      const indicator = portal.indicator || indicatorFromHealth(portal.healthScore).icon;
      const trendIcon = portal.trend === 'rising' ? '📈' : portal.trend === 'falling' ? '📉' : '📊';
      badge.dataset.state = portal.indicatorState || portal.status || 'warning';
      badge.innerHTML = `
        <span class="indicator">${indicator}</span>
        <span class="trend">${trendIcon}</span>
        <div class="tooltip">${portal.tooltip || 'No live metrics available'}</div>
      `;
      badge.title = portal.tooltip || '';
      badge.style.opacity = 0.9;
    });

    Array.from(this.badgeMap.keys()).forEach(id => {
      if (!alive.has(id)) {
        const badge = this.badgeMap.get(id);
        badge?.remove();
        this.badgeMap.delete(id);
      }
    });
  }

  startBadgeLoop() {
    const step = () => {
      this.positionBadges();
      this.badgeFrame = requestAnimationFrame(step);
    };
    this.badgeFrame = requestAnimationFrame(step);
  }

  positionBadges() {
    if (!this.badgeLayer || !this.crossNav?.navigation?.camera || !this.crossNav?.renderer) return;
    const camera = this.crossNav.navigation.camera;
    const displayWidth = this.crossNav.renderer.displayWidth || this.crossNav.canvas?.clientWidth || 0;
    const displayHeight = this.crossNav.renderer.displayHeight || this.crossNav.canvas?.clientHeight || 0;
    const portals = this.crossNav.getFilteredPortals ? this.crossNav.getFilteredPortals() : this.getFilteredPortals();
    portals.forEach(portal => {
      const badge = this.badgeMap.get(portal.id);
      if (!badge || !portal.position) return;
      const screen = this.crossNav.projectToScreen
        ? this.crossNav.projectToScreen(portal.position, camera, displayWidth, displayHeight)
        : null;
      if (!screen) return;
      badge.style.left = `${screen.x}px`;
      badge.style.top = `${screen.y}px`;
      badge.style.opacity = 0.88;
    });
  }

  updateCrossNav() {
    if (this.crossNav?.applyPortalAnalytics) {
      this.crossNav.applyPortalAnalytics(this.state);
    }
  }
}

if (typeof window !== 'undefined') {
  window.PortalAnalyticsOverlay = PortalAnalyticsOverlay;
}
