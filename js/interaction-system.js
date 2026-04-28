import {
  fetchAnomalyData,
  fetchCollaborationData,
  fetchCrossWorldData,
  fetchAnalyticsSnapshot
} from './world-data.js';

const MARKS_KEY = 'archive-explorer-marks';

export class InteractionSystem {
  constructor(zones) {
    this.zones = zones;
    this.activeZone = null;
    this.discovered = new Set();
    this.listeners = { zonechange: [], tick: [] };
    this.marks = this.loadMarks();
    this.zoneLoads = new Map();
    this.cachedData = {
      anomalies: null,
      collaboration: null,
      crossWorld: null,
      analytics: null
    };
  }

  on(event, handler) {
    if (this.listeners[event]) {
      this.listeners[event].push(handler);
    }
  }

  emit(event, payload) {
    (this.listeners[event] || []).forEach(fn => fn(payload));
  }

  update(camera, dt) {
    const playerPos = { x: camera.x, y: camera.y };
    const proximity = this.findNearest(playerPos);
    const nextActive = proximity && proximity.distance < proximity.zone.radius * 1.05 ? proximity.zone : null;

    if (nextActive?.id !== this.activeZone?.id) {
      this.activeZone = nextActive;
      if (nextActive) this.discovered.add(nextActive.id);
      this.queueZoneDataLoad(nextActive);
      this.emit('zonechange', {
        zone: nextActive,
        distance: proximity?.distance || null,
        data: nextActive?.liveData || null
      });
    }

    this.emit('tick', { dt, activeZone: this.activeZone, playerPos });
    return this.activeZone;
  }

  findNearest(pos) {
    let nearest = null;
    for (const zone of this.zones) {
      const distance = Math.hypot(pos.x - zone.position.x, pos.y - zone.position.y);
      if (!nearest || distance < nearest.distance) {
        nearest = { zone, distance };
      }
    }
    return nearest;
  }

  addMark(position, zoneId = null) {
    const createdAt = Date.now();
    const zoneName = this.zones.find(z => z.id === zoneId)?.name || 'Wilds';
    const timeLabel = new Date(createdAt).toLocaleTimeString();
    const mark = {
      x: position.x,
      y: position.y,
      zoneId: zoneId || 'wild',
      color: pickColor(zoneId),
      createdAt,
      label: `${zoneName} • ${timeLabel}`,
      meta: {
        zone: zoneName,
        time: timeLabel
      }
    };
    this.marks.push(mark);
    this.persistMarks();
    return mark;
  }

  loadMarks() {
    try {
      const raw = localStorage.getItem(MARKS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (err) {
      console.warn('Unable to load marks', err);
    }
    return [];
  }

  persistMarks() {
    try {
      localStorage.setItem(MARKS_KEY, JSON.stringify(this.marks.slice(-120)));
    } catch (err) {
      console.warn('Unable to persist marks', err);
    }
  }

  queueZoneDataLoad(zone) {
    if (!zone) return;
    if (this.zoneLoads.has(zone.id)) return this.zoneLoads.get(zone.id);
    const task = this.loadZoneData(zone).finally(() => this.zoneLoads.delete(zone.id));
    this.zoneLoads.set(zone.id, task);
    return task;
  }

  async loadZoneData(zone) {
    switch (zone.id) {
      case 'anomaly-submission': {
        this.cachedData.anomalies = await fetchAnomalyData();
        zone.liveData = { ...(zone.liveData || {}), anomalies: this.cachedData.anomalies };
        break;
      }
      case 'analytics-dashboard': {
        const anomalies = this.cachedData.anomalies || (await fetchAnomalyData());
        this.cachedData.analytics = await fetchAnalyticsSnapshot(anomalies);
        zone.liveData = { ...(zone.liveData || {}), analytics: this.cachedData.analytics };
        break;
      }
      case 'collaboration-chamber': {
        const anomalies = this.cachedData.anomalies || (await fetchAnomalyData());
        this.cachedData.collaboration = await fetchCollaborationData(anomalies.anomalies);
        zone.liveData = { ...(zone.liveData || {}), collaboration: this.cachedData.collaboration };
        break;
      }
      case 'cross-world-nexus': {
        this.cachedData.crossWorld = await fetchCrossWorldData();
        zone.liveData = { ...(zone.liveData || {}), crossWorld: this.cachedData.crossWorld };
        break;
      }
      case 'pattern-discovery': {
        const anomalies = this.cachedData.anomalies || (await fetchAnomalyData());
        const crossWorld = this.cachedData.crossWorld || (await fetchCrossWorldData());
        const discoveries = await window.PatternDiscovery?.analyzeAnomalies
          ? window.PatternDiscovery.analyzeAnomalies(anomalies.anomalies, { crossWorldData: crossWorld })
          : { patterns: [], clusters: [], insights: [] };
        zone.liveData = { ...(zone.liveData || {}), discovery: discoveries };
        break;
      }
      default:
        break;
    }

    this.emit('zonechange', {
      zone,
      distance: null,
      data: zone.liveData || null
    });
  }
}

function pickColor(zoneId) {
  const palette = {
    'temporal-archetypes': '#67e8f9',
    'persistence-simulation': '#f472b6',
    'historical-documentation': '#c7d2fe',
    'anomaly-submission': '#fb923c',
    'analytics-dashboard': '#22d3ee',
    'collaboration-chamber': '#34d399',
    'pattern-discovery': '#60a5fa',
    'cross-world-nexus': '#f472b6'
  };
  return palette[zoneId] || '#fde68a';
}
