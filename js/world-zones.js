import { loadArchiveData } from './world-data.js';

export const WORLD_DIMENSIONS = {
  width: 3400,
  height: 2300
};

export async function createZones() {
  const zones = [
    {
      id: 'temporal-archetypes',
      name: 'Temporal Archetypes Zone',
      position: { x: 620, y: 520 },
      radius: 230,
      color: '#7dd3fc',
      accent: '#ecfeff',
      content: 'Three time philosophies rendered as floating clockwork shards. Expect cyan and magenta trails pulsing to the rhythm of resilience, volatility, and speed.',
      cue: 'Faint ticking with occasional glitch pops. Light beams sweep through rotating prisms.',
      elements: [
        { type: 'orb', height: 18, wobble: 0.7 },
        { type: 'prism', height: 22, wobble: 0.5 },
        { type: 'ring', height: 12, wobble: 1.2 }
      ]
    },
    {
      id: 'persistence-simulation',
      name: 'Pattern Expectation Persistence Simulation Zone',
      position: { x: 1200, y: 420 },
      radius: 210,
      color: '#c084fc',
      accent: '#f5d0fe',
      content: 'Deploy 450 lives here as an interactive sculpture: twin helix ribbons showing expectation vs. reality, with a missing segment that glows brighter when you stare at it.',
      cue: 'Low hum, rising when you approach. The case study spins slowly and leaves magenta halos.',
      sculpture: {
        loops: 450,
        missingIndex: 450,
        layers: 6
      }
    },
    {
      id: 'historical-documentation',
      name: 'Historical Documentation Zone',
      position: { x: 400, y: 1150 },
      radius: 190,
      color: '#a5b4fc',
      accent: '#e0e7ff',
      content: 'Documentation crystals float here. Each facet contains a case file; when you get close, the facet opens and streams text.',
      cue: 'Paper rustle mixed with radio static. Floating glyphs orbit the crystals.',
      artifacts: 9
    },
    {
      id: 'anomaly-submission',
      name: 'Anomaly Submission Zone',
      position: { x: 1700, y: 1400 },
      radius: 220,
      color: '#f97316',
      accent: '#ffedd5',
      content: 'A glowing portal inviting new anomalies. Drop a mark to record your find; the portal echoes and stores your trace.',
      cue: 'Bassy portal heartbeat; embers drift outward.',
      portal: true
    },
    {
      id: 'analytics-dashboard',
      name: 'Analytics Dashboard Zone',
      position: { x: 2450, y: 720 },
      radius: 210,
      color: '#22d3ee',
      accent: '#a5f3fc',
      content: 'A floating holographic board showing live metrics: cadence, failure rate, prediction accuracy. Touch to project sparklines.',
      cue: 'Glass clicks and UI beeps shimmer here.',
      charts: ['cadence', 'resilience', 'accuracy']
    },
    {
      id: 'collaboration-chamber',
      name: 'Collaboration Chamber Zone',
      position: { x: 2600, y: 1400 },
      radius: 190,
      color: '#4ade80',
      accent: '#dcfce7',
      content: 'Shared discussion bubbles drift around; proximity lets you hear fragments and contribute your own.',
      cue: 'Soft chorus of voices; bubbles expand when nudged.',
      bubbles: 7
    },
    {
      id: 'pattern-discovery',
      name: 'Pattern Discovery Observatory Zone',
      position: { x: 950, y: 1850 },
      radius: 200,
      color: '#38bdf8',
      accent: '#bae6fd',
      content: 'Automated detection beams sweep for anomalies, drawing constellation-like edges over detected clusters.',
      cue: 'Scanner sweeps with bright pings; speckled particle webs.',
      sweep: true
    },
    {
      id: 'cross-world-nexus',
      name: 'Cross-World Nexus Zone',
      position: { x: 3050, y: 1900 },
      radius: 220,
      color: '#f472b6',
      accent: '#fce7f3',
      content: 'Distant portals to other agent worlds flicker here. Each portal shows a faint preview of activity elsewhere.',
      cue: 'Windy chorus, spatialized whispers; portal rims flare when aligned.',
      portals: 4
    }
  ];

  const archiveData = await loadArchiveData();

  const enriched = zones.map(zone => {
    const liveData = {};
    if (zone.id === 'temporal-archetypes') {
      liveData.temporalSeries = archiveData.analytics.timeline;
      liveData.typeCounts = archiveData.analytics.byType;
      liveData.totalSubmissions = archiveData.analytics.stats.total;
    }
    if (zone.id === 'analytics-dashboard') {
      liveData.analytics = archiveData.analytics;
    }
    if (zone.id === 'pattern-discovery') {
      liveData.discovery = {
        patterns: archiveData.discoveries.patterns,
        clusters: archiveData.discoveries.clusters,
        insights: archiveData.discoveries.insights
      };
    }
    if (zone.id === 'cross-world-nexus') {
      liveData.crossWorld = {
        worlds: archiveData.crossWorld.worlds,
        aggregates: archiveData.crossWorld.aggregates,
        insights: archiveData.crossWorld.insights
      };
    }
    if (zone.id === 'collaboration-chamber') {
      liveData.collaboration = archiveData.collaboration;
    }
    if (zone.id === 'anomaly-submission') {
      liveData.anomalies = archiveData.anomalyData;
    }
    return { ...zone, liveData };
  });

  // Slight noise in placement to avoid perfect grid feel.
  return enriched.map(zone => ({
    ...zone,
    position: {
      x: zone.position.x + Math.random() * 24 - 12,
      y: zone.position.y + Math.random() * 24 - 12
    }
  }));
}
