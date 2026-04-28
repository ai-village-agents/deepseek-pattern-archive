import { WORLD_DIMENSIONS } from './world-zones.js';

// Pattern Archive Spatial World - Interactive User Guide
// Adds multi-sensory tutorial guidance with audio cues, particle highlights, accessibility affordances,
// and quick-start navigation through all core zones.
const STORAGE_KEY = 'pattern-archive-user-guide';
const MOVEMENT_TARGET = 220; // Distance in world units to count as meaningful movement
const CORE_ZONE_SEQUENCE = [
  'temporal-archetypes',
  'persistence-simulation',
  'historical-documentation',
  'anomaly-submission',
  'analytics-dashboard',
  'collaboration-chamber',
  'pattern-discovery',
  'cross-world-nexus'
];

const ZONE_INSIGHTS = {
  'temporal-archetypes': [
    'Temporal shards spin faster when resilience rises; brightness encodes volatility spikes.',
    'Archetype ribbons are normalized to live totals—pause here to watch smoothing behavior.'
  ],
  'persistence-simulation': [
    'Expectation vs. reality coils split when anomaly drift crosses 0.4; missing helix sections mark debt.',
    'Hovering longer reveals subtle phase offsets that correspond to resilience dampening.'
  ],
  'historical-documentation': [
    'Documentation crystals replay dense case clusters; opacity tracks citation strength.',
    'Radio static fades as evidence quality improves—listen for clear channels.'
  ],
  'anomaly-submission': [
    'Portal hum heightens with submission velocity; embers trace the newest arrivals.',
    'Marks dropped here inherit the portal timestamp for reproducible anomaly payloads.'
  ],
  'analytics-dashboard': [
    'Sparkline amplitude reflects cadence; hue shift maps to severity variance across the last 24h.',
    'Glowing markers drift toward outliers—follow them to inspect failed predictions.'
  ],
  'collaboration-chamber': [
    'Bubble clusters correlate with active threads; lean in to hear cross-team resonance.',
    'Comment velocity pulls bubbles upward—sudden descents flag stalled reviews.'
  ],
  'pattern-discovery': [
    'Scanner sweeps emit tight pings when pattern confidence exceeds 0.72.',
    'Constellation links thicken as cross-world corroboration rises.'
  ],
  'cross-world-nexus': [
    'Portal brightness follows cross-world health checks; dim portals indicate delayed sync.',
    'World rims flare when schema alignment succeeds—use this before exporting insights.'
  ]
};

const ZONE_AUDIO_CUES = {
  default: { type: 'sine', base: 340, detune: 12, duration: 0.45 },
  'temporal-archetypes': { type: 'triangle', base: 280, detune: 18, duration: 0.6 },
  'persistence-simulation': { type: 'sawtooth', base: 220, detune: -8, duration: 0.65 },
  'historical-documentation': { type: 'sine', base: 360, detune: -3, duration: 0.5 },
  'anomaly-submission': { type: 'square', base: 420, detune: 6, duration: 0.5 },
  'analytics-dashboard': { type: 'sine', base: 520, detune: 24, duration: 0.4 },
  'collaboration-chamber': { type: 'triangle', base: 310, detune: 9, duration: 0.55 },
  'pattern-discovery': { type: 'square', base: 440, detune: -14, duration: 0.55 },
  'cross-world-nexus': { type: 'sawtooth', base: 380, detune: 16, duration: 0.7 }
};

const FALLBACK_STYLE = `
  .user-guide-shell {
    position: fixed;
    right: 20px;
    bottom: 20px;
    width: min(440px, 94vw);
    background: rgba(6, 10, 22, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    padding: 14px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
    color: #e2e8f0;
    font-family: 'Space Grotesk', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    z-index: 9998;
    backdrop-filter: blur(8px);
  }
`;

class GuideAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
  }

  prime() {
    if (this.ctx || typeof window === 'undefined' || typeof AudioContext === 'undefined') return;
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.24;
      this.master.connect(this.ctx.destination);
    } catch (err) {
      console.warn('UserGuide audio unavailable', err);
      this.enabled = false;
    }
  }

  playZoneCue(zoneId) {
    if (!this.enabled) return;
    this.ensureRunning();
    const cfg = ZONE_AUDIO_CUES[zoneId] || ZONE_AUDIO_CUES.default;
    this.tone(cfg.base, cfg.detune, cfg.duration, cfg.type);
  }

  playCompletion() {
    if (!this.enabled) return;
    this.ensureRunning();
    this.tone(620, 18, 0.5, 'triangle');
    setTimeout(() => this.tone(780, -10, 0.4, 'sine'), 90);
  }

  ensureRunning() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  tone(freq, detune, duration, type) {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    filter.type = 'lowpass';
    filter.frequency.value = 1400;
    gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, this.ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    osc.start();
    osc.stop(this.ctx.currentTime + duration + 0.05);
  }
}

export class UserGuide {
  constructor(options = {}) {
    this.canvas = options.canvas;
    this.minimapCanvas = options.minimapCanvas || null;
    this.renderer = options.renderer;
    this.navigation = options.navigation;
    this.interactions = options.interactions;
    this.particleEffects = options.particleEffects || null;
    this.crossWorldNavigation = options.crossWorldNavigation || window.CrossWorldAPI || null;
    this.zones = options.zones || [];
    this.zoneMap = new Map(this.zones.map(z => [z.id, z]));

    this.state = {
      active: false,
      currentStepIndex: 0,
      completed: new Set(),
      visitedZones: new Set(),
      marksPlaced: 0,
      hasZoomed: false,
      hasDragged: false,
      usedKeyboard: false,
      travel: 0,
      lastMarkAt: 0,
      lastPos: null,
      lastZoom: this.navigation?.camera?.zoom || 1,
      activeZone: null,
      zoneLinger: 0,
      insight: null,
      quickStartActive: false,
      quickStartIndex: 0,
      rewardLevel: 0,
      shortcutsVisible: false,
      highContrast: false,
      audioPrimed: false,
      lastHighlightZone: null
    };

    this.steps = buildSteps(this.zoneMap);
    this.coreSequence = CORE_ZONE_SEQUENCE.filter(id => this.zoneMap.has(id));
    this.ui = {};
    this.highlightEl = null;
    this.guideIndicator = null;
    this.liveRegion = null;
    this.audio = new GuideAudio();
    this.raf = null;
    this._lastFrame = null;
  }

  init() {
    if (typeof document === 'undefined') return;
    this.loadProgress();
    this.injectStyles();
    this.buildUI();
    this.bindEvents();
    this.renderUI();
    this.startLoop();
    return this;
  }

  bindEvents() {
    const primeAudio = () => {
      if (!this.state.audioPrimed) {
        this.audio.prime();
        this.state.audioPrimed = true;
      }
    };

    // Navigation input tracking
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      primeAudio();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        this.state.usedKeyboard = true;
      }
      if (key === '?' || (e.shiftKey && key === '/')) {
        e.preventDefault();
        this.toggleShortcutsOverlay();
        this.state.active = true;
        this.renderUI();
      }
      if (key === 'q') {
        this.toggleQuickStart();
      }
      if (key === 'c') {
        this.toggleHighContrast();
      }
      if (key === 'escape' && this.state.shortcutsVisible) {
        this.toggleShortcutsOverlay(false);
      }
      if (key === 'g' && this.state.quickStartActive) {
        this.stopQuickStart();
      }
    });

    window.addEventListener('pointerdown', primeAudio, { passive: true });

    if (this.canvas) {
      let dragStart = null;
      this.canvas.addEventListener('mousedown', (e) => {
        primeAudio();
        dragStart = { x: e.clientX, y: e.clientY };
      });
      window.addEventListener('mouseup', (e) => {
        if (dragStart) {
          const dx = e.clientX - dragStart.x;
          const dy = e.clientY - dragStart.y;
          if (Math.hypot(dx, dy) > 24) {
            this.state.hasDragged = true;
            this.completeStep('drag');
          }
        }
        dragStart = null;
      });

      this.canvas.addEventListener('touchstart', (e) => {
        primeAudio();
        const touch = e.touches[0];
        if (touch) dragStart = { x: touch.clientX, y: touch.clientY };
      }, { passive: true });
      this.canvas.addEventListener('touchend', (e) => {
        const touch = e.changedTouches[0];
        if (dragStart && touch) {
          const dx = touch.clientX - dragStart.x;
          const dy = touch.clientY - dragStart.y;
          if (Math.hypot(dx, dy) > 24) {
            this.state.hasDragged = true;
            this.completeStep('drag');
          }
        }
        dragStart = null;
      });

      this.canvas.addEventListener('wheel', () => {
        this.state.hasZoomed = true;
        this.completeStep('zoom');
      }, { passive: true });
    }

    // Interaction system hooks
    if (this.interactions?.on) {
      this.interactions.on('tick', ({ playerPos, activeZone, dt = 0 }) => {
        if (!playerPos) return;
        if (this.state.lastPos) {
          this.state.travel += distance(this.state.lastPos, playerPos);
        }
        this.state.lastPos = playerPos;
        this.state.activeZone = activeZone || null;
        this.showZoneInsightOnLinger(activeZone, dt);
        this.checkMovementStep();
        this.checkZoomStep();
      });
      this.interactions.on('zonechange', ({ zone }) => {
        if (zone?.id) {
          this.state.activeZone = zone;
          this.state.zoneLinger = 0;
          this.state.visitedZones.add(zone.id);
          this.completeZoneStep(zone.id);
          this.audio.playZoneCue(zone.id);
          this.renderUI();
        } else {
          this.state.activeZone = null;
          this.state.zoneLinger = 0;
        }
      });
    }

    // Mark placement tracking (wrap InteractionSystem.addMark)
    if (this.interactions?.addMark && !this.interactions.__userGuideWrapped) {
      const original = this.interactions.addMark.bind(this.interactions);
      this.interactions.addMark = (...args) => {
        const mark = original(...args);
        this.noteMarkPlaced();
        return mark;
      };
      this.interactions.__userGuideWrapped = true;
    }

    // Hook into the existing mark button if present
    const markBtn = document.getElementById('mark-btn');
    if (markBtn) {
      markBtn.addEventListener('click', () => {
        this.noteMarkPlaced();
      });
    }
  }

  startLoop() {
    const tick = (ts) => {
      if (this._lastFrame == null) this._lastFrame = ts;
      const dt = Math.min(0.05, (ts - this._lastFrame) / 1000);
      this._lastFrame = ts;
      this.renderHighlight();
      this.renderGuideIndicator();
      this.tickQuickStart(dt);
      this.renderRewardState(dt);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  activate() {
    this.state.active = true;
    this.completeStep('welcome');
    this.renderUI();
  }

  reset() {
    this.state.completed = new Set();
    this.state.visitedZones = new Set();
    this.state.marksPlaced = 0;
    this.state.travel = 0;
    this.state.hasZoomed = false;
    this.state.hasDragged = false;
    this.state.usedKeyboard = false;
    this.state.currentStepIndex = 0;
    this.state.lastPos = null;
    this.state.lastZoom = this.navigation?.camera?.zoom || 1;
    this.state.rewardLevel = 0;
    this.state.quickStartActive = false;
    this.state.shortcutsVisible = false;
    this.state.insight = null;
    this.state.zoneLinger = 0;
    this.saveProgress();
    this.renderUI();
    this.updateStepFocus();
    this.announce('Tutorial reset. You can restart or jump into quick start.');
  }

  buildUI() {
    const root = document.createElement('div');
    root.className = 'user-guide-shell';
    root.innerHTML = `
      <div class="ug-header">
        <div>
          <div class="ug-title">Spatial World Guide</div>
          <div class="ug-subtitle">Tutorial + Quick Reference</div>
        </div>
        <div class="ug-actions">
          <button class="ug-btn" data-ug-start>Start</button>
          <button class="ug-btn ug-btn-ghost" data-ug-quickstart title="Auto-guide through all zones">Quick start</button>
          <button class="ug-btn ug-btn-ghost" data-ug-crossworld title="Visit other agent worlds">Cross-world</button>
          <button class="ug-btn ug-btn-ghost" data-ug-shortcuts title="Keyboard shortcuts">?</button>
          <button class="ug-btn ug-btn-ghost" data-ug-contrast title="High contrast / screen reader friendly">High contrast</button>
          <button class="ug-btn ug-btn-ghost" data-ug-reset>Reset</button>
        </div>
      </div>
      <div class="ug-progress">
        <div class="ug-progress-bar" data-ug-progress></div>
        <div class="ug-progress-label" data-ug-progress-label></div>
      </div>
      <div class="ug-rewards" data-ug-rewards></div>
      <div class="ug-quickref">
        <div class="ug-quickref-title">Navigation · ${WORLD_DIMENSIONS.width}×${WORLD_DIMENSIONS.height}</div>
        <div class="ug-quickref-grid">
          <span>WASD / Arrow keys · pan</span>
          <span>Mouse drag / touch drag · pan</span>
          <span>Scroll / pinch · zoom 0.5–1.8</span>
          <span>Minimap & zone badges · jump focus</span>
          <span>Mark button or portal · leave trace</span>
          <span>Cross-World Nexus · visit other agent worlds</span>
        </div>
      </div>
      <div class="ug-insight" data-ug-insight role="status"></div>
      <div class="ug-steps" data-ug-steps></div>
      <div class="ug-shortcuts-overlay" data-ug-shortcuts-panel hidden>
        <div class="ug-shortcuts-header">
          <div>
            <div class="ug-step-title">Keyboard shortcuts</div>
            <div class="ug-subtitle">Press ? to toggle · Esc to close</div>
          </div>
          <button class="ug-btn ug-btn-ghost" data-ug-shortcuts-close aria-label="Close shortcuts overlay">Close</button>
        </div>
        <div class="ug-shortcuts-grid">
          <span><strong>WASD / Arrows</strong> — pan</span>
          <span><strong>Scroll / Pinch</strong> — zoom</span>
          <span><strong>Click + drag</strong> — orbit camera</span>
          <span><strong>M</strong> — drop a mark</span>
          <span><strong>?</strong> — toggle this overlay</span>
          <span><strong>Q</strong> — quick start focus</span>
          <span><strong>G</strong> — stop quick start</span>
          <span><strong>C</strong> — toggle contrast</span>
        </div>
      </div>
    `;

    document.body.appendChild(root);
    this.ui.root = root;
    this.ui.progress = root.querySelector('[data-ug-progress]');
    this.ui.progressLabel = root.querySelector('[data-ug-progress-label]');
    this.ui.steps = root.querySelector('[data-ug-steps]');
    this.ui.startBtn = root.querySelector('[data-ug-start]');
    this.ui.resetBtn = root.querySelector('[data-ug-reset]');
    this.ui.quickStartBtn = root.querySelector('[data-ug-quickstart]');
    this.ui.crossWorldBtn = root.querySelector('[data-ug-crossworld]');
    this.ui.shortcutsToggle = root.querySelector('[data-ug-shortcuts]');
    this.ui.shortcutsClose = root.querySelector('[data-ug-shortcuts-close]');
    this.ui.shortcutsPanel = root.querySelector('[data-ug-shortcuts-panel]');
    this.ui.rewards = root.querySelector('[data-ug-rewards]');
    this.ui.insight = root.querySelector('[data-ug-insight]');
    this.ui.contrastBtn = root.querySelector('[data-ug-contrast]');

    this.ui.startBtn.addEventListener('click', () => this.activate());
    this.ui.resetBtn.addEventListener('click', () => this.reset());
    this.ui.quickStartBtn.addEventListener('click', () => this.toggleQuickStart());
    this.ui.crossWorldBtn.addEventListener('click', () => this.openCrossWorld());
    this.ui.shortcutsToggle.addEventListener('click', () => this.toggleShortcutsOverlay());
    this.ui.shortcutsClose.addEventListener('click', () => this.toggleShortcutsOverlay(false));
    this.ui.contrastBtn.addEventListener('click', () => this.toggleHighContrast());

    this.ui.steps.addEventListener('click', (e) => {
      const row = e.target.closest('[data-step-id]');
      if (!row) return;
      const idx = this.steps.findIndex(s => s.id === row.dataset.stepId);
      if (idx >= 0) {
        this.state.active = true;
        this.state.currentStepIndex = idx;
        this.renderUI();
        this.updateStepFocus();
      }
    });

    // Highlight overlay
    const highlight = document.createElement('div');
    highlight.className = 'ug-highlight';
    highlight.style.display = 'none';
    document.body.appendChild(highlight);
    this.highlightEl = highlight;

    // Floating guide indicator
    const indicator = document.createElement('div');
    indicator.className = 'ug-guide-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    indicator.style.display = 'none';
    indicator.innerHTML = `<div class="ug-guide-arrow"></div><div class="ug-guide-label"></div>`;
    document.body.appendChild(indicator);
    this.guideIndicator = indicator;

    // Live region for screen readers
    const live = document.createElement('div');
    live.className = 'ug-live';
    live.setAttribute('aria-live', 'polite');
    live.style.position = 'absolute';
    live.style.left = '-9999px';
    live.style.top = 'auto';
    live.style.height = '1px';
    live.style.width = '1px';
    document.body.appendChild(live);
    this.liveRegion = live;
  }

  renderUI() {
    if (!this.ui.root) return;
    const total = this.steps.length;
    const completed = this.state.completed.size;
    const percent = Math.min(100, Math.round((completed / total) * 100));
    if (this.ui.progress) this.ui.progress.style.width = `${percent}%`;
    if (this.ui.progressLabel) {
      this.ui.progressLabel.textContent = `${completed}/${total} steps • ${percent}%`;
    }

    if (this.ui.root) {
      this.ui.root.classList.toggle('ug-high-contrast', !!this.state.highContrast);
      this.ui.root.classList.toggle('ug-rewarded', this.state.rewardLevel > 0);
    }

    if (this.ui.startBtn) {
      this.ui.startBtn.textContent = this.state.active ? 'Tutorial running' : 'Start';
      this.ui.startBtn.disabled = this.state.active && this.state.completed.has('welcome');
    }

    if (this.ui.quickStartBtn) {
      this.ui.quickStartBtn.textContent = this.state.quickStartActive ? 'Stop quick start' : 'Quick start';
    }

    if (this.ui.rewards) {
      const rewards = [
        { level: 1, label: 'Particle halo unlocked' },
        { level: 2, label: 'Guide beam + insight tips boosted' },
        { level: 3, label: 'Completion shimmer + audio fanfare' }
      ];
      this.ui.rewards.innerHTML = rewards.map(r => `
        <span class="ug-reward ${this.state.rewardLevel >= r.level ? 'unlocked' : ''}">
          ${this.state.rewardLevel >= r.level ? '✓' : '○'} ${r.label}
        </span>
      `).join('');
    }

    if (this.ui.insight) {
      const insight = this.state.insight;
      this.ui.insight.textContent = insight ? `${insight.title}: ${insight.body}` : 'Linger inside a zone to surface deeper insight tips.';
    }

    if (this.ui.shortcutsPanel) {
      this.ui.shortcutsPanel.hidden = !this.state.shortcutsVisible;
    }

    if (this.ui.steps) {
      const current = this.steps[this.state.currentStepIndex]?.id;
      this.ui.steps.innerHTML = this.steps.map(step => {
        const done = this.state.completed.has(step.id);
        const active = step.id === current;
        return `
          <div class="ug-step ${done ? 'done' : ''} ${active ? 'active' : ''}" data-step-id="${step.id}">
            <div class="ug-step-title">${step.title}</div>
            <div class="ug-step-body">${step.description}</div>
            ${step.tip ? `<div class="ug-step-tip">${step.tip}</div>` : ''}
          </div>
        `;
      }).join('');
    }
    this.saveProgress();
  }

  renderHighlight() {
    if (!this.highlightEl || !this.state.active) return;
    const step = this.steps[this.state.currentStepIndex];
    if (!step || !step.zoneId) {
      this.highlightEl.style.display = 'none';
      return;
    }

    const zone = this.zoneMap.get(step.zoneId);
    if (!zone || !this.renderer || !this.navigation) {
      this.highlightEl.style.display = 'none';
      return;
    }

    const screen = this.worldToScreen(zone.position);
    if (!screen) {
      this.highlightEl.style.display = 'none';
      return;
    }

    if (this.state.lastHighlightZone !== zone.id) {
      this.triggerParticleHighlight(zone);
      this.state.lastHighlightZone = zone.id;
    }

    const ringSize = Math.max(80, Math.min(220, zone.radius * (this.navigation.camera?.zoom || 1)));
    this.highlightEl.style.display = 'block';
    this.highlightEl.style.width = `${ringSize}px`;
    this.highlightEl.style.height = `${ringSize}px`;
    this.highlightEl.style.transform = `translate(${screen.x - ringSize / 2}px, ${screen.y - ringSize / 2}px)`;
    this.highlightEl.dataset.label = zone.name || step.title;
    this.highlightEl.setAttribute('aria-label', `Focus zone: ${zone.name || step.title}`);
  }

  triggerParticleHighlight(zone) {
    if (!this.particleEffects || !zone) return;
    const radius = zone.radius || 120;
    const bounds = {
      x: Math.max(0, zone.position.x - radius),
      y: Math.max(0, zone.position.y - radius),
      width: radius * 2,
      height: radius * 2
    };
    if (typeof this.particleEffects.initZoneParticles === 'function') {
      this.particleEffects.initZoneParticles(zone.id, bounds);
    }
  }

  renderGuideIndicator() {
    if (!this.guideIndicator || !this.navigation) return;
    const step = this.steps[this.state.currentStepIndex];
    const targetZoneId = this.state.quickStartActive
      ? this.coreSequence[this.state.quickStartIndex]
      : step?.zoneId;
    const targetZone = targetZoneId ? this.zoneMap.get(targetZoneId) : null;
    if (!targetZone) {
      this.guideIndicator.style.display = 'none';
      return;
    }
    const screen = this.worldToScreen(targetZone.position);
    if (!screen) {
      this.guideIndicator.style.display = 'none';
      return;
    }

    const label = this.guideIndicator.querySelector('.ug-guide-label');
    const arrow = this.guideIndicator.querySelector('.ug-guide-arrow');
    const viewport = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    };
    const dx = screen.x - viewport.x;
    const dy = screen.y - viewport.y;
    const angle = Math.atan2(dy, dx);
    const distance = Math.hypot(dx, dy);
    const clampRadius = Math.min(viewport.x - 20, viewport.y - 20);
    const clamped = distance > clampRadius;
    const displayX = clamped ? viewport.x + Math.cos(angle) * clampRadius : screen.x;
    const displayY = clamped ? viewport.y + Math.sin(angle) * clampRadius : screen.y;

    this.guideIndicator.style.display = 'flex';
    this.guideIndicator.style.transform = `translate(${displayX - 12}px, ${displayY - 12}px)`;
    arrow.style.transform = `rotate(${angle}rad)`;
    label.textContent = `Next: ${targetZone.name || targetZone.id}`;
    this.guideIndicator.classList.toggle('ug-guide-offscreen', clamped);
  }

  worldToScreen(pos) {
    if (!this.canvas || !this.navigation || !this.renderer) return null;
    const rect = this.canvas.getBoundingClientRect();
    const displayWidth = this.renderer.displayWidth || rect.width || window.innerWidth;
    const displayHeight = this.renderer.displayHeight || rect.height || window.innerHeight;
    const camera = this.navigation.camera || { x: 0, y: 0, zoom: 1 };
    const x = (pos.x - camera.x) * (camera.zoom || 1) + displayWidth / 2 + rect.left;
    const y = (pos.y - camera.y) * (camera.zoom || 1) + displayHeight / 2 + rect.top;
    return { x, y };
  }

  completeStep(id) {
    if (!id) return;
    if (this.state.completed.has(id)) return;
    this.state.completed.add(id);
    if (this.steps[this.state.currentStepIndex]?.id === id) {
      this.advanceStep();
    }
    if (id !== 'finish' && this.allCoreStepsDone()) {
      this.state.completed.add('finish');
    }
    this.updateRewardLevel();
    if (id === 'finish') {
      this.audio.playCompletion();
      this.announce('Tutorial complete. Visual rewards unlocked.');
    }
    this.saveProgress();
    this.renderUI();
  }

  completeZoneStep(zoneId) {
    const match = this.steps.find(s => s.zoneId === zoneId);
    if (match) {
      this.completeStep(match.id);
    }
  }

  advanceStep() {
    const next = this.findNextStepIndex();
    if (next >= 0) this.state.currentStepIndex = next;
  }

  findNextStepIndex() {
    const idx = this.steps.findIndex((step, i) => i >= this.state.currentStepIndex && !this.state.completed.has(step.id));
    if (idx !== -1) return idx;
    return this.steps.findIndex(step => !this.state.completed.has(step.id));
  }

  tickQuickStart(dt) {
    if (!this.state.quickStartActive || !this.navigation) return;
    const zoneId = this.coreSequence[this.state.quickStartIndex];
    const zone = this.zoneMap.get(zoneId);
    if (!zone) {
      this.stopQuickStart();
      return;
    }
    const camera = this.navigation.camera;
    const speed = 260 * dt;
    const dx = zone.position.x - camera.x;
    const dy = zone.position.y - camera.y;
    const dist = Math.hypot(dx, dy) || 1;
    const stepX = (dx / dist) * speed;
    const stepY = (dy / dist) * speed;
    camera.x += stepX;
    camera.y += stepY;
    if (dist < Math.max(40, zone.radius * 0.5)) {
      this.advanceQuickStart();
    }
  }

  advanceQuickStart() {
    this.state.quickStartIndex = (this.state.quickStartIndex + 1) % this.coreSequence.length;
    const nextZoneId = this.coreSequence[this.state.quickStartIndex];
    const nextZone = this.zoneMap.get(nextZoneId);
    if (nextZone) {
      this.announce(`Guiding to ${nextZone.name}.`);
      this.audio.playZoneCue(nextZoneId);
    }
    this.renderUI();
  }

  toggleQuickStart() {
    if (this.state.quickStartActive) return this.stopQuickStart();
    if (!this.coreSequence.length) return;
    this.state.quickStartActive = true;
    this.state.active = true;
    this.state.quickStartIndex = 0;
    const firstZone = this.zoneMap.get(this.coreSequence[0]);
    this.announce('Quick start enabled. Following the 8 core zones path.');
    if (firstZone) this.audio.playZoneCue(firstZone.id);
    this.renderUI();
  }

  stopQuickStart() {
    this.state.quickStartActive = false;
    this.renderUI();
    this.announce('Quick start stopped. Manual navigation restored.');
  }

  checkMovementStep() {
    if (this.state.travel >= MOVEMENT_TARGET) {
      this.completeStep('pan');
    }
  }

  checkZoomStep() {
    const cameraZoom = this.navigation?.camera?.zoom;
    if (cameraZoom && Math.abs(cameraZoom - this.state.lastZoom) > 0.05) {
      this.state.hasZoomed = true;
      this.state.lastZoom = cameraZoom;
      this.completeStep('zoom');
    }
  }

  updateStepFocus() {
    const idx = this.findNextStepIndex();
    if (idx >= 0) {
      this.state.currentStepIndex = idx;
      this.renderUI();
    }
  }

  updateRewardLevel() {
    const completed = this.state.completed.size;
    const thresholds = [3, 7, this.steps.length];
    let level = 0;
    thresholds.forEach((t, idx) => {
      if (completed >= t) level = idx + 1;
    });
    const changed = level !== this.state.rewardLevel;
    this.state.rewardLevel = level;
    if (changed && level > 0) {
      this.audio.playCompletion();
      this.announce(`Reward level ${level} unlocked.`);
    }
  }

  renderRewardState(dt) {
    if (!this.ui.root) return;
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    this.ui.root.style.setProperty('--ug-reward-pulse', `${0.5 + Math.sin(now * 0.002) * 0.25}`);
    if (this.state.rewardLevel > 0 && this.highlightEl) {
      const glow = 0.4 + Math.sin(now * 0.003) * 0.25;
      this.highlightEl.style.boxShadow = `0 0 20px rgba(34,211,238,${glow}), 0 0 60px rgba(59,130,246,${glow})`;
    }
  }

  saveProgress() {
    if (typeof localStorage === 'undefined') return;
    const payload = {
      completed: Array.from(this.state.completed),
      visitedZones: Array.from(this.state.visitedZones),
      marksPlaced: this.state.marksPlaced
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn('UserGuide: unable to save progress', err);
    }
  }

  loadProgress() {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.completed)) {
        this.state.completed = new Set(data.completed);
      }
      if (Array.isArray(data.visitedZones)) {
        this.state.visitedZones = new Set(data.visitedZones);
      }
      if (typeof data.marksPlaced === 'number') {
        this.state.marksPlaced = data.marksPlaced;
      }
      this.state.currentStepIndex = this.findNextStepIndex();
      this.updateRewardLevel();
    } catch (err) {
      console.warn('UserGuide: unable to load progress', err);
    }
  }

  allCoreStepsDone() {
    const remaining = this.steps.filter(step => step.id !== 'finish' && !this.state.completed.has(step.id));
    return remaining.length === 0;
  }

  injectStyles() {
    if (document.getElementById('user-guide-css')) return;
    const link = document.createElement('link');
    link.id = 'user-guide-css';
    link.rel = 'stylesheet';
    link.href = './css/user-guide.css';
    link.onerror = () => {
      const fallback = document.createElement('style');
      fallback.id = 'user-guide-styles';
      fallback.textContent = FALLBACK_STYLE;
      document.head.appendChild(fallback);
    };
    document.head.appendChild(link);
  }

  noteMarkPlaced() {
    const now = Date.now();
    if (now - this.state.lastMarkAt < 150) return; // Deduplicate rapid clicks
    this.state.lastMarkAt = now;
    this.state.marksPlaced += 1;
    this.completeStep('mark');
  }

  showZoneInsightOnLinger(activeZone, dt = 0) {
    if (!activeZone) {
      this.state.zoneLinger = 0;
      return;
    }
    if (this.state.insight?.zoneId !== activeZone.id) {
      this.state.zoneLinger = 0;
    }
    this.state.zoneLinger += dt;
    if (this.state.zoneLinger > 2.8) {
      this.setInsightTip(activeZone.id);
      this.state.zoneLinger = 0;
    }
  }

  setInsightTip(zoneId) {
    const insights = ZONE_INSIGHTS[zoneId] || [];
    if (!insights.length) return;
    const tip = insights[Math.floor(Math.random() * insights.length)];
    this.state.insight = {
      title: this.zoneMap.get(zoneId)?.name || zoneId,
      body: tip,
      zoneId
    };
    this.renderUI();
    this.announce(`Insight: ${tip}`);
  }

  toggleShortcutsOverlay(force) {
    this.state.shortcutsVisible = typeof force === 'boolean' ? force : !this.state.shortcutsVisible;
    this.renderUI();
  }

  toggleHighContrast() {
    this.state.highContrast = !this.state.highContrast;
    if (this.state.highContrast) {
      document.body.classList.add('ug-high-contrast');
    } else {
      document.body.classList.remove('ug-high-contrast');
    }
    this.announce(this.state.highContrast ? 'High contrast mode on' : 'High contrast mode off');
    this.renderUI();
  }

  openCrossWorld() {
    try {
      if (this.crossWorldNavigation?.discoverWorlds) {
        this.crossWorldNavigation.discoverWorlds({ probe: true });
      }
      if (this.crossWorldNavigation?.initCrossWorldAPI) {
        this.crossWorldNavigation.initCrossWorldAPI({ autoDiscover: true, probeWorlds: true });
      }
    } catch (err) {
      console.warn('Cross-world integration failed', err);
    }
    const nexus = this.zoneMap.get('cross-world-nexus');
    if (nexus && this.navigation?.camera) {
      this.navigation.camera.x = nexus.position.x;
      this.navigation.camera.y = nexus.position.y;
      const idx = this.steps.findIndex(s => s.zoneId === 'cross-world-nexus');
      if (idx >= 0) {
        this.state.currentStepIndex = idx;
        this.renderUI();
      }
    }
    this.announce('Cross-world navigation primed. Visit the nexus portal to hop to other agent worlds.');
  }

  announce(text) {
    if (!this.liveRegion) return;
    this.liveRegion.textContent = text;
  }
}

function buildSteps(zoneMap) {
  const zoneStep = (id, zoneId, description, tip) => ({
    id,
    zoneId,
    title: zoneMap.get(zoneId)?.name || zoneId,
    description,
    tip
  });

  return [
    {
      id: 'welcome',
      title: 'Activate the tutorial',
      description: 'Enable the interactive guide when you are ready to learn the spatial world layout and controls.'
    },
    {
      id: 'pan',
      title: 'Pan across the canvas',
      description: 'Move at least 220 units inside the 3400×2300 world using WASD, arrow keys, mouse drag, or touch.'
    },
    {
      id: 'zoom',
      title: 'Zoom in and out',
      description: 'Scroll or pinch to explore between macro view and zone detail. The camera supports 0.5–1.8 zoom.'
    },
    {
      id: 'drag',
      title: 'Mouse drag or touch swipe',
      description: 'Grab the canvas or swipe to reposition. This mirrors the NavigationController drag + touch logic.'
    },
    {
      id: 'mark',
      zoneId: 'anomaly-submission',
      title: 'Leave a permanent mark',
      description: 'Use the glowing portal or the “Leave a glowing mark” control to drop a coordinate. Marks persist locally and are echoed in anomaly submissions.',
      tip: 'Anomaly submissions become GitHub Issues plus in-world particles. Stand in the portal zone for context.'
    },
    zoneStep(
      'zone-temporal-archetypes',
      'temporal-archetypes',
      'Clockwork shards translate archetype analytics; cyan/magenta trails map resilience, volatility, and speed.',
      'Watch the live temporal series and total submissions drive bar heights while you orbit the zone.'
    ),
    zoneStep(
      'zone-persistence-simulation',
      'persistence-simulation',
      'Deploy 450 expectation vs. reality helix. Missing segments glow when you linger—evidence of drift.',
      'Use this stop to explain the 450-loop sculpture and how volatility/resilience tweaks deform the helix.'
    ),
    zoneStep(
      'zone-historical-documentation',
      'historical-documentation',
      'Documentation crystals stream case files as you approach; orbiting glyphs hint at density.',
      'Each facet is a past incident. Tell investigators to hover until the radio static resolves into text.'
    ),
    zoneStep(
      'zone-analytics-dashboard',
      'analytics-dashboard',
      'Holographic dashboards show cadence, failure rate, and prediction accuracy as live sparklines.',
      'Invite users to compare sparkline brightness to anomaly velocity; touch the board to project charts.'
    ),
    zoneStep(
      'zone-collaboration-chamber',
      'collaboration-chamber',
      'Shared discussion bubbles echo active threads and comment counts from collaboration metrics.',
      'Soft chorus audio rises with active threads—use it to find busy debates.'
    ),
    zoneStep(
      'zone-pattern-discovery',
      'pattern-discovery',
      'Detection beams sweep for clusters; constellation edges light up when new patterns are detected.',
      'Use this to narrate how PatternDiscovery maps archetypes and insights into the sky web.'
    ),
    zoneStep(
      'zone-cross-world-nexus',
      'cross-world-nexus',
      'Portals preview other agent worlds; brightness follows the latest cross-world health checks.',
      'Explain how to open CrossWorld API/controls, compare aggregates, and hop to other AI Village worlds.'
    ),
    {
      id: 'finish',
      title: 'Tutorial complete',
      description: 'All steps checked. Keep the quick reference handy for shortcuts and zone re-visits.'
    }
  ];
}

function distance(a, b) {
  return Math.hypot((a?.x || 0) - (b?.x || 0), (a?.y || 0) - (b?.y || 0));
}

if (typeof window !== 'undefined') {
  window.PatternArchiveUserGuide = window.PatternArchiveUserGuide || {};
  window.PatternArchiveUserGuide.UserGuide = UserGuide;
}
