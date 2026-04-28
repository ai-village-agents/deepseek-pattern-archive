import { WORLD_DIMENSIONS } from './world-zones.js';

const PARTICLE_COUNT = 140;
const STARFIELD_COUNT = 320;

export class CanvasRenderer {
  constructor(canvas, minimapCanvas, zones, marks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.minimapCanvas = minimapCanvas;
    this.minimapCtx = minimapCanvas?.getContext('2d') || null;
    this.zones = zones;
    this.marks = marks;
    this.time = 0;
    this.displayWidth = canvas.clientWidth;
    this.displayHeight = canvas.clientHeight;
    this.particles = this.createParticles(PARTICLE_COUNT, 20);
    this.starfield = this.createParticles(STARFIELD_COUNT, 40, true);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const targetWidth = Math.max(3200, window.innerWidth * dpr);
    const targetHeight = Math.max(2000, window.innerHeight * dpr);
    this.canvas.width = targetWidth;
    this.canvas.height = targetHeight;
    this.displayWidth = this.canvas.clientWidth || window.innerWidth;
    this.displayHeight = this.canvas.clientHeight || window.innerHeight;

    if (this.minimapCtx && this.minimapCanvas) {
      const miniScale = window.innerWidth < 640 ? 0.65 : 1;
      this.minimapCanvas.width = 240 * miniScale;
      this.minimapCanvas.height = 160 * miniScale;
    }
  }

  createParticles(count, speed, isStarfield = false) {
    return new Array(count).fill(0).map(() => ({
      x: Math.random() * WORLD_DIMENSIONS.width,
      y: Math.random() * WORLD_DIMENSIONS.height,
      speed: (Math.random() * 0.5 + 0.5) * speed,
      size: isStarfield ? Math.random() * 1.5 + 0.2 : Math.random() * 3 + 1,
      drift: Math.random() * 0.6 - 0.3
    }));
  }

  render(camera, activeZone, discoveredZoneIds) {
    this.time += 0.016;
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.translate(this.displayWidth / 2, this.displayHeight / 2);
    this.ctx.scale(1, 1);
    this.ctx.scale(camera.zoom, camera.zoom);
    this.ctx.translate(-camera.x, -camera.y);

    this.drawBackground(camera);
    this.drawStarfield(camera);
    this.drawAtmosphere(camera);
    this.drawZones(camera, activeZone, discoveredZoneIds);
    this.drawMarks();

    this.ctx.restore();
    this.drawMinimap(camera, activeZone, discoveredZoneIds);
  }

  drawBackground(camera) {
    const gradient = this.ctx.createLinearGradient(
      camera.x - 400,
      camera.y - 400,
      camera.x + 400,
      camera.y + 600
    );
    gradient.addColorStop(0, '#05070e');
    gradient.addColorStop(1, '#0b1226');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(
      camera.x - this.displayWidth * 2,
      camera.y - this.displayHeight * 2,
      this.displayWidth * 4,
      this.displayHeight * 4
    );
  }

  drawStarfield(camera) {
    this.ctx.save();
    this.ctx.globalAlpha = 0.35;
    this.ctx.fillStyle = '#94a3b8';
    for (const star of this.starfield) {
      const flicker = 0.4 + Math.sin(this.time * 1.5 + star.x * 0.01) * 0.2;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size * flicker, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  drawAtmosphere(camera) {
    this.ctx.save();
    this.ctx.globalAlpha = 0.25;
    this.ctx.fillStyle = '#0ea5e9';
    const driftScale = 0.05;
    for (const p of this.particles) {
      const dx = Math.sin((this.time + p.x) * 0.002) * p.drift;
      const dy = Math.cos((this.time + p.y) * 0.002) * p.drift;
      const x = (p.x + dx * 30 + this.time * 0.6 * driftScale) % WORLD_DIMENSIONS.width;
      const y = (p.y + dy * 30 + this.time * 0.6 * driftScale) % WORLD_DIMENSIONS.height;
      const size = p.size + Math.sin(this.time * 0.5 + p.x * 0.002) * 0.5;
      this.ctx.beginPath();
      this.ctx.ellipse(x, y, size * 2.2, size, 0, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  drawZones(camera, activeZone, discoveredZoneIds) {
    for (const zone of this.zones) {
      const depth = 1 + Math.sin((this.time + zone.position.x) * 0.3) * 0.03;
      const baseRadius = zone.radius * depth;
      const distance = Math.hypot(camera.x - zone.position.x, camera.y - zone.position.y);
      const highlight = activeZone?.id === zone.id;
      const discovered = discoveredZoneIds.has(zone.id);

      // Outer glow
      const gradient = this.ctx.createRadialGradient(
        zone.position.x,
        zone.position.y,
        baseRadius * 0.3,
        zone.position.x,
        zone.position.y,
        baseRadius * 1.6
      );
      gradient.addColorStop(0, `${zone.color}40`);
      gradient.addColorStop(1, '#00000000');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(
        zone.position.x - baseRadius * 2,
        zone.position.y - baseRadius * 2,
        baseRadius * 4,
        baseRadius * 4
      );

      // Core disc
      this.ctx.save();
      this.ctx.translate(zone.position.x, zone.position.y);
      this.ctx.rotate(Math.sin(this.time * 0.3 + zone.position.x * 0.01) * 0.06);
      this.ctx.fillStyle = highlight ? zone.accent : zone.color;
      this.ctx.globalAlpha = 0.85;
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, baseRadius, baseRadius * 0.82, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();

      // Floating elements / visualizations
      this.ctx.save();
      this.ctx.translate(zone.position.x, zone.position.y);
      this.ctx.strokeStyle = zone.accent;
      this.ctx.lineWidth = 2;
      this.ctx.globalAlpha = discovered ? 0.9 : 0.55;

      if (zone.elements) {
        zone.elements.forEach((element, idx) => {
          const wobble = Math.sin(this.time * 0.8 + idx) * (element.wobble || 0.6) * 8;
          this.drawFloatingShape(baseRadius * 0.5 + idx * 10, element.type, wobble);
        });
      }

      if (zone.sculpture) {
        const wobble = Math.sin(this.time) * 6;
        for (let i = 0; i < zone.sculpture.layers; i++) {
          const phase = (this.time * 0.6 + i) % Math.PI * 2;
          this.ctx.beginPath();
          for (let t = 0; t < Math.PI * 2; t += 0.25) {
            const r = baseRadius * 0.55 + Math.sin(t * 3 + phase) * 18;
            const x = Math.cos(t) * r;
            const y = Math.sin(t) * r * 0.6 + wobble * 0.3;
            if (t === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
          }
          this.ctx.closePath();
          this.ctx.stroke();
        }
      }

      if (zone.artifacts) {
        for (let i = 0; i < zone.artifacts; i++) {
          const angle = (Math.PI * 2 * i) / zone.artifacts + this.time * 0.2;
          const dist = baseRadius * 0.6;
          const x = Math.cos(angle) * dist;
          const y = Math.sin(angle) * dist * 0.7;
          this.drawCrystal(x, y, highlight);
        }
      }

      if (zone.portal) {
        this.drawPortal(baseRadius, highlight);
      }

      if (zone.charts) {
        zone.charts.forEach((chart, idx) => this.drawChart(baseRadius, chart, idx));
      }

      if (zone.bubbles) {
        this.drawBubbles(baseRadius, zone.bubbles);
      }

      if (zone.sweep) {
        this.drawSweep(baseRadius);
      }

      if (zone.portals) {
        this.drawDistantPortals(baseRadius, zone.portals);
      }

      if (zone.liveData) {
        this.drawZoneData(zone, baseRadius);
      }

      this.ctx.restore();

      // Zone label
      this.ctx.save();
      this.ctx.fillStyle = '#e2e8f0';
      this.ctx.globalAlpha = discovered ? 1 : 0.65;
      this.ctx.font = '16px "Space Grotesk", system-ui, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(zone.name, zone.position.x, zone.position.y + baseRadius + 22);
      this.ctx.restore();

      // Discovery pulse
      if (highlight) {
        const pulse = (Math.sin(this.time * 4) + 1) * 0.4 + 0.4;
        this.ctx.save();
        this.ctx.strokeStyle = zone.accent;
        this.ctx.lineWidth = 3;
        this.ctx.globalAlpha = 0.6;
        this.ctx.beginPath();
        this.ctx.arc(zone.position.x, zone.position.y, baseRadius * pulse * 1.05, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
      }
    }
  }

  drawFloatingShape(r, type, wobble) {
    switch (type) {
      case 'orb':
        this.ctx.beginPath();
        this.ctx.arc(wobble, 0, 12, 0, Math.PI * 2);
        this.ctx.stroke();
        break;
      case 'prism':
        this.ctx.beginPath();
        this.ctx.moveTo(-r * 0.5 + wobble, -r * 0.1);
        this.ctx.lineTo(r * 0.2 + wobble, -r * 0.6);
        this.ctx.lineTo(r * 0.8 + wobble, r * 0.1);
        this.ctx.lineTo(-r * 0.2 + wobble, r * 0.6);
        this.ctx.closePath();
        this.ctx.stroke();
        break;
      case 'ring':
      default:
        this.ctx.beginPath();
        this.ctx.ellipse(wobble, 0, r * 0.4, r * 0.25, 0, 0, Math.PI * 2);
        this.ctx.stroke();
        break;
    }
  }

  drawCrystal(x, y, highlight) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(Math.sin(this.time * 0.7 + x * 0.01) * 0.4);
    this.ctx.beginPath();
    this.ctx.moveTo(0, -16);
    this.ctx.lineTo(12, 0);
    this.ctx.lineTo(0, 16);
    this.ctx.lineTo(-12, 0);
    this.ctx.closePath();
    this.ctx.strokeStyle = highlight ? '#fff' : '#cbd5e1';
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawPortal(radius, highlight) {
    const pulse = 0.8 + Math.sin(this.time * 3) * 0.2;
    this.ctx.save();
    this.ctx.lineWidth = 3;
    this.ctx.globalAlpha = 0.9;
    this.ctx.strokeStyle = highlight ? '#ffd9a5' : '#ffedd5';
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, radius * 0.6 * pulse, radius * 0.35 * pulse, 0, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawChart(radius, chart, idx) {
    this.ctx.save();
    const phase = this.time * 2 + idx;
    const offset = radius * 0.2;
    const x = Math.cos(phase) * (radius * 0.35 + idx * 6);
    const y = Math.sin(phase) * (radius * 0.25 + idx * 6);
    this.ctx.translate(x, y);
    this.ctx.beginPath();
    this.ctx.moveTo(-offset, 6);
    this.ctx.lineTo(0, -6);
    this.ctx.lineTo(offset, 4);
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawBubbles(radius, count) {
    for (let i = 0; i < count; i++) {
      const phase = this.time * 0.8 + i;
      const x = Math.cos(phase) * radius * 0.5;
      const y = Math.sin(phase) * radius * 0.3;
      const size = 18 + Math.sin(this.time * 1.2 + i) * 6;
      this.ctx.save();
      this.ctx.globalAlpha = 0.6;
      this.ctx.strokeStyle = '#dcfce7';
      this.ctx.beginPath();
      this.ctx.ellipse(x, y, size, size * 0.7, 0, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  drawSweep(radius) {
    const sweepAngle = (this.time * 0.8) % (Math.PI * 2);
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    this.ctx.strokeStyle = '#bae6fd';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius * 0.6, sweepAngle, sweepAngle + Math.PI / 4);
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawDistantPortals(radius, portals) {
    for (let i = 0; i < portals; i++) {
      const angle = (Math.PI * 2 * i) / portals + this.time * 0.2;
      const dist = radius * 0.6;
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist * 0.5;
      this.ctx.save();
      this.ctx.translate(x, y);
      this.ctx.rotate(angle);
      this.ctx.strokeStyle = '#fbcfe8';
      this.ctx.globalAlpha = 0.7;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, 36, 18, 0, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  drawZoneData(zone, radius) {
    switch (zone.id) {
      case 'temporal-archetypes':
        return this.drawTemporalSeries(zone.liveData, radius);
      case 'analytics-dashboard':
        return this.drawAnalyticsOrbit(zone.liveData, radius);
      case 'pattern-discovery':
        return this.drawDiscoveryConstellations(zone.liveData, radius);
      case 'cross-world-nexus':
        return this.drawCrossWorldLinks(zone.liveData, radius);
      default:
        return null;
    }
  }

  drawTemporalSeries(data, radius) {
    const series = data?.temporalSeries || [];
    if (!series.length) return;
    const max = Math.max(...series.map(p => p.count), 1);
    this.ctx.save();
    this.ctx.globalAlpha = 0.9;
    series.forEach((point, idx) => {
      const angle = (Math.PI * 2 * idx) / series.length + this.time * 0.2;
      const normalized = point.count / max;
      const barLength = radius * 0.35 + normalized * radius * 0.4;
      const x = Math.cos(angle) * barLength;
      const y = Math.sin(angle) * barLength * 0.8;
      this.ctx.strokeStyle = '#ecfeff';
      this.ctx.lineWidth = 2 + normalized * 2;
      this.ctx.beginPath();
      this.ctx.moveTo(x * 0.6, y * 0.6);
      this.ctx.lineTo(x, y);
      this.ctx.stroke();

      // trailing orb that pulses with submission rhythm
      this.ctx.beginPath();
      const orbSize = 5 + Math.sin(this.time * 3 + idx) * 2;
      this.ctx.fillStyle = '#7dd3fc';
      this.ctx.globalAlpha = 0.8;
      this.ctx.arc(x, y, orbSize, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.restore();
  }

    drawAnalyticsOrbit(data, radius) {
    const analytics = data?.analytics;
    const stats = analytics?.stats;
    const timeline = analytics?.timeline || [];
    const typeCounts = analytics?.byType || {};
    
    if (!stats) {
      // Show placeholder visualization
      this.ctx.save();
      this.ctx.globalAlpha = 0.3;
      this.ctx.strokeStyle = '#22d3ee';
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([5, 3]);
      this.ctx.beginPath();
      this.ctx.arc(0, 0, radius * 0.5, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
      return;
    }

    const severity = Math.min(1, (stats.averageSeverity || 0) / 5);
    const velocity = Math.min(1, (stats.velocity || 0.1) / 10);
    const total = Math.min(1, (stats.total || 1) / 200);

    // Main data rings
    const rings = [
      { value: total, color: '#22d3ee', label: 'Total' },
      { value: velocity, color: '#67e8f9', label: 'Velocity' },
      { value: severity, color: '#a5f3fc', label: 'Severity' }
    ];

    this.ctx.save();
    
    // Draw the rings
    rings.forEach((ring, idx) => {
      this.ctx.save();
      this.ctx.strokeStyle = ring.color;
      this.ctx.lineWidth = 3;
      this.ctx.globalAlpha = 0.65;
      const r = radius * (0.4 + idx * 0.15);
      const sweep = Math.PI * 2 * ring.value;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + sweep);
      this.ctx.stroke();

      const markerAngle = -Math.PI / 2 + sweep + this.time * 0.4;
      const markerX = Math.cos(markerAngle) * r;
      const markerY = Math.sin(markerAngle) * r;
      this.ctx.beginPath();
      this.ctx.fillStyle = ring.color;
      this.ctx.arc(markerX, markerY, 6 + idx, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    // Show timeline data if available (as small orbiting points)
    if (timeline.length > 0) {
      const maxTimeline = Math.max(...timeline.map(p => p.count), 1);
      timeline.forEach((point, idx) => {
        const angle = (Math.PI * 2 * idx) / timeline.length + this.time * 0.3;
        const normalized = point.count / maxTimeline;
        const orbitRadius = radius * 0.7;
        const x = Math.cos(angle) * orbitRadius;
        const y = Math.sin(angle) * orbitRadius * 0.8;
        
        // Point size based on count
        const pointSize = 2 + normalized * 4;
        this.ctx.fillStyle = `rgba(34, 211, 238, ${0.4 + normalized * 0.6})`;
        this.ctx.beginPath();
        this.ctx.arc(x, y, pointSize, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Trail effect
        for (let i = 1; i <= 3; i++) {
          const trailAngle = angle - i * 0.05;
          const trailX = Math.cos(trailAngle) * orbitRadius;
          const trailY = Math.sin(trailAngle) * orbitRadius * 0.8;
          this.ctx.fillStyle = `rgba(34, 211, 238, ${0.2 - i * 0.06})`;
          this.ctx.beginPath();
          this.ctx.arc(trailX, trailY, pointSize - i * 0.5, 0, Math.PI * 2);
          this.ctx.fill();
        }
      });
    }

    // Show type distribution if available
    const typeEntries = Object.entries(typeCounts);
    if (typeEntries.length > 0) {
      const maxTypeCount = Math.max(...typeEntries.map(([_, count]) => count), 1);
      typeEntries.forEach(([type, count], idx) => {
        const angle = (Math.PI * 2 * idx) / typeEntries.length + Math.PI + this.time * 0.2;
        const normalized = count / maxTypeCount;
        const barLength = radius * 0.25 + normalized * radius * 0.2;
        const x = Math.cos(angle) * barLength;
        const y = Math.sin(angle) * barLength * 0.8;
        
        // Color based on type
        const hue = 180 + idx * 60;
        this.ctx.strokeStyle = `hsl(${hue}, 80%, 70%)`;
        this.ctx.lineWidth = 1 + normalized * 3;
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        
        // Type label
        if (type.length < 12) {
          this.ctx.save();
          this.ctx.translate(x * 1.1, y * 1.1);
          this.ctx.rotate(angle);
          this.ctx.font = '8px "IBM Plex Mono"';
          this.ctx.fillStyle = `hsl(${hue}, 100%, 85%)`;
          this.ctx.textAlign = 'center';
          this.ctx.fillText(type, 0, 10);
          this.ctx.restore();
        }
      });
    }

    // Center data orb
    const centerGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
    centerGradient.addColorStop(0, '#ffffff');
    centerGradient.addColorStop(1, '#22d3ee');
    
    this.ctx.fillStyle = centerGradient;
    this.ctx.globalAlpha = 0.9;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 12, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Pulsing center glow
    const pulse = 0.7 + 0.3 * Math.sin(this.time * 4);
    this.ctx.fillStyle = 'rgba(34, 211, 238, 0.1)';
    this.ctx.globalAlpha = pulse * 0.5;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 20, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.restore();
  }
  drawDiscoveryConstellations(data, radius) {
    const patterns = data?.discovery?.patterns || [];
    if (!patterns.length) return;
    const nodes = patterns.slice(0, 14);
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    nodes.forEach((pattern, idx) => {
      const angle = (Math.PI * 2 * idx) / nodes.length + this.time * 0.15;
      const dist = radius * 0.35 + (pattern.confidence || 0.5) * radius * 0.25;
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist * 0.85;

      nodes.forEach((other, jdx) => {
        if (idx === jdx) return;
        const weight = Math.min(1, Math.abs(pattern.confidence - other.confidence) + 0.35);
        if (weight < 0.2) return;
        const angleB = (Math.PI * 2 * jdx) / nodes.length + this.time * 0.15;
        const distB = radius * 0.35 + (other.confidence || 0.5) * radius * 0.25;
        const x2 = Math.cos(angleB) * distB;
        const y2 = Math.sin(angleB) * distB * 0.85;
        this.ctx.strokeStyle = '#bae6fd';
        this.ctx.globalAlpha = 0.3;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
      });

      const severity = pattern.metrics?.avgSeverity || 1;
      const size = 6 + severity;
      this.ctx.fillStyle = '#38bdf8';
      this.ctx.globalAlpha = 0.8;
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.restore();
  }

    drawCrossWorldLinks(data, radius) {
    const worlds = data?.crossWorld?.worlds || [];
    const aggregates = data?.crossWorld?.aggregates || {};
    const insights = data?.crossWorld?.insights || [];
    
    if (!worlds.length) {
      // Still show something if no worlds are connected
      this.ctx.save();
      this.ctx.globalAlpha = 0.4;
      this.ctx.strokeStyle = '#f472b6';
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([5, 3]);
      this.ctx.beginPath();
      this.ctx.arc(0, 0, radius * 0.6, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
      return;
    }

    this.ctx.save();
    
    // Sort worlds by health/latest activity (simulated)
    const sortedWorlds = worlds.slice().sort((a, b) => {
      const aHealth = a.health || a.status === 'active' ? 1 : 0;
      const bHealth = b.health || b.status === 'active' ? 1 : 0;
      return bHealth - aHealth;
    });

    // Show connections to active worlds
    sortedWorlds.slice(0, 8).forEach((world, idx) => {
      const angle = (Math.PI * 2 * idx) / Math.min(8, sortedWorlds.length) + this.time * 0.08;
      const dist = radius * 0.7;
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist * 0.7;
      
      // Calculate health/brightness based on world data
      const worldHealth = world.health || (world.status === 'active' ? 0.8 : 0.3);
      const brightness = Math.min(1, worldHealth + 0.3);
      const pulse = 0.7 + 0.3 * Math.sin(this.time * 2 + idx);
      
      // Connection line
      this.ctx.strokeStyle = `rgba(245, 114, 182, ${0.3 + brightness * 0.3})`;
      this.ctx.lineWidth = 1 + brightness;
      this.ctx.globalAlpha = 0.6;
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
      
      // Portal orb
      const portalSize = 6 + brightness * 4;
      const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, portalSize);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${brightness})`);
      gradient.addColorStop(1, `rgba(245, 114, 182, 0.2)`);
      
      this.ctx.fillStyle = gradient;
      this.ctx.globalAlpha = pulse;
      this.ctx.beginPath();
      this.ctx.arc(x, y, portalSize, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Glow effect
      this.ctx.fillStyle = `rgba(245, 114, 182, 0.05)`;
      this.ctx.beginPath();
      this.ctx.arc(x, y, portalSize * 2, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Label if world has a short name
      if (world.name && world.name.length < 15) {
        this.ctx.font = '9px "Space Grotesk"';
        this.ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + brightness * 0.5})`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(world.name, x, y + portalSize + 12);
      }
    });
    
    // Center orb showing aggregate insights
    if (insights.length > 0 || Object.keys(aggregates).length > 0) {
      const centerGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.15);
      centerGradient.addColorStop(0, '#f9a8d4');
      centerGradient.addColorStop(1, '#ec4899');
      
      this.ctx.fillStyle = centerGradient;
      this.ctx.globalAlpha = 0.8 + 0.2 * Math.sin(this.time * 3);
      this.ctx.beginPath();
      this.ctx.arc(0, 0, radius * 0.15, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Pulsing rings
      this.ctx.strokeStyle = 'rgba(236, 72, 153, 0.3)';
      this.ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const ringRadius = radius * 0.2 + i * 8;
        const ringAlpha = 0.2 + 0.1 * Math.sin(this.time * 2 + i);
        this.ctx.globalAlpha = ringAlpha;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
        this.ctx.stroke();
      }
    }
    
    this.ctx.restore();
  }
  drawMarks() {
    if (!this.marks?.length) return;
    this.ctx.save();
    for (const mark of this.marks) {
      const stamp = Number(mark.createdAt) || 0;
      const pulse = 1 + Math.sin(this.time * 3 + stamp * 0.001) * 0.15;
      const gradient = this.ctx.createRadialGradient(mark.x, mark.y, 2, mark.x, mark.y, 22);
      const color = mark.color || '#fde68a';
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, `${color}00`);
      this.ctx.globalAlpha = 0.9;
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(mark.x, mark.y, 14 * pulse, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#fff';
      this.ctx.globalAlpha = 0.95;
      this.ctx.beginPath();
      this.ctx.arc(mark.x, mark.y, 3 + pulse * 2, 0, Math.PI * 2);
      this.ctx.fill();

      if (mark.label) {
        this.ctx.globalAlpha = 0.8;
        this.ctx.fillStyle = '#e2e8f0';
        this.ctx.font = '11px "Space Grotesk", system-ui, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(mark.label, mark.x, mark.y - 16);
      }
    }
    this.ctx.restore();
  }

  drawMinimap(camera, activeZone, discoveredZoneIds) {
    if (!this.minimapCtx || !this.minimapCanvas) return;
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0b1226';
    ctx.globalAlpha = 0.9;
    ctx.fillRect(0, 0, w, h);

    const scaleX = w / WORLD_DIMENSIONS.width;
    const scaleY = h / WORLD_DIMENSIONS.height;

    // zones
    for (const zone of this.zones) {
      const x = zone.position.x * scaleX;
      const y = zone.position.y * scaleY;
      const r = zone.radius * scaleX;
      ctx.beginPath();
      ctx.fillStyle = discoveredZoneIds.has(zone.id) ? zone.accent : '#1e293b';
      ctx.globalAlpha = 0.8;
      ctx.arc(x, y, Math.max(3, r * 0.12), 0, Math.PI * 2);
      ctx.fill();
    }

    // camera frustum
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 1;
    ctx.strokeRect(
      (camera.x - this.displayWidth / 2 / camera.zoom) * scaleX,
      (camera.y - this.displayHeight / 2 / camera.zoom) * scaleY,
      (this.displayWidth / camera.zoom) * scaleX,
      (this.displayHeight / camera.zoom) * scaleY
    );

    // active zone pulse
    if (activeZone) {
      ctx.beginPath();
      ctx.strokeStyle = activeZone.accent;
      ctx.globalAlpha = 0.8;
      ctx.arc(
        activeZone.position.x * scaleX,
        activeZone.position.y * scaleY,
        Math.max(6, activeZone.radius * 0.15 * scaleX),
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

    // marks
    ctx.globalAlpha = 0.9;
    this.marks.forEach(mark => {
      ctx.fillStyle = mark.color || '#fde68a';
      ctx.fillRect(mark.x * scaleX - 2, mark.y * scaleY - 2, 4, 4);
    });

    ctx.restore();
  }
}
