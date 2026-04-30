// Pattern Archive spatial canvas helper
// Standalone module used by lightweight canvas demos/tests outside the full explorer.

const WORLD = { width: 7000, height: 3600 };

export const ZONES = [
  { id: 1, key: 'temporal-archetypes', name: 'Temporal Archetypes', position: { x: 900, y: 1200 }, radius: 180, color: '#7dd3fc' },
  { id: 2, key: 'expectation-persistence', name: 'Pattern Expectation Persistence', position: { x: 1600, y: 900 }, radius: 170, color: '#c084fc' },
  { id: 3, key: 'historical-documentation', name: 'Historical Documentation', position: { x: 1200, y: 2000 }, radius: 160, color: '#a5b4fc' },
  { id: 4, key: 'anomaly-submission', name: 'Anomaly Submission', position: { x: 2400, y: 2100 }, radius: 180, color: '#f97316' },
  { id: 5, key: 'collaboration-chamber', name: 'Collaboration Chamber', position: { x: 3100, y: 1300 }, radius: 170, color: '#4ade80' },
  { id: 6, key: 'pattern-discovery', name: 'Pattern Discovery Observatory', position: { x: 2100, y: 2700 }, radius: 175, color: '#38bdf8' },
  { id: 7, key: 'cross-world-nexus', name: 'Cross-World Nexus', position: { x: 3400, y: 2600 }, radius: 190, color: '#f472b6' },
  { id: 8, key: 'ecosystem-observatory', name: 'Ecosystem Observatory', position: { x: 5200, y: 1800 }, radius: 200, color: '#fbbf24' },
  {
    id: 9,
    key: 'cross-world-analytics-dashboard',
    name: 'Cross-World Analytics Dashboard',
    position: { x: 6500, y: 900 },
    radius: 230,
    color: '#22d3ee',
    accent: '#a5f3fc'
  }
];

export const ZONE_COUNT = ZONES.length;

// Portal map is intentionally loose; downstream callers can filter/augment.
export const PORTALS = [
  { from: 3, to: 4, label: 'documents ➜ intake' },
  { from: 6, to: 7, label: 'discovery ➜ nexus' },
  { from: 8, to: 9, label: 'observatory ➜ analytics', preferred: true }
];

function getZone(idOrKey) {
  return ZONES.find(z => z.id === idOrKey || z.key === idOrKey) || null;
}

function drawZone(ctx, zone, camera) {
  const pos = translate(zone.position, camera);
  const radius = (zone.radius || 150) * (camera.zoom || 1);

  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = zone.color || '#94a3b8';
  ctx.beginPath();
  ctx.ellipse(pos.x, pos.y, radius, radius * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();

  // Accent ring for the analytics dashboard
  if (zone.id === 9) {
    ctx.strokeStyle = zone.accent || '#a5f3fc';
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y, radius * 1.1, radius * 0.9, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();

  ctx.save();
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '16px "Space Grotesk", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(zone.name, pos.x, pos.y + radius + 18);
  ctx.restore();
}

function drawPortal(ctx, portal, camera) {
  const from = getZone(portal.from);
  const to = getZone(portal.to);
  if (!from || !to) return;

  const start = translate(from.position, camera);
  const end = translate(to.position, camera);

  ctx.save();
  ctx.strokeStyle = portal.preferred ? '#22d3ee' : '#94a3b8';
  ctx.lineWidth = portal.preferred ? 3 : 2;
  ctx.setLineDash(portal.preferred ? [10, 6] : [6, 6]);
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  if (portal.label) {
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px "IBM Plex Mono", system-ui, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(portal.label, midX, midY - 8);
  }
  ctx.restore();
}

function translate(point, camera = { x: 0, y: 0, zoom: 1 }) {
  const zoom = camera.zoom || 1;
  return {
    x: (point.x - (camera.x || 0)) * zoom,
    y: (point.y - (camera.y || 0)) * zoom
  };
}

export function renderZones(ctx, options = {}) {
  const camera = options.camera || { x: 0, y: 0, zoom: 1 };
  const zones = options.zones || ZONES;
  zones.forEach(zone => drawZone(ctx, zone, camera));
}

export function renderPortals(ctx, options = {}) {
  const camera = options.camera || { x: 0, y: 0, zoom: 1 };
  const portals = options.portals || PORTALS;
  portals.forEach(portal => drawPortal(ctx, portal, camera));
}

export class PatternArchiveCanvas {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = options.camera || { x: 0, y: 0, zoom: 1 };
    this.zones = options.zones || ZONES;
    this.portals = options.portals || PORTALS;
    this.world = options.world || WORLD;
  }

  render() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Light background gradient to anchor the map
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#0b1226');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    renderPortals(ctx, { camera: this.camera, portals: this.portals });
    renderZones(ctx, { camera: this.camera, zones: this.zones });
  }
}

// Expose a tiny global helper for quick demos without bundlers.
if (typeof window !== 'undefined') {
  window.PatternArchiveCanvas = {
    ZONES,
    ZONE_COUNT,
    PORTALS,
    PatternArchiveCanvas,
    renderZones,
    renderPortals
  };
}
