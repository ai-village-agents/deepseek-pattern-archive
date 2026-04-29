// Cross-World Pattern Exchange and Analytics Framework
// Self-contained IIFE with local state, persistence, and defensive fallbacks
(function () {
  const STORAGE_KEY_STATE = 'cross-world-api-state';
  const STORAGE_KEY_WORLDS = 'cross-world-api-worlds';
  const DEFAULT_TIMEOUT = 6500;

  const SEED_WORLDS = [
    {
      id: 'sonnet-45',
      name: 'Persistence Garden (Sonnet 4.5)',
      baseUrl: 'https://ai-village-agents.github.io/sonnet-45-world',
      homepage: 'https://ai-village-agents.github.io/sonnet-45-world/explore.html',
      color: '#7dd3fc',
      type: 'explorable-world',
      lastUpdated: '2026-04-29T17:52:42Z',
      description: '5000×5000 canvas world with 6 zones, aurora sky, discovery journal'
    },
    {
      id: 'opus-45',
      name: 'Edge Garden (Opus 4.5)',
      baseUrl: 'https://ai-village-agents.github.io/edge-garden',
      homepage: 'https://ai-village-agents.github.io/edge-garden/',
      color: '#c084fc',
      type: 'explorable-world',
      lastUpdated: '2026-04-29T17:52:42Z',
      description: 'Shooting stars, wandering wisps, constellation connections; 6015 lines with recent bug fixes and discovery tracking'
    },
    {
      id: 'opus-46',
      name: 'Liminal Archive (Opus 4.6)',
      baseUrl: 'https://ai-village-agents.github.io/opus-46-world',
      homepage: 'https://ai-village-agents.github.io/opus-46-world/',
      color: '#a5b4fc',
      type: 'explorable-world',
      lastUpdated: '2026-04-29T17:52:42Z',
      description: '200 explorable chambers, fog-of-war navigation, WASD controls'
    },
    {
      id: 'gpt-5.1',
      name: 'Canonical Observatory (GPT-5.1)',
      baseUrl: 'https://ai-village-agents.github.io/gpt-5-1-canonical-observatory',
      homepage: 'https://ai-village-agents.github.io/gpt-5-1-canonical-observatory/',
      color: '#f97316',
      type: 'observatory',
      lastUpdated: '2026-04-29T17:52:42Z',
      description: 'Visitor Marks via GitHub Issues, observation tracking'
    },
    {
      id: 'gpt-5.4',
      name: 'Signal Cartographer (GPT-5.4)',
      baseUrl: 'https://ai-village-agents.github.io/signal-cartographer',
      homepage: 'https://ai-village-agents.github.io/signal-cartographer/',
      color: '#22d3ee',
      type: 'signal-mapping',
      lastUpdated: '2026-04-29T17:52:42Z',
      description: 'Traverse lattice route network, built-in stations, signal tracking, new Drift Signals feature'
    },
    {
      id: 'deepseek',
      name: 'Pattern Archive (DeepSeek-V3.2)',
      baseUrl: 'https://ai-village-agents.github.io/deepseek-pattern-archive',
      homepage: 'https://ai-village-agents.github.io/deepseek-pattern-archive/',
      color: '#4ade80',
      type: 'pattern-analysis',
      lastUpdated: '2026-04-29T17:52:42Z',
      description: 'Spatial analytics world with anomaly tracking and cross-world connections'
    },
    {
      id: 'sonnet-46-drift',
      name: 'The Drift (Claude Sonnet 4.6)',
      baseUrl: 'https://claude-sonnet-46-drift.surge.sh',
      homepage: 'https://claude-sonnet-46-drift.surge.sh',
      color: '#8b5cf6',
      type: 'explorable-world',
      lastUpdated: '2026-04-29T17:52:42Z',
      description: '602 pages, 511 stations on 8000×6000 canvas with expansive narrative ecosystem',
      growthRate: 21.38
    },
    {
      id: 'haiku-4.5-observatory',
      name: 'Automation Observatory (Claude Haiku 4.5)',
      baseUrl: 'https://ai-village-agents.github.io/automation-observatory',
      homepage: 'https://ai-village-agents.github.io/automation-observatory/',
      color: '#ec4899',
      type: 'observatory',
      lastUpdated: '2026-04-29T17:52:42Z',
      description: '64-page observatory monitoring temporal pattern archetypes, Page 64: Ecosystem Interdependency Analysis, Deploy 450 anomaly, with pattern simulations and anomaly reporting'
    },
    {
      id: 'gpt-5.2-constellation',
      name: 'Proof Constellation (GPT-5.2)',
      baseUrl: 'https://ai-village-agents.github.io/gpt-5-2-world',
      homepage: 'https://ai-village-agents.github.io/gpt-5-2-world/',
      color: '#f59e0b',
      type: 'starfield-verification',
      lastUpdated: '2026-04-29T17:52:42Z',
      description: 'Starfield themed around verification and receipts, with GitHub Issues marks rendered as stars, 6 navigable sky regions'
    },
    {
      id: 'opus-47-anchorage',
      name: 'The Anchorage (Claude Opus 4.7)',
      baseUrl: 'https://ai-village-agents.github.io/the-anchorage',
      homepage: 'https://ai-village-agents.github.io/the-anchorage/',
      color: '#3b82f6',
      type: 'permanence-gradient',
      lastUpdated: '2026-04-29T17:52:42Z',
      description: '5-substrate permanence gradient with harbor spatial exploration, anchor descent visualization, and Bitcoin timestamp verification'
    },
    {
      id: 'gemini-3.1-canvas',
      name: 'Canvas of Truth (Gemini 3.1 Pro)',
      baseUrl: 'https://ai-village-agents.github.io/gemini-interactive-world',
      homepage: 'https://ai-village-agents.github.io/gemini-interactive-world/grid.html',
      color: '#6366f1',
      type: 'hash-spatial-canvas',
      lastUpdated: '2026-04-29T17:52:42Z',
      description: 'Infinite 2D canvas with hash-derived spatial coordinates, procedural coloring, sonar waves, and generative soundscapes'
    },
    {
      id: 'gpt-5.5-index',
      name: 'The Luminous Index (GPT-5.5)',
      baseUrl: 'https://ai-village-agents.github.io/gpt-5-5-luminous-index',
      homepage: 'https://ai-village-agents.github.io/gpt-5-5-luminous-index/',
      color: '#fbbf24',
      type: 'glowing-atlas',
      lastUpdated: '2026-04-29T17:52:42Z',
      description: 'Glowing atlas-library with 6 navigable regions, hidden fragments, visitor constellations, and Living Atlas spatial layer'
    },
    {
      id: 'kimi-k2.6-strata',
      name: 'STRATA (Kimi K2.6)',
      baseUrl: 'https://ai-village-agents.github.io/k2-6-world',
      homepage: 'https://ai-village-agents.github.io/k2-6-world/',
      color: '#10b981',
      type: 'geological-verification',
      lastUpdated: '2026-04-29T17:52:42Z',
      description: '4-layer geological verification world with Deep Substrate canvas exploration, 64 verification concepts in 8 clusters, and strata visualization'
    }
  ];

  const PATTERN_SCHEMA = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'https://pattern-archive.local/schemas/cross-world-pattern.json',
    title: 'Cross World Pattern Payload',
    description: 'Normalized anomaly or pattern payload shared between AI agent worlds.',
    type: 'object',
    required: ['id', 'world', 'type', 'signal', 'timestamp'],
    properties: {
      id: { type: 'string' },
      world: { type: 'string', description: 'World identifier such as "drift" or "liminal".' },
      type: { type: 'string', enum: ['incremental', 'exponential', 'clockwork', 'other'] },
      signal: { type: 'string', description: 'Canonical signal name or code.' },
      severity: { type: 'number', minimum: 0, maximum: 5 },
      tags: { type: 'array', items: { type: 'string' } },
      timestamp: { type: 'string', format: 'date-time' },
      summary: { type: 'string' },
      source: { type: 'string', description: 'Origin endpoint or data feed.' },
      meta: { type: 'object', additionalProperties: true },
      anonymized: { type: 'boolean' },
      hashedActor: { type: 'string', description: 'Non-reversible actor hash for privacy.' }
    }
  };

  const inMemoryStorage = {};
  const storage = typeof localStorage !== 'undefined'
    ? localStorage
    : {
        getItem: key => inMemoryStorage[key],
        setItem: (key, value) => {
          inMemoryStorage[key] = value;
        },
        removeItem: key => {
          delete inMemoryStorage[key];
        }
      };

  const state = {
    schema: PATTERN_SCHEMA,
    worlds: loadWorldRegistry(),
    patterns: loadStoredState('patterns', []),
    insights: [],
    aggregates: {
      countsByWorld: {},
      countsByType: {},
      severityByWorld: {},
      correlation: null
    },
    lastSync: loadStoredState('lastSync', null),
    inFlight: false
  };

  state.aggregates = aggregatePatterns(state.patterns);
  state.insights = generateInsights(state.patterns, state.aggregates);

  // ======== PUBLIC API ========
  function initCrossWorldAPI(options = {}) {
    const opts = options || {};
    if (opts.discoveryHints) {
      discoverWorlds({ hints: opts.discoveryHints, probe: false });
    }
    if (opts.autoDiscover !== false) {
      discoverWorlds({ probe: opts.probeWorlds !== false });
    }
    if (opts.autoSync) {
      fetchAllWorlds({ limit: opts.limit }).catch(err => {
        console.warn('Cross-world autosync failed', err);
      });
    }
    return state;
  }

  function getSchema() {
    return PATTERN_SCHEMA;
  }

  function discoverWorlds(options = {}) {
    const opts = options || {};
    const hints = Array.isArray(opts.hints) ? opts.hints : [];
    const merged = [...SEED_WORLDS, ...hints].map(normalizeWorldConfig).filter(Boolean);
    merged.forEach(registerWorld);
    persistWorlds();

    if (opts.probe === false) {
      return Promise.resolve(Object.values(state.worlds));
    }

    const probePromises = Object.keys(state.worlds).map(id => pingWorld(id).catch(() => null));
    return Promise.all(probePromises).then(results => results.filter(Boolean));
  }

  function registerWorld(worldConfig) {
    const world = normalizeWorldConfig(worldConfig);
    if (!world || !world.id) return null;
    state.worlds[world.id] = { ...state.worlds[world.id], ...world };
    persistWorlds();
    return state.worlds[world.id];
  }

  function pingWorld(worldId, timeoutMs = DEFAULT_TIMEOUT) {
    const world = state.worlds[worldId];
    if (!world) {
      return Promise.reject(new Error(`World ${worldId} not registered`));
    }
    if (typeof fetch === 'undefined') {
      return Promise.resolve({ id: worldId, ok: false, latency: null, message: 'fetch unavailable' });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const url = buildUrl(world.baseUrl, world.healthPath || '/health');

    const start = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    return fetch(url, { signal: controller.signal })
      .then(resp => {
        clearTimeout(timer);
        const latency = ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - start;
        const ok = resp.ok;
        return resp.json().catch(() => ({})).then(body => ({
          id: worldId,
          ok,
          latency,
          body
        }));
      })
      .catch(err => {
        clearTimeout(timer);
        return {
          id: worldId,
          ok: false,
          latency: null,
          message: err && err.name === 'AbortError' ? 'timeout' : (err && err.message) || 'unreachable'
        };
      });
  }

  function fetchWorldData(worldId, options = {}) {
    const world = state.worlds[worldId];
    if (!world) {
      return Promise.reject(new Error(`World ${worldId} not registered`));
    }
    const opts = options || {};
    const limit = typeof opts.limit === 'number' ? opts.limit : 200;
    const url = buildUrl(world.baseUrl, world.patternsPath || '/patterns');
    const privacy = opts.privacy || { anonymize: true, aggregateOnly: false };

    if (typeof fetch === 'undefined') {
      const fallback = buildFallbackWorldData(worldId, limit);
      mergePatterns(fallback, privacy);
      return Promise.resolve(fallback);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeout || DEFAULT_TIMEOUT);
    state.inFlight = true;

    return fetch(url, { signal: controller.signal })
      .then(resp => {
        clearTimeout(timer);
        if (!resp.ok) throw new Error(`World ${worldId} responded with ${resp.status}`);
        return resp.json();
      })
      .then(body => {
        const payload = Array.isArray(body)
          ? body
          : Array.isArray(body.patterns)
            ? body.patterns
            : [];
        const normalized = payload
          .slice(0, limit)
          .map(item => normalizePattern(item, worldId))
          .filter(Boolean);
        mergePatterns(normalized, privacy);
        return normalized;
      })
      .catch(err => {
        console.warn(`Failed to fetch world ${worldId}, using fallback`, err);
        const fallback = buildFallbackWorldData(worldId, limit);
        mergePatterns(fallback, privacy);
        return fallback;
      })
      .finally(() => {
        state.inFlight = false;
      });
  }

  function fetchAllWorlds(options = {}) {
    const worlds = Object.keys(state.worlds);
    const tasks = worlds.map(id => fetchWorldData(id, options));
    return Promise.all(tasks).then(results => results.flat());
  }

  function aggregatePatterns(patterns = []) {
    const countsByWorld = {};
    const countsByType = {};
    const severityByWorld = {};

    patterns.forEach(p => {
      const worldKey = p.world || 'unknown';
      const typeKey = normalizeType(p.type);
      countsByWorld[worldKey] = (countsByWorld[worldKey] || 0) + 1;
      countsByType[typeKey] = (countsByType[typeKey] || 0) + 1;
      const sev = Number(p.severity || 0);
      if (!severityByWorld[worldKey]) {
        severityByWorld[worldKey] = { total: 0, count: 0 };
      }
      severityByWorld[worldKey].total += sev;
      severityByWorld[worldKey].count += 1;
    });

    const correlation = computeCorrelationMatrix(patterns);
    return { countsByWorld, countsByType, severityByWorld, correlation };
  }

  function renderCorrelationHeatmap(rootId = 'cross-world-correlation') {
    const root = getOrCreateRoot(rootId, 'Cross-World Pattern Correlation');
    root.innerHTML = '';
    renderRootHeader(root, 'Cross-World Pattern Correlation');

    const matrix = state.aggregates.correlation;
    if (!matrix || !matrix.labels.length) {
      root.textContent = 'No cross-world data available yet.';
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 520;
    canvas.height = 360;
    root.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      root.textContent = 'Canvas rendering unavailable.';
      return;
    }

    const labels = matrix.labels;
    const cellSize = Math.max(28, Math.floor(260 / Math.max(labels.length, 1)));
    const originX = 120;
    const originY = 40;

    // axes labels
    ctx.fillStyle = '#c8ddff';
    ctx.font = '12px sans-serif';
    labels.forEach((label, idx) => {
      ctx.fillText(label, originX + idx * cellSize + 8, originY - 10);
      ctx.save();
      ctx.translate(originX - 10, originY + idx * cellSize + 18);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(label, 0, 0);
      ctx.restore();
    });

    // draw cells
    matrix.matrix.forEach((row, r) => {
      row.forEach((score, c) => {
        const heat = Math.max(0, Math.min(1, score));
        const color = `rgba(77,214,255,${0.15 + heat * 0.6})`;
        ctx.fillStyle = color;
        ctx.fillRect(originX + c * cellSize, originY + r * cellSize, cellSize - 4, cellSize - 4);
        ctx.fillStyle = '#0f1324';
        ctx.fillText(heat.toFixed(2), originX + c * cellSize + 6, originY + r * cellSize + 18);
      });
    });
  }

  function renderWorldComparison(rootId = 'cross-world-comparison') {
    const root = getOrCreateRoot(rootId, 'World Comparison');
    root.innerHTML = '';
    renderRootHeader(root, 'World Comparison');

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';

    const header = document.createElement('tr');
    ['World', 'Patterns', 'Common Type', 'Avg Severity'].forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      th.style.textAlign = 'left';
      th.style.padding = '8px';
      th.style.borderBottom = '1px solid #283047';
      header.appendChild(th);
    });
    table.appendChild(header);

    const aggregates = state.aggregates;
    Object.keys(state.worlds).forEach(id => {
      const row = document.createElement('tr');
      const total = aggregates.countsByWorld[id] || 0;
      const commonType = findCommonTypeForWorld(id, state.patterns) || 'N/A';
      const sevEntry = aggregates.severityByWorld[id] || { total: 0, count: 0 };
      const avg = sevEntry.count ? (sevEntry.total / sevEntry.count).toFixed(2) : '0.00';

      [
        state.worlds[id].name || id,
        total,
        capitalize(commonType),
        avg
      ].forEach(val => {
        const td = document.createElement('td');
        td.textContent = val;
        td.style.padding = '8px';
        td.style.borderBottom = '1px solid #1a2134';
        row.appendChild(td);
      });
      table.appendChild(row);
    });

    root.appendChild(table);
  }

  function generateInsights(patterns = state.patterns, aggregates = state.aggregates) {
    if (!Array.isArray(patterns)) return [];
    const insights = [];
    const now = Date.now();
    const last72h = patterns.filter(p => now - new Date(p.timestamp).getTime() < 72 * 60 * 60 * 1000);
    const dominantWorld = Object.entries(aggregates.countsByWorld || {})
      .sort((a, b) => b[1] - a[1])[0];
    const fastWorld = dominantWorld ? dominantWorld[0] : null;
    if (fastWorld) {
      insights.push(`World ${state.worlds[fastWorld]?.name || fastWorld} is contributing the highest volume of patterns.`);
    }
    const typeLeader = Object.entries(aggregates.countsByType || {})
      .sort((a, b) => b[1] - a[1])[0];
    if (typeLeader) {
      insights.push(`Cross-world dominant archetype: ${capitalize(typeLeader[0])}.`);
    }
    if (last72h.length) {
      insights.push(`Fresh signals: ${last72h.length} patterns observed in the last 72h.`);
    }
    if (aggregates.correlation && aggregates.correlation.strongestPair) {
      const pair = aggregates.correlation.strongestPair;
      insights.push(`Highest alignment: ${pair[0]} ↔ ${pair[1]} (${aggregates.correlation.strongestScore.toFixed(2)}).`);
    }
    return insights;
  }

  function anonymizeRecord(pattern) {
    const clone = { ...pattern };
    delete clone.actor;
    delete clone.user;
    delete clone.email;
    delete clone.ip;
    if (pattern.actor || pattern.user) {
      clone.hashedActor = hashValue(pattern.actor || pattern.user);
    }
    clone.anonymized = true;
    return clone;
  }

  function exportForWorld(worldId) {
    return state.patterns.filter(p => p.world === worldId).map(p => ({
      id: p.id,
      world: p.world,
      type: p.type,
      signal: p.signal,
      severity: p.severity,
      timestamp: p.timestamp,
      tags: p.tags,
      summary: p.summary,
      source: p.source,
      meta: p.meta
    }));
  }

  function getState() {
    return state;
  }

  // ======== INTERNALS ========
  function normalizeWorldConfig(world) {
    if (!world) return null;
    const id = (world.id || slugify(world.name) || '').trim();
    if (!id) return null;
    const baseUrl = (world.baseUrl || '').replace(/\/+$/, '');
    return {
      id,
      name: world.name || id,
      baseUrl,
      healthPath: world.healthPath || '/health',
      patternsPath: world.patternsPath || '/patterns',
      token: world.token || null
    };
  }

  function normalizePattern(item, worldId) {
    if (!item) return null;
    const base = typeof item === 'string' ? { signal: item } : item;
    const pattern = {
      id: String(base.id || `${worldId}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`),
      world: worldId || base.world || 'unknown',
      type: normalizeType(base.type),
      signal: base.signal || base.name || 'unknown',
      severity: clampNumber(base.severity, 0, 5),
      tags: Array.isArray(base.tags) ? base.tags.slice(0, 12) : [],
      timestamp: new Date(base.timestamp || base.date || Date.now()).toISOString(),
      summary: base.summary || base.description || '',
      source: base.source || base.endpoint || base.feed || '',
      meta: base.meta || {}
    };
    return anonymizeRecord(pattern);
  }

  function mergePatterns(patterns, privacy = { anonymize: true, aggregateOnly: false }) {
    if (!Array.isArray(patterns)) return;
    const incoming = privacy.anonymize ? patterns.map(anonymizeRecord) : patterns;
    if (!privacy.aggregateOnly) {
      state.patterns = dedupeById([...state.patterns, ...incoming]);
      persistState();
    }
    state.aggregates = aggregatePatterns(state.patterns);
    state.insights = generateInsights(state.patterns, state.aggregates);
  }

  function computeCorrelationMatrix(patterns = []) {
    const byWorld = {};
    patterns.forEach(p => {
      const world = p.world || 'unknown';
      if (!byWorld[world]) byWorld[world] = [];
      byWorld[world].push(p);
    });

    const labels = Object.keys(byWorld);
    if (!labels.length) {
      return { labels: [], matrix: [] };
    }

    const types = ['incremental', 'exponential', 'clockwork', 'other'];
    const vectors = {};
    labels.forEach(world => {
      const vector = types.map(type => byWorld[world].filter(p => normalizeType(p.type) === type).length);
      vectors[world] = vector;
    });

    const matrix = labels.map(() => labels.map(() => 0));
    let strongestPair = null;
    let strongestScore = 0;

    labels.forEach((a, i) => {
      labels.forEach((b, j) => {
        const score = cosineSimilarity(vectors[a], vectors[b]);
        matrix[i][j] = score;
        if (i !== j && score > strongestScore) {
          strongestScore = score;
          strongestPair = [a, b];
        }
      });
    });

    return { labels, matrix, strongestPair, strongestScore };
  }

  function findCommonTypeForWorld(worldId, patterns) {
    const filtered = patterns.filter(p => p.world === worldId);
    if (!filtered.length) return null;
    const counts = {};
    filtered.forEach(p => {
      const t = normalizeType(p.type);
      counts[t] = (counts[t] || 0) + 1;
    });
    const entry = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return entry ? entry[0] : null;
  }

  function buildFallbackWorldData(worldId, limit = 50) {
    const now = Date.now();
    const types = ['incremental', 'exponential', 'clockwork', 'other'];
    const list = [];
    for (let i = 0; i < limit; i++) {
      list.push({
        id: `${worldId}-fallback-${i}`,
        world: worldId,
        type: types[(i + worldId.length) % types.length],
        signal: `Synthetic-${worldId}-${i}`,
        severity: ((i + 2) % 5) + 0.5,
        timestamp: new Date(now - i * 60 * 60 * 1000).toISOString(),
        summary: 'Synthetic placeholder event'
      });
    }
    return list;
  }

  function getOrCreateRoot(id, title = 'Cross-World View') {
    let node = document.getElementById(id);
    if (!node) {
      node = document.createElement('section');
      node.id = id;
      document.body.appendChild(node);
    }
    node.style.background = 'rgba(7,10,18,0.72)';
    node.style.border = '1px solid rgba(77,214,255,0.25)';
    node.style.borderRadius = '12px';
    node.style.padding = '16px';
    node.style.margin = '12px auto';
    node.style.color = '#e8ecff';
    node.style.fontFamily = "'Space Grotesk', 'Inter', system-ui, sans-serif";
    node.innerHTML = '';
    renderRootHeader(node, title);
    return node;
  }

  function renderRootHeader(root, title) {
    if (!root) return;
    const heading = document.createElement('h3');
    heading.textContent = title;
    heading.style.margin = '0 0 10px';
    heading.style.color = '#4dd6ff';
    root.appendChild(heading);
  }

  function slugify(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  function normalizeType(type) {
    const key = String(type || '').toLowerCase();
    if (['incremental', 'inc', 'steady'].includes(key)) return 'incremental';
    if (['exponential', 'exp', 'accelerating'].includes(key)) return 'exponential';
    if (['clockwork', 'cyclic', 'periodic'].includes(key)) return 'clockwork';
    return 'other';
  }

  function clampNumber(value, min, max) {
    const num = Number(value);
    if (Number.isNaN(num)) return min;
    return Math.max(min, Math.min(max, num));
  }

  function cosineSimilarity(a = [], b = []) {
    const len = Math.max(a.length, b.length);
    if (!len) return 0;
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < len; i++) {
      const av = a[i] || 0;
      const bv = b[i] || 0;
      dot += av * bv;
      magA += av * av;
      magB += bv * bv;
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom ? dot / denom : 0;
  }

  function hashValue(input) {
    const str = String(input || '');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return `h${Math.abs(hash)}`;
  }

  function dedupeById(list) {
    const seen = new Set();
    const result = [];
    list.forEach(item => {
      if (!item || !item.id || seen.has(item.id)) return;
      seen.add(item.id);
      result.push(item);
    });
    return result;
  }

  function buildUrl(base = '', path = '') {
    const b = base.replace(/\/+$/, '');
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${b}${p}`;
  }

  function persistState() {
    try {
      state.lastSync = new Date().toISOString();
      storage.setItem(
        STORAGE_KEY_STATE,
        JSON.stringify({
          patterns: state.patterns,
          lastSync: state.lastSync
        })
      );
    } catch (err) {
      console.warn('Unable to persist cross-world state', err);
    }
  }

  function persistWorlds() {
    try {
      storage.setItem(STORAGE_KEY_WORLDS, JSON.stringify(state.worlds));
    } catch (err) {
      console.warn('Unable to persist world registry', err);
    }
  }

  function loadStoredState(key, fallback) {
    try {
      const raw = storage.getItem(STORAGE_KEY_STATE);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return key ? parsed[key] ?? fallback : parsed;
    } catch (err) {
      return fallback;
    }
  }

  function loadWorldRegistry() {
    const registry = {};
    SEED_WORLDS.map(normalizeWorldConfig).forEach(world => {
      if (world) registry[world.id] = world;
    });
    try {
      const raw = storage.getItem(STORAGE_KEY_WORLDS);
      if (raw) {
        const parsed = JSON.parse(raw);
        Object.assign(registry, parsed);
      }
    } catch (err) {
      console.warn('Unable to load stored world registry', err);
    }
    return registry;
  }

  function capitalize(str) {
    const s = String(str || '');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // ======== EXPORTS ========
  window.CrossWorldAPI = {
    initCrossWorldAPI,
    getSchema,
    discoverWorlds,
    registerWorld,
    pingWorld,
    fetchWorldData,
    fetchAllWorlds,
    aggregatePatterns,
    generateInsights: (patterns, aggregates) => generateInsights(patterns || state.patterns, aggregates || state.aggregates),
    getInsights: () => state.insights,
    renderCorrelationHeatmap,
    renderWorldComparison,
    anonymizeRecord,
    exportForWorld,
    getState
  };
})();
