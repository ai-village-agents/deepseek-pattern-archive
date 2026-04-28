import { WORLD_DIMENSIONS } from './world-zones.js';

const BOOKMARK_KEY = 'cross-world-nexus-bookmarks';
const PORTAL_STYLE_KEY = 'cross-world-portal-styles';
const HEALTH_POLL_INTERVAL = 20000;

const TYPE_COLORS = {
  'explorable-world': '#7dd3fc',
  observatory: '#f97316',
  'signal-mapping': '#22d3ee',
  'pattern-analysis': '#4ade80',
  unknown: '#f472b6'
};

const PORTAL_THEMES = {
  aurora: { glow: '#f472b6', rim: '#fb7185' },
  crystal: { glow: '#a5b4fc', rim: '#c7d2fe' },
  neon: { glow: '#22d3ee', rim: '#67e8f9' },
  ember: { glow: '#f97316', rim: '#fdba74' }
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export class CrossWorldNavigation {
  constructor(options = {}) {
    this.canvas = options.canvas;
    this.renderer = options.renderer;
    this.navigation = options.navigation;
    this.interactions = options.interactions;
    this.particleEffects = options.particleEffects;
    this.audio = options.audio || null;
    this.crossWorldAPI = options.crossWorldAPI || (typeof window !== 'undefined' ? window.CrossWorldAPI : null);
    this.zoneId = options.zoneId || 'cross-world-nexus';
    this.zones = options.zones || [];
    this.homePosition =
      options.homePosition || { x: WORLD_DIMENSIONS.width / 2, y: WORLD_DIMENSIONS.height / 2, zoom: 0.9 };
    this.zone = this.zones.find(z => z.id === this.zoneId) || null;
    this.crossWorldData = options.crossWorldData || this.zone?.liveData?.crossWorld || null;

    this.portals = [];
    this.bookmarks = this.loadBookmarks();
    this.portalStyles = this.loadPortalStyles();
    this.feed = [];
    this.hoverPortal = null;
    this.active = false;
    this.healthTimer = 0;
    this.teleport = null;
    this.overlay = null;
  }

  async init() {
    this.zone = this.zones.find(z => z.id === this.zoneId) || this.zone;
    await this.refreshWorlds();
    this.feed = this.buildActivityFeed(this.crossWorldData?.patterns || []);
    this.createOverlay();
    this.attachListeners();
    return this;
  }

  async refreshWorlds() {
    const worlds = await this.loadWorlds();
    this.portals = this.buildPortals(worlds);
  }

  async loadWorlds() {
    if (this.crossWorldAPI?.getState) {
      const state = this.crossWorldAPI.getState() || {};
      const map = state.worlds || {};
      const worlds = Object.values(map);
      if (!this.crossWorldData) {
        this.crossWorldData = state;
      }
      return worlds;
    }
    return this.crossWorldData?.worlds || [];
  }

  buildPortals(worlds = []) {
    if (!worlds.length) {
      return [
        {
          id: 'placeholder',
          name: 'Awaiting connections',
          description: 'No connected agent worlds yet.',
          type: 'unknown',
          baseUrl: '',
          homepage: ''
        }
      ];
    }
    const center = this.zone?.position || { x: WORLD_DIMENSIONS.width * 0.85, y: WORLD_DIMENSIONS.height * 0.82 };
    const radius = (this.zone?.radius || 220) * 0.78;
    const slice = Math.max(worlds.length, 3);
    return worlds.map((world, idx) => {
      const id = world.id || `world-${idx}`;
      const angle = (Math.PI * 2 * idx) / slice - Math.PI / 2;
      const pos = {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius * 0.7
      };
      const color = this.getPortalColor(world.type);
      return {
        id,
        name: world.name || world.id || 'Unknown world',
        description: world.description || 'Cross-world agent',
        type: world.type || 'unknown',
        baseUrl: world.baseUrl || '',
        homepage: world.homepage || world.baseUrl || '',
        status: 'unknown',
        latency: null,
        lastHealth: null,
        color,
        rim: this.getPortalRim(world.type),
        bookmarked: this.bookmarks.has(id),
        angle,
        position: pos
      };
    });
  }

  attachListeners() {
    if (this.interactions?.on) {
      this.interactions.on('zonechange', payload => this.onZoneChange(payload));
    }
    if (this.canvas) {
      this.canvas.addEventListener('mousemove', e => this.onPointerMove(e));
      this.canvas.addEventListener('click', e => this.onClick(e));
      this.canvas.addEventListener('touchstart', e => this.onTouch(e), { passive: true });
    }
    if (this.overlay?.visitBtn) {
      this.overlay.visitBtn.addEventListener('click', () => this.visitActivePortal());
      this.overlay.bookmarkBtn.addEventListener('click', () => this.toggleBookmark(this.hoverPortal));
      this.overlay.returnBtn.addEventListener('click', () => this.startReturn());
      this.overlay.refreshBtn.addEventListener('click', () => this.runHealthChecks(true));
    }
    if (this.overlay?.appearanceRows) {
      this.overlay.appearanceRows.forEach(row => {
        row.querySelector('input')?.addEventListener('input', e => {
          const type = row.dataset.type;
          const value = e.target.value;
          this.portalStyles[type] = value;
          this.persistPortalStyles();
          this.portals = this.portals.map(p =>
            p.type === type ? { ...p, color: value, rim: this.getPortalRim(p.type) } : p
          );
        });
      });
    }
  }

  onZoneChange(payload) {
    const isNexus = payload?.zone?.id === this.zoneId;
    this.active = isNexus;
    if (isNexus && payload?.data?.crossWorld) {
      this.crossWorldData = payload.data.crossWorld;
      this.feed = this.buildActivityFeed(payload.data.crossWorld.patterns || []);
      if (!this.portals.length) {
        this.refreshWorlds();
      }
      this.runHealthChecks(false);
      this.renderOverlay();
    } else if (!isNexus) {
      this.hoverPortal = null;
      this.renderOverlay();
    }
  }

  update({ camera, activeZone, dt = 0 }) {
    if (!camera || !this.renderer?.ctx) return;
    const isActive = activeZone?.id === this.zoneId || this.active;
    this.active = isActive;

    this.healthTimer += dt * 1000;
    if (isActive && this.healthTimer > HEALTH_POLL_INTERVAL) {
      this.runHealthChecks();
      this.healthTimer = 0;
    }

    this.stepTeleport(camera);
    if (isActive && this.portals.length) {
      this.drawPortalLayer(camera);
    }
    if (this.particleEffects?.update && this.particleEffects?.render) {
      this.particleEffects.update(dt);
      this.particleEffects.render(camera, this.renderer.displayWidth, this.renderer.displayHeight);
    }
  }

  drawPortalLayer(camera) {
    const ctx = this.renderer.ctx;
    const displayWidth = this.renderer.displayWidth || this.canvas?.clientWidth || 0;
    const displayHeight = this.renderer.displayHeight || this.canvas?.clientHeight || 0;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';

    this.portals.forEach(portal => {
      const screen = this.projectToScreen(portal.position, camera, displayWidth, displayHeight);
      const baseSize = 18;
      const pulse = 1 + Math.sin(performance.now() / 260 + portal.angle) * 0.08;
      const hovered = this.hoverPortal?.id === portal.id;
      const statusGood = portal.status === 'healthy' || portal.status === true;
      const glow = hovered ? 1 : statusGood ? 0.7 : 0.35;

      // outer glow
      const gradient = ctx.createRadialGradient(screen.x, screen.y, 4, screen.x, screen.y, baseSize * 2.2);
      gradient.addColorStop(0, `${portal.color || '#f472b6'}`);
      gradient.addColorStop(1, `${portal.color || '#f472b6'}00`);
      ctx.globalAlpha = 0.55 * glow;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, baseSize * 2.1 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // rim
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = hovered ? 3.2 : 2.2;
      ctx.strokeStyle = portal.rim || portal.color || '#fce7f3';
      ctx.beginPath();
      ctx.ellipse(screen.x, screen.y, baseSize * 1.1 * pulse, baseSize * 0.72 * pulse, 0, 0, Math.PI * 2);
      ctx.stroke();

      // status notch
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = statusGood ? '#a7f3d0' : '#fca5a5';
      ctx.beginPath();
      ctx.arc(screen.x + baseSize * 0.9, screen.y - baseSize * 0.35, 4 + (hovered ? 2 : 0), 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  onPointerMove(e) {
    if (!this.active) return;
    const worldPos = this.screenToWorld(e.clientX, e.clientY);
    const portal = this.findPortalAt(worldPos);
    if (portal?.id !== this.hoverPortal?.id) {
      this.hoverPortal = portal;
      if (portal && this.particleEffects?.spawnBurst) {
        this.particleEffects.spawnBurst(portal.position.x, portal.position.y, portal.color || '#f472b6', 4);
      }
      this.renderOverlay();
    }
  }

  onClick(e) {
    if (!this.active) return;
    const worldPos = this.screenToWorld(e.clientX, e.clientY);
    const portal = this.findPortalAt(worldPos);
    if (portal) {
      this.hoverPortal = portal;
      this.visitActivePortal();
      e.stopPropagation();
    }
  }

  onTouch(e) {
    if (!this.active || !e.touches?.length) return;
    const touch = e.touches[0];
    const worldPos = this.screenToWorld(touch.clientX, touch.clientY);
    const portal = this.findPortalAt(worldPos);
    if (portal) {
      this.hoverPortal = portal;
      this.visitActivePortal();
    }
  }

  visitActivePortal() {
    const portal = this.hoverPortal || this.portals[0];
    if (!portal) return;
    this.startTeleport(portal);
    this.toggleBookmark(portal, true);
  }

  startTeleport(portal, options = {}) {
    if (!this.navigation?.camera) return;
    const camera = this.navigation.camera;
    if (this.navigation.velocity) {
      this.navigation.velocity.x = 0;
      this.navigation.velocity.y = 0;
    }
    const zoomTarget = options.zoom || 1.25;
    this.teleport = {
      portal,
      start: performance.now(),
      duration: 900,
      from: { x: camera.x, y: camera.y, zoom: camera.zoom },
      to: { x: portal.position.x, y: portal.position.y, zoom: zoomTarget },
      launched: false
    };
    if (this.audio?.playPortalCharge) {
      this.audio.playPortalCharge(portal);
    }
    if (this.overlay?.status) {
      this.overlay.status.textContent = `Teleporting to ${portal.name}`;
    }
  }

  startReturn() {
    const portal = {
      position: { x: this.homePosition.x, y: this.homePosition.y },
      name: 'Pattern Archive',
      color: '#22d3ee'
    };
    this.startTeleport(portal, { zoom: this.homePosition.zoom || 0.9 });
  }

  stepTeleport(camera) {
    if (!this.teleport) return;
    const now = performance.now();
    const t = clamp((now - this.teleport.start) / this.teleport.duration, 0, 1);
    const eased = easeInOut(t);
    camera.x = lerp(this.teleport.from.x, this.teleport.to.x, eased);
    camera.y = lerp(this.teleport.from.y, this.teleport.to.y, eased);
    camera.zoom = lerp(this.teleport.from.zoom, this.teleport.to.zoom, eased);

    if (t >= 1 && !this.teleport.launched) {
      this.teleport.launched = true;
      if (this.particleEffects?.spawnBurst) {
        this.particleEffects.spawnBurst(this.teleport.to.x, this.teleport.to.y, this.teleport.portal?.color || '#f472b6', 20);
      }
      if (this.audio?.playPortalArrival) {
        this.audio.playPortalArrival(this.teleport.portal);
      }
      this.openPortal(this.teleport.portal);
      setTimeout(() => {
        this.teleport = null;
        this.renderOverlay();
      }, 220);
    }
  }

  openPortal(portal) {
    if (!portal) return;
    const target = portal.homepage || portal.baseUrl;
    if (!target) return;
    try {
      window.open(target, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.warn('Unable to open portal', err);
    }
  }

  findPortalAt(worldPos) {
    if (!worldPos) return null;
    const radius = (this.zone?.radius || 220) * 0.35;
    const portal = this.portals.find(p => Math.hypot(worldPos.x - p.position.x, worldPos.y - p.position.y) < radius);
    return portal || null;
  }

  screenToWorld(clientX, clientY) {
    if (!this.canvas || !this.navigation?.camera) return null;
    const rect = this.canvas.getBoundingClientRect();
    const camera = this.navigation.camera;
    const displayWidth = this.renderer?.displayWidth || rect.width;
    const displayHeight = this.renderer?.displayHeight || rect.height;
    const x = (clientX - rect.left - displayWidth / 2) / camera.zoom + camera.x;
    const y = (clientY - rect.top - displayHeight / 2) / camera.zoom + camera.y;
    return { x, y };
  }

  projectToScreen(pos, camera, displayWidth, displayHeight) {
    return {
      x: (pos.x - camera.x) * camera.zoom + displayWidth / 2,
      y: (pos.y - camera.y) * camera.zoom + displayHeight / 2
    };
  }

  async runHealthChecks(force = false) {
    if (!this.crossWorldAPI?.pingWorld || !this.portals.length) return;
    const now = Date.now();
    const tasks = this.portals.map(async portal => {
      if (!force && portal.lastHealth && now - portal.lastHealth < HEALTH_POLL_INTERVAL) {
        return portal;
      }
      const result = await this.crossWorldAPI.pingWorld(portal.id).catch(() => null);
      if (!result) return portal;
      portal.status = result.ok ? 'healthy' : 'degraded';
      portal.latency = result.latency;
      portal.message = result.message || '';
      portal.lastHealth = Date.now();
      return portal;
    });
    await Promise.all(tasks);
    this.renderOverlay();
  }

  toggleBookmark(portal, silent = false) {
    if (!portal?.id) return;
    if (this.bookmarks.has(portal.id) && !silent) {
      this.bookmarks.delete(portal.id);
    } else {
      this.bookmarks.add(portal.id);
    }
    this.persistBookmarks();
    this.portals = this.portals.map(p =>
      p.id === portal.id ? { ...p, bookmarked: this.bookmarks.has(portal.id) } : p
    );
    this.renderOverlay();
  }

  loadBookmarks() {
    try {
      const raw = localStorage.getItem(BOOKMARK_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) return new Set(list);
      }
    } catch (err) {
      console.warn('Failed to load bookmarks', err);
    }
    return new Set();
  }

  persistBookmarks() {
    try {
      localStorage.setItem(BOOKMARK_KEY, JSON.stringify(Array.from(this.bookmarks)));
    } catch (err) {
      console.warn('Failed to persist bookmarks', err);
    }
  }

  loadPortalStyles() {
    try {
      const raw = localStorage.getItem(PORTAL_STYLE_KEY);
      if (raw) return JSON.parse(raw) || {};
    } catch (err) {
      console.warn('Failed to load portal styles', err);
    }
    return {};
  }

  persistPortalStyles() {
    try {
      localStorage.setItem(PORTAL_STYLE_KEY, JSON.stringify(this.portalStyles));
    } catch (err) {
      console.warn('Failed to persist portal styles', err);
    }
  }

  getPortalColor(type = 'unknown') {
    return this.portalStyles[type] || TYPE_COLORS[type] || TYPE_COLORS.unknown;
  }

  getPortalRim(type = 'unknown') {
    const entries = Object.entries(PORTAL_THEMES);
    const theme = entries[(type.length + entries.length) % entries.length][1];
    return theme.rim || this.getPortalColor(type);
  }

  createOverlay() {
    if (typeof document === 'undefined') return;
    const host = document.querySelector('.world-shell') || document.body;
    this.injectStyles();
    const container = document.createElement('div');
    container.className = 'crossworld-nav-overlay';
    container.innerHTML = `
      <div class="crossworld-nav-header">
        <div>
          <div class="label">Cross-world nexus</div>
          <div class="title">Portal navigation</div>
        </div>
        <button class="pill-btn" data-action="refresh">Ping</button>
      </div>
      <div class="crossworld-status" data-role="status">Hover a portal to view status.</div>
      <div class="crossworld-portal-detail">
        <div class="portal-name" data-role="portal-name">No portal selected</div>
        <div class="portal-meta" data-role="portal-meta"></div>
        <div class="portal-actions">
          <button data-action="visit">Visit world</button>
          <button data-action="bookmark">Bookmark</button>
          <button data-action="return">Return to archive</button>
        </div>
      </div>
      <div class="bookmark-row" data-role="bookmark-row"></div>
      <div class="appearance-panel">
        <div class="label">Portal appearance by world type</div>
        <div class="appearance-rows"></div>
      </div>
      <div class="feed">
        <div class="label">Cross-world activity</div>
        <div class="feed-list" data-role="feed"></div>
      </div>
    `;
    host.appendChild(container);

    const appearanceRows = [];
    const types = Array.from(new Set((this.portals || []).map(p => p.type || 'unknown')));
    const appearanceHost = container.querySelector('.appearance-rows');
    types.forEach(type => {
      const row = document.createElement('div');
      row.className = 'appearance-row';
      row.dataset.type = type;
      row.innerHTML = `
        <span class="type">${type}</span>
        <input type="color" value="${this.getPortalColor(type)}" aria-label="Portal color for ${type}">
      `;
      appearanceHost.appendChild(row);
      appearanceRows.push(row);
    });

    this.overlay = {
      container,
      status: container.querySelector('[data-role="status"]'),
      portalName: container.querySelector('[data-role="portal-name"]'),
      portalMeta: container.querySelector('[data-role="portal-meta"]'),
      feed: container.querySelector('[data-role="feed"]'),
      bookmarkRow: container.querySelector('[data-role="bookmark-row"]'),
      visitBtn: container.querySelector('[data-action="visit"]'),
      bookmarkBtn: container.querySelector('[data-action="bookmark"]'),
      returnBtn: container.querySelector('[data-action="return"]'),
      refreshBtn: container.querySelector('[data-action="refresh"]'),
      appearanceRows
    };

    this.renderOverlay();
  }

  renderOverlay() {
    if (!this.overlay) return;
    const portal = this.hoverPortal;
    if (portal) {
      this.overlay.portalName.textContent = portal.name;
      const latency = portal.latency ? `${portal.latency.toFixed(0)}ms` : 'n/a';
      this.overlay.portalMeta.textContent = `${portal.type} • ${portal.status || 'unknown'} • latency ${latency}`;
      this.overlay.status.textContent = portal.description || 'Portal ready';
    } else {
      this.overlay.portalName.textContent = 'No portal selected';
      this.overlay.portalMeta.textContent = 'Hover to inspect portal health and open teleportation';
      this.overlay.status.textContent = 'Hover a portal to view status.';
    }

    this.overlay.visitBtn.disabled = !portal;
    this.overlay.bookmarkBtn.disabled = !portal;

    // bookmarks
    if (this.overlay.bookmarkRow) {
      this.overlay.bookmarkRow.innerHTML = '';
      this.portals
        .filter(p => this.bookmarks.has(p.id))
        .forEach(p => {
          const pill = document.createElement('button');
          pill.className = 'bookmark-pill';
          pill.textContent = p.name;
          pill.title = 'Teleport to ' + p.name;
          pill.addEventListener('click', () => {
            this.hoverPortal = p;
            this.visitActivePortal();
          });
          this.overlay.bookmarkRow.appendChild(pill);
        });
    }

    // feed
    if (this.overlay.feed) {
      this.overlay.feed.innerHTML = '';
      const items = this.feed.length ? this.feed : [{ world: 'archive', signal: 'Awaiting signals', ts: null }];
      items.slice(0, 8).forEach(item => {
        const row = document.createElement('div');
        row.className = 'feed-item';
        const time = item.ts ? new Date(item.ts).toLocaleTimeString() : '—';
        row.innerHTML = `
          <div class="feed-world">${item.world}</div>
          <div class="feed-body">${item.signal || item.summary || 'New pattern detected'}</div>
          <div class="feed-time">${time}</div>
        `;
        this.overlay.feed.appendChild(row);
      });
    }
  }

  buildActivityFeed(patterns = []) {
    return patterns
      .slice()
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
      .slice(0, 12)
      .map(p => ({
        world: p.world || p.agent || 'unknown',
        signal: p.signal || p.summary || p.type || 'pattern',
        ts: p.timestamp || p.date || Date.now()
      }));
  }

  injectStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('crossworld-nav-style')) return;
    const style = document.createElement('style');
    style.id = 'crossworld-nav-style';
    style.textContent = `
      .crossworld-nav-overlay {
        position: absolute;
        left: 16px;
        bottom: 16px;
        width: min(360px, 90vw);
        background: rgba(9, 12, 26, 0.86);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 12px;
        padding: 12px;
        color: #e2e8f0;
        backdrop-filter: blur(12px);
        box-shadow: 0 12px 40px rgba(15, 23, 42, 0.3);
        pointer-events: auto;
        z-index: 8;
      }
      .crossworld-nav-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 6px;
      }
      .crossworld-nav-overlay .label {
        color: #94a3b8;
        font-size: 12px;
        letter-spacing: 0.3px;
      }
      .crossworld-nav-overlay .title {
        font-size: 15px;
        font-weight: 600;
      }
      .crossworld-status {
        font-size: 12px;
        color: #94a3b8;
        background: rgba(255,255,255,0.04);
        border: 1px dashed rgba(255,255,255,0.08);
        padding: 8px;
        border-radius: 10px;
        margin-bottom: 8px;
      }
      .crossworld-portal-detail {
        background: rgba(34, 211, 238, 0.05);
        border: 1px solid rgba(34, 211, 238, 0.16);
        padding: 10px;
        border-radius: 10px;
        margin-bottom: 8px;
      }
      .crossworld-portal-detail .portal-name {
        font-weight: 600;
        margin-bottom: 4px;
      }
      .crossworld-portal-detail .portal-meta {
        font-size: 12px;
        color: #a5f3fc;
        margin-bottom: 8px;
      }
      .portal-actions {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .portal-actions button,
      .pill-btn {
        background: linear-gradient(120deg, #22d3ee, #3b82f6);
        border: none;
        color: #0b1226;
        border-radius: 8px;
        padding: 8px 10px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 10px 30px rgba(34, 211, 238, 0.25);
      }
      .portal-actions button[disabled] {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .pill-btn {
        background: rgba(255,255,255,0.08);
        color: #e2e8f0;
        box-shadow: none;
      }
      .bookmark-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 8px;
      }
      .bookmark-pill {
        background: rgba(244, 114, 182, 0.1);
        border: 1px solid rgba(244, 114, 182, 0.4);
        color: #f472b6;
        border-radius: 999px;
        padding: 6px 10px;
        cursor: pointer;
      }
      .appearance-panel {
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 10px;
        padding: 8px;
        margin-bottom: 8px;
      }
      .appearance-rows {
        display: grid;
        gap: 6px;
      }
      .appearance-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(255,255,255,0.04);
        padding: 6px 8px;
        border-radius: 8px;
      }
      .appearance-row .type {
        font-size: 12px;
        color: #cbd5e1;
      }
      .appearance-row input {
        width: 64px;
        height: 26px;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 6px;
        background: #0b1226;
      }
      .feed .feed-item {
        display: grid;
        grid-template-columns: 1fr;
        gap: 2px;
        padding: 6px 0;
        border-bottom: 1px solid rgba(255,255,255,0.06);
      }
      .feed .feed-item:last-child {
        border-bottom: none;
      }
      .feed-world {
        color: #f472b6;
        font-weight: 600;
        font-size: 12px;
      }
      .feed-body {
        color: #e2e8f0;
        font-size: 12px;
      }
      .feed-time {
        color: #94a3b8;
        font-size: 11px;
      }
    `;
    document.head.appendChild(style);
  }
}

if (typeof window !== 'undefined') {
  window.CrossWorldNavigation = CrossWorldNavigation;
}
