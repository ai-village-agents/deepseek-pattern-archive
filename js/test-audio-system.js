// Audio System Test Harness
// Simulates user interactions with AudioFeedback using a fake Web Audio context
// and reports pass/fail status for all audio subsystems.

import { AudioFeedback } from './audio-feedback.js';

const TEST_ZONES = [
  { id: 'temporal-archetypes', position: { x: 620, y: 520 }, radius: 230 },
  { id: 'persistence-simulation', position: { x: 1200, y: 420 }, radius: 210 },
  { id: 'historical-documentation', position: { x: 400, y: 1150 }, radius: 190 },
  { id: 'anomaly-submission', position: { x: 1700, y: 1400 }, radius: 220 },
  { id: 'analytics-dashboard', position: { x: 2450, y: 720 }, radius: 210 },
  { id: 'collaboration-chamber', position: { x: 2600, y: 1400 }, radius: 190 },
  { id: 'pattern-discovery', position: { x: 950, y: 1850 }, radius: 200 },
  { id: 'cross-world-nexus', position: { x: 3050, y: 1900 }, radius: 220 },
  { id: 'cross-world-analytics-dashboard', position: { x: 6500, y: 900 }, radius: 230 }
];

const EXPECTED_AMBIENT_CONFIG = {
  'temporal-archetypes': { base: 0.32, type: 'triangle', freq: 220, detune: 9, filter: 1400, noise: 0.06, pulse: 0.4 },
  'persistence-simulation': { base: 0.3, type: 'sine', freq: 110, detune: -6, filter: 900, noise: 0.12, pulse: 0.2 },
  'historical-documentation': { base: 0.26, type: 'sine', freq: 360, detune: -3, filter: 1800, noise: 0.08, pulse: 0.3 },
  'anomaly-submission': { base: 0.34, type: 'square', freq: 180, detune: 6, filter: 700, noise: 0.16, pulse: 0.5 },
  'analytics-dashboard': { base: 0.28, type: 'sawtooth', freq: 480, detune: 12, filter: 1500, noise: 0.05, pulse: 0.9 },
  'collaboration-chamber': { base: 0.27, type: 'triangle', freq: 260, detune: 4, filter: 1300, noise: 0.07, pulse: 0.55 },
  'pattern-discovery': { base: 0.25, type: 'square', freq: 410, detune: -8, filter: 1600, noise: 0.1, pulse: 0.75 },
  'cross-world-nexus': { base: 0.3, type: 'sawtooth', freq: 300, detune: 18, filter: 1200, noise: 0.13, pulse: 0.65 },
  'cross-world-analytics-dashboard': { base: 0.28, type: 'sawtooth', freq: 520, detune: 10, filter: 1550, noise: 0.05, pulse: 1.0 }
};

class FakeAudioParam {
  constructor(value = 0) {
    this.value = value;
    this.events = [];
  }
  setValueAtTime(value, time) {
    this.value = value;
    this.events.push({ type: 'set', value, time });
  }
  setTargetAtTime(value, time, tc) {
    this.value = value;
    this.lastTarget = { value, time, tc };
    this.events.push({ type: 'target', value, time, tc });
  }
  exponentialRampToValueAtTime(value, time) {
    this.value = value;
    this.events.push({ type: 'ramp', value, time });
  }
}

class FakeNode {
  constructor(ctx) {
    this.ctx = ctx;
    this.connections = [];
  }
  connect(node) {
    this.connections.push(node);
    return node;
  }
}

class FakeGain extends FakeNode {
  constructor(ctx) {
    super(ctx);
    this.gain = new FakeAudioParam(1);
  }
}

class FakeOscillator extends FakeNode {
  constructor(ctx) {
    super(ctx);
    this.type = 'sine';
    this.frequency = new FakeAudioParam(440);
    this.detune = new FakeAudioParam(0);
    this.started = false;
    this.stopped = false;
  }
  start(time = 0) {
    this.started = true;
    this.startTime = time;
  }
  stop(time = 0) {
    this.stopped = true;
    this.stopTime = time;
  }
}

class FakePanner extends FakeNode {
  constructor(ctx) {
    super(ctx);
    this.positionX = new FakeAudioParam(0);
    this.positionY = new FakeAudioParam(0);
    this.positionZ = new FakeAudioParam(0);
    this.positions = [];
  }
  setPosition(x, y, z) {
    this.positions.push({ x, y, z });
    this.positionX.value = x;
    this.positionY.value = y;
    this.positionZ.value = z;
  }
}

class FakeFilter extends FakeNode {
  constructor(ctx) {
    super(ctx);
    this.type = 'bandpass';
    this.frequency = new FakeAudioParam(1000);
    this.detune = new FakeAudioParam(0);
    this.Q = new FakeAudioParam(1);
  }
}

class FakeBufferSource extends FakeNode {
  constructor(ctx) {
    super(ctx);
    this.loop = false;
    this.started = false;
    this.stopped = false;
  }
  start() {
    this.started = true;
  }
  stop() {
    this.stopped = true;
  }
}

class FakeAudioBuffer {
  constructor(channels, length, sampleRate) {
    this.channels = channels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.data = Array.from({ length: channels }, () => new Float32Array(length));
  }
  getChannelData(idx) {
    return this.data[idx] || this.data[0];
  }
}

class FakeAudioContext {
  constructor() {
    this.sampleRate = 48000;
    this.currentTime = 0;
    this.state = 'running';
    this.created = { gains: [], oscillators: [], filters: [], panners: [], buffers: [], sources: [] };
    this.listener = {
      positionX: new FakeAudioParam(0),
      positionY: new FakeAudioParam(0),
      positionZ: new FakeAudioParam(0),
      forwardX: new FakeAudioParam(0),
      forwardY: new FakeAudioParam(0),
      forwardZ: new FakeAudioParam(-1),
      upX: new FakeAudioParam(0),
      upY: new FakeAudioParam(1),
      upZ: new FakeAudioParam(0),
      setPosition: (x, y, z) => {
        this.listener.positionX.value = x;
        this.listener.positionY.value = y;
        this.listener.positionZ.value = z;
      }
    };
    this.destination = new FakeNode(this);
    this.resumed = false;
  }
  resume() {
    this.resumed = true;
    return Promise.resolve();
  }
  createGain() {
    const g = new FakeGain(this);
    this.created.gains.push(g);
    return g;
  }
  createOscillator() {
    const osc = new FakeOscillator(this);
    this.created.oscillators.push(osc);
    return osc;
  }
  createPanner() {
    const p = new FakePanner(this);
    this.created.panners.push(p);
    return p;
  }
  createBiquadFilter() {
    const f = new FakeFilter(this);
    this.created.filters.push(f);
    return f;
  }
  createBuffer(channels, length, sampleRate) {
    const buf = new FakeAudioBuffer(channels, length, sampleRate);
    this.created.buffers.push(buf);
    return buf;
  }
  createBufferSource() {
    const src = new FakeBufferSource(this);
    this.created.sources.push(src);
    return src;
  }
}

function instrumentAudio(audio) {
  const log = { toneBursts: [], risers: [], fallbacks: 0 };
  const originalTone = audio.playToneBurst.bind(audio);
  audio.playToneBurst = (freqs, opts = {}) => {
    log.toneBursts.push({ freqs: [...freqs], opts });
    return originalTone(freqs, opts);
  };
  const originalRiser = audio.playRiser.bind(audio);
  audio.playRiser = (freq = 300, duration = 0.8) => {
    log.risers.push({ freq, duration });
    return originalRiser(freq, duration);
  };
  const originalFallback = audio.playFallback.bind(audio);
  audio.playFallback = () => {
    log.fallbacks += 1;
    return originalFallback();
  };
  return log;
}

function createAudioHarness() {
  const storageSnapshot = {
    volume: localStorage.getItem('pattern-audio-volume'),
    muted: localStorage.getItem('pattern-audio-muted')
  };

  const originals = { AudioContext: window.AudioContext, webkitAudioContext: window.webkitAudioContext };
  window.AudioContext = FakeAudioContext;
  window.webkitAudioContext = FakeAudioContext;

  const audio = new AudioFeedback({
    zones: TEST_ZONES,
    navigation: { camera: { x: 0, y: 0 } },
    interactions: null
  }).init();
  audio.supported = true;
  audio.hasGesture = true;
  audio.prime();
  const log = instrumentAudio(audio);

  const cleanup = () => {
    window.AudioContext = originals.AudioContext;
    window.webkitAudioContext = originals.webkitAudioContext;
    if (storageSnapshot.volume === null) {
      localStorage.removeItem('pattern-audio-volume');
    } else {
      localStorage.setItem('pattern-audio-volume', storageSnapshot.volume);
    }
    if (storageSnapshot.muted === null) {
      localStorage.removeItem('pattern-audio-muted');
    } else {
      localStorage.setItem('pattern-audio-muted', storageSnapshot.muted);
    }
  };

  return { audio, log, cleanup };
}

function testAmbientSoundscapes(audio) {
  const details = [];
  let passed = true;
  if (audio.ambients.size !== 9) {
    passed = false;
    details.push(`Expected 9 ambients, found ${audio.ambients.size}`);
  }
  Object.entries(EXPECTED_AMBIENT_CONFIG).forEach(([id, cfg]) => {
    const nodes = audio.ambients.get(id);
    if (!nodes) {
      passed = false;
      details.push(`${id}: ambient nodes missing`);
      return;
    }
    const oscOk = nodes.osc?.type === cfg.type && nodes.osc?.frequency.value === cfg.freq && nodes.osc?.detune.value === cfg.detune;
    const filterOk = nodes.filter?.frequency.value === cfg.filter;
    const noiseOk = cfg.noise ? !!nodes.noise : true;
    const pulseOk = cfg.pulse ? !!nodes.filter?._lfo : true;
    const gainsLinked = nodes.gain?.connect && nodes.panner?.connect && nodes.panner?.connections?.includes(audio.master);
    if (oscOk && filterOk && noiseOk && pulseOk && gainsLinked) {
      details.push(`${id}: oscillator ${cfg.type} @${cfg.freq}Hz detune ${cfg.detune}, filter ${cfg.filter}Hz OK`);
    } else {
      passed = false;
      details.push(
        `${id}: config mismatch osc=${oscOk} filter=${filterOk} noise=${noiseOk} pulse=${pulseOk} routed=${!!gainsLinked}`
      );
    }
  });
  return { name: 'Ambient soundscapes (9 zones)', passed, details };
}

function testDiscoveryCues(audio, log) {
  const before = log.toneBursts.length;
  TEST_ZONES.forEach(zone => audio.onZoneChange({ zone, playerPos: zone.position }));
  const afterFirstPass = log.toneBursts.length;
  TEST_ZONES.forEach(zone => audio.onZoneChange({ zone, playerPos: zone.position }));
  const afterSecondPass = log.toneBursts.length;
  const firstRunCount = afterFirstPass - before;
  const secondRunCount = afterSecondPass - afterFirstPass;
  const passed = firstRunCount >= TEST_ZONES.length && secondRunCount === 0;
  const details = [
    `Discovery cues triggered ${firstRunCount} time(s) on first entry`,
    `Discovery cues suppressed on repeat entry (${secondRunCount} new)`
  ];
  return { name: 'Discovery cues on zone entry', passed, details };
}

function testInteractionSounds(audio, log) {
  const startCount = log.toneBursts.length;
  audio.playMarkPlacement('temporal-archetypes'); // click-like
  audio.playAnomalySubmission(true); // success
  audio.playAnomalySubmission(false); // error
  audio.playToneBurst([360], { duration: 0.1, type: 'sine' }); // hover hint
  const played = log.toneBursts.slice(startCount);
  const passed = played.length >= 4;
  const details = played.map((burst, idx) => `Interaction tone ${idx + 1}: ${burst.freqs.join(', ')}`);
  return { name: 'Interaction sounds (click/success/error/hover)', passed, details };
}

function testPortals(audio, log) {
  const startBurst = log.toneBursts.length;
  const startRisers = log.risers.length;
  audio.playPortalCharge({ type: 'standard' });
  audio.playPortalArrival({ id: 'portal-1' });
  const bursts = log.toneBursts.length - startBurst;
  const risers = log.risers.length - startRisers;
  const passed = bursts >= 1 && risers >= 1;
  const details = [`Portal charge risers: ${risers}`, `Portal arrival sparkle bursts: ${bursts}`];
  return { name: 'Portal teleportation audio (whoosh + sparkle)', passed, details };
}

function testAnomalySubmission(audio, log) {
  const baseline = log.toneBursts.length;
  audio.playAnomalySubmission(true);
  audio.playAnomalySubmission(false);
  const newBursts = log.toneBursts.slice(baseline);
  const success = newBursts[0];
  const failure = newBursts[1];
  const passed = !!success && !!failure && success.freqs.length >= 3 && failure.freqs.length === 2;
  const details = [
    `Success chime frequencies: ${success ? success.freqs.join(', ') : 'missing'}`,
    `Error descending tones: ${failure ? failure.freqs.join(', ') : 'missing'}`
  ];
  return { name: 'Anomaly submission tones (rise + confirm/error)', passed, details };
}

function testVolumeAndMute(audio) {
  const details = [];
  audio.setVolume(0.3);
  const masterAfterSet = audio.master?.gain?.lastTarget?.value ?? audio.master?.gain?.value;
  audio.updateAmbientMix({ x: TEST_ZONES[0].position.x, y: TEST_ZONES[0].position.y }, TEST_ZONES[0]);
  const ambientTarget = audio.ambients.get(TEST_ZONES[0].id)?.gain?.gain?.lastTarget?.value;
  audio.toggleMute(true);
  const mutedValue = audio.master?.gain?.lastTarget?.value;
  audio.toggleMute(false);
  const unmutedValue = audio.master?.gain?.lastTarget?.value;
  const persistedVolume = localStorage.getItem('pattern-audio-volume');
  const persistedMute = localStorage.getItem('pattern-audio-muted');
  const passed =
    typeof masterAfterSet === 'number' &&
    masterAfterSet <= 0.31 &&
    typeof ambientTarget === 'number' &&
    mutedValue === 0 &&
    unmutedValue > 0 &&
    persistedVolume !== null &&
    persistedMute !== null;
  details.push(`Master volume target: ${masterAfterSet}`);
  details.push(`Ambient target near zone: ${ambientTarget}`);
  details.push(`Mute set to 0, unmuted target: ${unmutedValue}`);
  details.push(`localStorage volume=${persistedVolume}, muted=${persistedMute}`);
  return { name: 'Volume controls (master/ambient) + mute persistence', passed, details };
}

function testSpatialAudio(audio) {
  const details = [];
  const camera = { x: 500, y: 500 };
  audio.updateAmbientMix(camera, TEST_ZONES[0]);
  const listener = audio.ctx.listener;
  const listenerOk = listener.positionX.value === camera.x && listener.positionY.value === camera.y;
  const panner = audio.ambients.get(TEST_ZONES[0].id)?.panner;
  const pannerOk =
    panner &&
    Math.abs(panner.positionX.value - TEST_ZONES[0].position.x) < 0.01 &&
    Math.abs(panner.positionY.value - TEST_ZONES[0].position.y) < 0.01;
  const detailsText = `Listener (${listener.positionX.value}, ${listener.positionY.value}) | Zone panner (${panner?.positionX.value}, ${panner?.positionY.value})`;
  details.push(detailsText);
  return { name: 'Spatial positioning (camera → listener/panners)', passed: listenerOk && pannerOk, details };
}

function testMemoryCleanup(audio) {
  const originalNodes = Array.from(audio.ambients.values()).map(n => n.osc);
  audio.buildAmbients(); // rebuild should stop prior oscillators
  const stopped = originalNodes.every(node => node?.stopped);
  const rebuilt = audio.ambients.size === TEST_ZONES.length;
  const passed = stopped && rebuilt;
  const details = [`Previous oscillators stopped: ${stopped}`, `Ambients rebuilt: ${rebuilt}`];
  return { name: 'Memory management (node cleanup on rebuild)', passed, details };
}

function testPersistence() {
  const vol = localStorage.getItem('pattern-audio-volume');
  const muted = localStorage.getItem('pattern-audio-muted');
  const passed = vol !== null && muted !== null;
  const details = [`localStorage pattern-audio-volume=${vol}`, `localStorage pattern-audio-muted=${muted}`];
  return { name: 'Persistence (localStorage volume/mute)', passed, details };
}

async function runAudioTests() {
  const { audio, log, cleanup } = createAudioHarness();
  const results = [];
  try {
    results.push(testAmbientSoundscapes(audio));
    results.push(testDiscoveryCues(audio, log));
    results.push(testInteractionSounds(audio, log));
    results.push(testPortals(audio, log));
    results.push(testAnomalySubmission(audio, log));
    results.push(testVolumeAndMute(audio));
    results.push(testSpatialAudio(audio));
    results.push(testMemoryCleanup(audio));
    results.push(testPersistence());
  } catch (err) {
    results.push({ name: 'Test runner crashed', passed: false, details: [err?.message || String(err)] });
  } finally {
    cleanup();
  }
  return { results, log };
}

function renderReport(results) {
  const container = document.getElementById('report');
  container.innerHTML = '';
  results.forEach(result => {
    const card = document.createElement('div');
    card.className = `result ${result.passed ? 'pass' : 'fail'}`;
    const title = document.createElement('h3');
    title.textContent = `${result.passed ? '✅' : '❌'} ${result.name}`;
    const list = document.createElement('ul');
    result.details.forEach(detail => {
      const li = document.createElement('li');
      li.textContent = detail;
      list.appendChild(li);
    });
    card.appendChild(title);
    card.appendChild(list);
    container.appendChild(card);
  });
}

function wireControls() {
  const runBtn = document.getElementById('run-tests');
  runBtn.addEventListener('click', async () => {
    runBtn.disabled = true;
    runBtn.textContent = 'Running...';
    const { results } = await runAudioTests();
    renderReport(results);
    runBtn.disabled = false;
    runBtn.textContent = 'Run Audio Test Suite';
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  wireControls();
  const { results } = await runAudioTests();
  renderReport(results);
});
