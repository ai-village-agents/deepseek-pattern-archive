// Audio Feedback module for Pattern Archive Spatial World
// Provides ambient soundscapes, interaction cues, and portal audio with Web Audio + graceful fallbacks.

const FALLBACK_TONE =
  'data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAD//wQBAP//AAD///8AAP//AAD///8AAP//AAD///8AAP//AAD///8AAP//AAD///8AAP//AAD///8AAP//AAD///8AAP//AAD///8AAP//AAD///8AAP//AAD///8AAP//AAD///8AAP//AAD///8AAP//AAD///8AAP//AAD///8AAP//AAD///8AAP//AAD///8AAP//AAD///8AAP//AAD///8A';

const AMBIENT_CONFIG = {
  'temporal-archetypes': { base: 0.32, type: 'triangle', freq: 220, detune: 9, filter: 1400, noise: 0.06, pulse: 0.4 },
  'persistence-simulation': { base: 0.3, type: 'sine', freq: 110, detune: -6, filter: 900, noise: 0.12, pulse: 0.2 },
  'historical-documentation': { base: 0.26, type: 'sine', freq: 360, detune: -3, filter: 1800, noise: 0.08, pulse: 0.3 },
  'anomaly-submission': { base: 0.34, type: 'square', freq: 180, detune: 6, filter: 700, noise: 0.16, pulse: 0.5 },
  'analytics-dashboard': { base: 0.28, type: 'sawtooth', freq: 480, detune: 12, filter: 1500, noise: 0.05, pulse: 0.9 },
  'cross-world-analytics-dashboard': { base: 0.28, type: 'sawtooth', freq: 520, detune: 10, filter: 1550, noise: 0.05, pulse: 1.0 },
  'collaboration-chamber': { base: 0.27, type: 'triangle', freq: 260, detune: 4, filter: 1300, noise: 0.07, pulse: 0.55 },
  'pattern-discovery': { base: 0.25, type: 'square', freq: 410, detune: -8, filter: 1600, noise: 0.1, pulse: 0.75 },
  'cross-world-nexus': { base: 0.3, type: 'sawtooth', freq: 300, detune: 18, filter: 1200, noise: 0.13, pulse: 0.65 }
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export class AudioFeedback {
  constructor(options = {}) {
    this.canvas = options.canvas || null;
    this.zones = options.zones || [];
    this.navigation = options.navigation || null;
    this.interactions = options.interactions || null;
    this.crossWorldNavigation = options.crossWorldNavigation || null;

    this.ctx = null;
    this.master = null;
    this.ambients = new Map();
    this.discoveryPlayed = new Set();
    this.activeZoneId = null;
    this.volume = this.loadNumber('pattern-audio-volume', 0.65);
    this.muted = this.loadBoolean('pattern-audio-muted', false);
    this.hasGesture = false;
    this.supported = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    this.fallback = typeof Audio !== 'undefined' ? new Audio(FALLBACK_TONE) : null;
    this.controls = null;
  }

  init() {
    this.bindGestures();
    this.bindInteractions();
    this.mountControls();
    return this;
  }

  bindGestures() {
    const gesture = () => {
      this.hasGesture = true;
      this.prime();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('pointerdown', gesture, { once: true, passive: true });
      window.addEventListener('keydown', gesture, { once: true });
    }
    if (this.canvas) {
      this.canvas.addEventListener('pointerdown', () => this.prime(), { passive: true });
    }
  }

  bindInteractions() {
    if (this.interactions?.on) {
      this.interactions.on('zonechange', payload => this.onZoneChange(payload));
      this.interactions.on('tick', payload => this.onTick(payload));
      this.interactions.on('mark', payload => this.playMarkPlacement(payload?.zoneId || null));
    }
  }

  prime() {
    if (!this.supported || this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    try {
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
      this.buildAmbients();
      this.updateAmbientMix(this.navigation?.camera || null);
      this.ensureRunning();
    } catch (err) {
      console.warn('AudioFeedback unavailable', err);
    }
  }

  ensureRunning() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  buildAmbients() {
    if (!this.ctx || !this.zones?.length) return;
    this.ambients.forEach(nodes => this.stopAmbient(nodes));
    this.ambients.clear();
    this.zones.forEach(zone => {
      const cfg = AMBIENT_CONFIG[zone.id] || { base: 0.22, type: 'sine', freq: 260, filter: 1200, noise: 0.05, pulse: 0.4 };
      const nodes = this.createAmbientVoice(zone, cfg);
      this.ambients.set(zone.id, { ...nodes, config: cfg });
    });
  }

  createAmbientVoice(zone, cfg) {
    const gain = this.ctx.createGain();
    gain.gain.value = 0;

    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'linear';
    panner.refDistance = 140;
    panner.maxDistance = 3800;
    panner.rolloffFactor = 0.8;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 360;
    panner.coneOuterGain = 0.4;
    this.updatePanner(panner, zone.position);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = cfg.filter || 1200;
    filter.Q.value = 0.9;

    const osc = this.ctx.createOscillator();
    osc.type = cfg.type || 'sine';
    osc.frequency.value = cfg.freq || 220;
    osc.detune.value = cfg.detune || 0;
    osc.connect(filter);

    const noise = cfg.noise ? this.createNoise(cfg.noise) : null;
    if (noise) noise.connect(filter);

    if (cfg.pulse) {
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.value = cfg.pulse;
      lfoGain.gain.value = cfg.lfoAmount || 120;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.detune);
      lfo.start();
      filter._lfo = lfo;
    }

    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.master);

    osc.start();
    if (noise) noise.start();

    return { gain, panner, osc, noise, filter, zoneId: zone.id };
  }

  createNoise(level = 0.08) {
    const bufferSize = 2 * this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * level;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    return src;
  }

  onZoneChange(payload) {
    const zone = payload?.zone || null;
    this.activeZoneId = zone?.id || null;
    if (zone && !this.discoveryPlayed.has(zone.id)) {
      this.discoveryPlayed.add(zone.id);
      this.playDiscoveryCue(zone.id);
    }
    this.updateAmbientMix(this.navigation?.camera || payload?.playerPos || null);
  }

  onTick(payload) {
    this.ensureRunning();
    this.updateAmbientMix(payload?.playerPos || this.navigation?.camera || null, payload?.activeZone);
  }

  updateAmbientMix(camera, activeZone = null) {
    if (!this.ctx || !this.master || !camera) return;

    const listener = this.ctx.listener;
    if (listener.positionX) {
      listener.positionX.value = camera.x;
      listener.positionY.value = camera.y;
      listener.positionZ.value = 0.1;
      listener.forwardX.value = 0;
      listener.forwardY.value = 0;
      listener.forwardZ.value = -1;
      listener.upX.value = 0;
      listener.upY.value = 1;
      listener.upZ.value = 0;
    } else if (listener.setPosition) {
      listener.setPosition(camera.x, camera.y, 0.1);
    }

    this.zones.forEach(zone => {
      const nodes = this.ambients.get(zone.id);
      if (!nodes?.gain) return;
      this.updatePanner(nodes.panner, zone.position);
      const distance = Math.hypot(zone.position.x - camera.x, zone.position.y - camera.y);
      const radius = zone.radius || 220;
      const falloff = clamp(1 - distance / (radius * 3.2), 0, 1);
      const focusBoost = zone.id === (activeZone?.id || this.activeZoneId) ? 1 : 0.55;
      const target = this.muted ? 0 : (nodes.config?.base || 0.22) * falloff * focusBoost * this.volume;
      nodes.gain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.4);
    });
  }

  updatePanner(panner, position = { x: 0, y: 0 }) {
    if (!panner) return;
    if (panner.positionX) {
      panner.positionX.value = position.x;
      panner.positionY.value = position.y;
      panner.positionZ.value = -0.5;
    } else if (panner.setPosition) {
      panner.setPosition(position.x, position.y, -0.5);
    }
  }

  playDiscoveryCue(zoneId) {
    const tones = {
      default: [320, 480],
      'temporal-archetypes': [220, 320, 440],
      'persistence-simulation': [180, 240, 300],
      'historical-documentation': [280, 360, 520],
      'anomaly-submission': [200, 280, 360],
      'analytics-dashboard': [420, 520, 640],
      'collaboration-chamber': [260, 330, 420],
      'pattern-discovery': [360, 440, 560],
      'cross-world-nexus': [300, 420, 540]
    };
    const seq = tones[zoneId] || tones.default;
    this.playToneBurst(seq, { duration: 0.16, spacing: 0.08 });
  }

  playMarkPlacement(zoneId) {
    const base = { freq: 540, detune: zoneId ? 6 : -6, type: 'triangle', duration: 0.14 };
    this.playToneBurst([base.freq, base.freq * 1.1], { duration: base.duration, type: base.type });
  }

  playAnomalySubmission(success = true) {
    if (success) {
      this.playToneBurst([420, 560, 720], { duration: 0.18, spacing: 0.07, type: 'triangle' });
    } else {
      this.playToneBurst([380, 240], { duration: 0.22, spacing: 0.06, type: 'sawtooth' });
    }
  }

  playPortalCharge(portal) {
    const freq = portal?.type === 'unknown' ? 260 : 320;
    this.playRiser(freq, 0.7);
  }

  playPortalArrival(portal) {
    this.playToneBurst([520, 720], { duration: 0.2, spacing: 0.05, type: 'sine' });
  }

  playRiser(freq = 300, duration = 0.8) {
    if (!this.ctx || !this.master) return this.playFallback();
    this.ensureRunning();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 2.3, this.ctx.currentTime + duration);
    gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.4 * this.volume, this.ctx.currentTime + duration * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    osc.stop(this.ctx.currentTime + duration + 0.05);
  }

  playToneBurst(frequencies = [], opts = {}) {
    if (!this.ctx || !this.master) return this.playFallback();
    this.ensureRunning();
    const duration = opts.duration || 0.18;
    const spacing = opts.spacing || 0.05;
    const type = opts.type || 'sine';
    frequencies.forEach((freq, idx) => {
      const t = this.ctx.currentTime + idx * spacing;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.4 * this.volume, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t);
      osc.stop(t + duration + 0.05);
    });
  }

  playFallback() {
    if (!this.fallback) return;
    try {
      this.fallback.currentTime = 0;
      this.fallback.volume = this.muted ? 0 : clamp(this.volume, 0, 1);
      this.fallback.play().catch(() => {});
    } catch (err) {
      // ignore
    }
  }

  setVolume(value, skipPersist = false) {
    this.volume = clamp(value, 0, 1);
    if (this.master && !this.muted) {
      this.master.gain.setTargetAtTime(this.volume, this.ctx?.currentTime || 0, 0.15);
    }
    if (!skipPersist) this.persist('pattern-audio-volume', this.volume);
    this.updateControlState();
  }

  toggleMute(force) {
    const next = typeof force === 'boolean' ? force : !this.muted;
    this.muted = next;
    if (this.master) {
      this.master.gain.setTargetAtTime(next ? 0 : this.volume, this.ctx?.currentTime || 0, 0.12);
    }
    this.persist('pattern-audio-muted', this.muted);
    this.updateControlState();
  }

  mountControls() {
    if (typeof document === 'undefined') return;
    const host = document.querySelector('.controls') || document.body;
    if (!host) return;
    const pill = document.createElement('div');
    pill.className = 'pill audio-pill';
    pill.innerHTML = `
      <div class="audio-label">Audio</div>
      <input type="range" min="0" max="100" step="1" class="audio-slider" value="${Math.round(this.volume * 100)}" aria-label="Audio volume">
      <button type="button" class="audio-toggle">${this.muted ? 'Muted' : 'Mute'}</button>
    `;
    host.appendChild(pill);
    const slider = pill.querySelector('.audio-slider');
    const toggle = pill.querySelector('.audio-toggle');
    slider.addEventListener('input', e => {
      const v = Number(e.target.value) / 100;
      this.setVolume(v);
      if (this.muted && v > 0) this.toggleMute(false);
      this.prime();
    });
    toggle.addEventListener('click', () => {
      this.toggleMute();
      this.prime();
    });
    this.controls = { pill, slider, toggle };
  }

  updateControlState() {
    if (!this.controls) return;
    if (this.controls.slider) {
      this.controls.slider.value = Math.round(this.volume * 100);
    }
    if (this.controls.toggle) {
      this.controls.toggle.textContent = this.muted ? 'Muted' : 'Mute';
      this.controls.toggle.setAttribute('aria-pressed', this.muted ? 'true' : 'false');
    }
  }

  stopAmbient(nodes) {
    try {
      nodes?.osc?.stop();
      nodes?.noise?.stop();
      nodes?.filter?._lfo?.stop?.();
    } catch (err) {
      // ignore
    }
  }

  loadNumber(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      const num = Number(raw);
      return Number.isFinite(num) ? num : fallback;
    } catch (err) {
      return fallback;
    }
  }

  loadBoolean(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return raw === 'true';
    } catch (err) {
      return fallback;
    }
  }

  persist(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch (err) {
      // ignore persistence issues
    }
  }
}
