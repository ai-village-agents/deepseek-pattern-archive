// Data integration helpers for the Spatial Explorer.
// Pulls live datasets from the existing Pattern Archive modules so the world
// reflects real activity instead of static placeholders.

const MODULE_PATHS = {
  'analyticsState': 'js/analytics.js',
  'PatternDiscovery': 'js/pattern-discovery.js',
  'CrossWorldAPI': 'js/cross-world-api.js',
  'Collaboration': 'js/collaboration.js',
  'GitHubIssues': 'js/github-issues.js'
};

// Function to ensure Pattern Archive modules are loaded as regular scripts (not ES modules)
export async function ensureModulesLoaded() {
  const modulesNeeded = Object.entries(MODULE_PATHS).filter(([globalName]) => !window[globalName]);
  
  if (modulesNeeded.length === 0) {
    return Promise.resolve();
  }
  
  console.log('Injecting scripts for missing modules:', modulesNeeded.map(([name]) => name).join(', '));
  
  const promises = modulesNeeded.map(([globalName, path]) => {
    return new Promise((resolve) => {
      // Check if already loaded after previous injections
      if (window[globalName]) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = path;
      script.onload = () => {
        // Wait briefly for IIFE to execute and expose to window
        setTimeout(() => {
          if (window[globalName]) {
            console.log(`✅ Module '${globalName}' loaded successfully`);
          } else {
            console.warn(`⚠️ Module '${globalName}' may not have exposed itself to window`);
          }
          resolve();
        }, 50);
      };
      script.onerror = (err) => {
        console.error(`Failed to load module: ${path}`, err);
        resolve(); // Still resolve to avoid blocking
      };
      document.head.appendChild(script);
    });
  });
  
  await Promise.all(promises);
  
  // Retry check after all scripts loaded
  return new Promise((resolve) => {
    setTimeout(resolve, 100);
  });
}

const DEFAULT_TIME_WINDOW = 7 * 24 * 60 * 60 * 1000;

export async function fetchAnomalyData() {
  await ensureModulesLoaded();
  
  let anomalies = [];
  let source = 'local';
  let message = '';

  if (window.GitHubIssues?.loadAnomalies) {
    try {
      const res = await window.GitHubIssues.loadAnomalies();
      anomalies = res.anomalies || [];
      source = res.source || source;
      message = res.message || message;
    } catch (err) {
      message = err?.message || '';
    }
  }

  if (!anomalies.length && window.analyticsState?.anomalies?.length) {
    anomalies = window.analyticsState.anomalies;
    source = 'analytics-cache';
  }

  if (!anomalies.length) {
    anomalies = [];
    source = source || 'fallback';
  }

  return { anomalies, source, message };
}

export async function fetchAnalyticsSnapshot(anomaliesInput) {
  await ensureModulesLoaded();
  
  const data = anomaliesInput || (await fetchAnomalyData());
  const anomalies = data.anomalies || [];
  const filtered =
    typeof window.applyAnalyticsFilters === 'function'
      ? window.applyAnalyticsFilters(anomalies)
      : anomalies;

  if (window.analyticsState) {
    window.analyticsState.anomalies = anomalies;
    window.analyticsState.filtered = filtered;
  }

  return {
    anomalies,
    filtered,
    source: data.source,
    message: data.message,
    stats: buildStats(filtered),
    timeline: buildTimeline(filtered),
    byType: buildTypeCounts(filtered)
  };
}

export async function fetchPatternDiscoveries(anomalies, crossWorldData = null) {
  await ensureModulesLoaded();
  
  const anomalyData = anomalies || (await fetchAnomalyData());
  if (!window.PatternDiscovery?.analyzeAnomalies) {
    return { patterns: [], clusters: [], correlations: [], insights: [], summary: null };
  }
  return window.PatternDiscovery.analyzeAnomalies(anomalyData.anomalies, {
    crossWorldData
  });
}

export async function fetchCrossWorldData() {
  await ensureModulesLoaded();
  
  if (!window.CrossWorldAPI?.initCrossWorldAPI) {
    return { worlds: [], insights: [], aggregates: {}, patterns: [] };
  }
  window.CrossWorldAPI.initCrossWorldAPI({ autoDiscover: true, autoSync: false, probeWorlds: false });
  const worlds = await window.CrossWorldAPI.discoverWorlds({ probe: false }).catch(() => []);
  const state = window.CrossWorldAPI.getState ? window.CrossWorldAPI.getState() : {};
  const patterns = await window.CrossWorldAPI.fetchAllWorlds({ limit: 50 }).catch(() => []);
  const aggregates = window.CrossWorldAPI.aggregatePatterns
    ? window.CrossWorldAPI.aggregatePatterns(patterns)
    : {};
  const insights = window.CrossWorldAPI.generateInsights
    ? window.CrossWorldAPI.generateInsights(patterns, aggregates)
    : [];
  return { worlds, patterns, aggregates, insights, state };
}

export async function fetchCollaborationData(anomalies = []) {
  await ensureModulesLoaded();
  
  if (!window.Collaboration?.initCollaboration) {
    return { metrics: null, recent: [] };
  }
  window.Collaboration.initCollaboration({ anomalies });
  const metrics = window.Collaboration.getMetrics ? window.Collaboration.getMetrics() : null;
  const recent = window.Collaboration.getRecentDiscussions
    ? window.Collaboration.getRecentDiscussions(6)
    : [];
  return { metrics, recent };
}

export async function loadArchiveData() {
  await ensureModulesLoaded();
  
  const anomalyData = await fetchAnomalyData();
  const analytics = await fetchAnalyticsSnapshot(anomalyData);
  const crossWorld = await fetchCrossWorldData();
  const discoveries = await fetchPatternDiscoveries(anomalyData, crossWorld);
  const collaboration = await fetchCollaborationData(anomalyData.anomalies);
  return { anomalyData, analytics, crossWorld, discoveries, collaboration };
}

function buildTimeline(anomalies = []) {
  const buckets = new Map();
  const now = Date.now();
  anomalies.forEach(entry => {
    const ts = new Date(entry.timestamp || entry.date || now).getTime();
    const dayKey = new Date(ts).toISOString().slice(0, 10);
    if (!buckets.has(dayKey)) buckets.set(dayKey, 0);
    buckets.set(dayKey, buckets.get(dayKey) + 1);
  });
  return Array.from(buckets.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([day, count]) => ({ day, count }));
}

function buildTypeCounts(anomalies = []) {
  const counts = {};
  anomalies.forEach(entry => {
    const t = normalizeType(entry.type);
    counts[t] = (counts[t] || 0) + 1;
  });
  return counts;
}

function buildStats(anomalies = []) {
  const total = anomalies.length;
  const averageSeverity = total
    ? anomalies.reduce((sum, a) => sum + (Number(a.severity) || 0), 0) / total
    : 0;
  const velocity = computeVelocity(anomalies);
  const last = anomalies
    .map(a => new Date(a.timestamp || a.date || a.created_at).getTime())
    .filter(Boolean)
    .sort((a, b) => b - a)[0];
  return {
    total,
    averageSeverity: Number(averageSeverity.toFixed(2)),
    velocity,
    lastSeen: last ? new Date(last).toISOString() : null
  };
}

function computeVelocity(anomalies = []) {
  const now = Date.now();
  const recent = anomalies.filter(a => {
    const ts = new Date(a.timestamp || a.date || now).getTime();
    return now - ts <= DEFAULT_TIME_WINDOW;
  });
  return Number(((recent.length / (DEFAULT_TIME_WINDOW / (24 * 60 * 60 * 1000))).toFixed(2)));
}

function normalizeType(value) {
  const t = String(value || 'other').toLowerCase();
  if (t.includes('clock')) return 'clockwork';
  if (t.includes('expo')) return 'exponential';
  if (t.includes('increment')) return 'incremental';
  return t || 'other';
}
