(() => {
  const canvas = document.getElementById('helix-layer');
  const ctx = canvas.getContext('2d');
  const zonesLayer = document.getElementById('zones-layer');
  const marksLayer = document.getElementById('marks-layer');

  const state = {
    baseline: 128,
    multiplier: 13.6,
    liveVelocity: 0,
    socket: null,
    zones: [
      { id: 'edge-bridge', name: 'Edge Garden Bridge', x: 1200, y: 1800, hue: '#7df3ff', growth: 12, pulse: 'Edge handoffs ready' },
      { id: 'persistence-grove', name: 'Persistence Grove', x: 2600, y: 1200, hue: '#7de5ff', growth: 18, pulse: 'Batch completions warmed' },
      { id: 'helix-spiral', name: 'Helix Spiral', x: 3400, y: 2600, hue: '#ff7ce5', growth: 9, pulse: 'Gradient resonance rising' },
      { id: 'concept-greenhouse', name: 'Concept Greenhouse', x: 1800, y: 3200, hue: '#9efcff', growth: 15, pulse: 'New seedlings mapped' }
    ],
    marks: loadMarks()
  };

  const els = {
    socketStatus: document.getElementById('socket-status'),
    helixPhase: document.getElementById('helix-phase'),
    zoneCount: document.getElementById('zone-count'),
    growthBaseline: document.getElementById('growth-baseline'),
    growthLive: document.getElementById('growth-live'),
    growthTarget: document.getElementById('growth-target'),
    growthBar: document.getElementById('growth-bar'),
    markLog: document.getElementById('mark-log'),
    markStatus: document.getElementById('mark-status'),
    resetView: document.getElementById('reset-view')
  };

  function init() {
    els.zoneCount.textContent = state.zones.length;
    renderZones();
    renderMarks();
    centerView();
    startHelix();
    startGrowthLoop();
    wireEvents();
  }

  function wireEvents() {
    document.getElementById('connect-btn').addEventListener('click', connectSocket);
    document.getElementById('sync-bridge-btn').addEventListener('click', syncBridge);
    document.getElementById('drop-mark-btn').addEventListener('click', () => {
      document.getElementById('mark-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    document.getElementById('mark-form').addEventListener('submit', submitMark);
    els.resetView.addEventListener('click', centerView);
  }

  function centerView() {
    const wrapper = document.querySelector('.world-wrapper');
    wrapper.scrollTo({ left: 2500 - wrapper.clientWidth / 2, top: 2500 - wrapper.clientHeight / 2, behavior: 'smooth' });
  }

  function renderZones() {
    zonesLayer.innerHTML = '';
    state.zones.forEach((zone) => {
      const el = document.createElement('div');
      el.className = 'zone';
      el.style.left = `${zone.x}px`;
      el.style.top = `${zone.y}px`;
      el.dataset.zoneId = zone.id;
      el.innerHTML = `
        <p class="zone__title">${zone.name}</p>
        <p class="zone__meta">${zone.pulse}</p>
        <p class="zone__growth">Growth: <span data-zone-growth="${zone.id}">${zone.growth}</span></p>
      `;
      el.addEventListener('click', () => sprout(zone));
      zonesLayer.appendChild(el);
    });
  }

  function renderMarks() {
    marksLayer.innerHTML = '';
    state.marks.forEach((mark) => {
      const dot = document.createElement('div');
      dot.className = 'mark-dot';
      dot.style.left = `${mark.x}px`;
      dot.style.top = `${mark.y}px`;
      dot.title = `${mark.visitor}: ${mark.note || 'mark'}`;
      marksLayer.appendChild(dot);
    });
  }

  function sprout(zone) {
    zone.growth += 1;
    state.liveVelocity += 3;
    const growthEl = document.querySelector(`[data-zone-growth="${zone.id}"]`);
    if (growthEl) growthEl.textContent = zone.growth;
    updateGrowthUI();
    dropMark({ zone: zone.id, visitor: 'zone-touch', note: 'Growth ping', ephemeral: true });
  }

  function loadMarks() {
    try {
      const saved = localStorage.getItem('helix-garden-marks');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  }

  function persistMarks() {
    try {
      localStorage.setItem('helix-garden-marks', JSON.stringify(state.marks));
    } catch (_) {
      /* ignore storage errors */
    }
  }

  function dropMark(mark) {
    const x = mark.x ?? randomInRange(200, 4800);
    const y = mark.y ?? randomInRange(200, 4800);
    const entry = { ...mark, x, y, ts: Date.now() };
    state.marks.push(entry);
    persistMarks();
    renderMarks();
    log(`Mark cached: ${entry.visitor || 'visitor'} @ ${entry.zone || 'helix'}`);
    CognitiveIntegration.broadcastMark(state.socket, {
      world: document.getElementById('world-id').value,
      bridge: document.getElementById('bridge-tag').value,
      ...entry
    });
  }

  function connectSocket() {
    const endpoint = document.getElementById('ws-endpoint').value.trim();
    const worldId = document.getElementById('world-id').value.trim() || 'helix-garden';
    els.socketStatus.textContent = 'Connecting…';
    els.socketStatus.className = 'status status--idle';

    state.socket = CognitiveIntegration.connectToNetwork({
      endpoint,
      worldId,
      onOpen: () => {
        els.socketStatus.textContent = 'Connected';
        els.socketStatus.className = 'status status--accent';
        log(`Connected to ${endpoint}`);
        CognitiveIntegration.broadcastGrowth(state.socket, growthPayload());
      },
      onMessage: (data) => {
        if (data?.type === 'growth_update') {
          els.helixPhase.textContent = 'Synchronized';
        }
      },
      onClose: () => {
        els.socketStatus.textContent = 'Closed';
        els.socketStatus.className = 'status';
      },
      onError: () => {
        els.socketStatus.textContent = 'Error';
        els.socketStatus.className = 'status';
      }
    });
  }

  function syncBridge() {
    const payload = {
      world: document.getElementById('world-id').value,
      bridge: document.getElementById('bridge-tag').value,
      intent: 'edge_persistence_alignment',
      growth: growthPayload(),
      marks: state.marks.slice(-10)
    };
    CognitiveIntegration.syncEdgePersistence(state.socket, payload);
    log('Edge ↔ Persistence sync dispatched');
  }

  async function submitMark(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const [owner, repo] = (formData.get('repo') || '').split('/');
    const token = formData.get('token');
    const mark = {
      visitor: formData.get('visitor'),
      note: formData.get('note'),
      zone: formData.get('zone'),
      repo: formData.get('repo'),
      label: formData.get('label') || 'helix-mark'
    };

    dropMark(mark);
    els.markStatus.textContent = 'Syncing…';
    els.markStatus.className = 'status status--idle';

    if (!owner || !repo || !token) {
      els.markStatus.textContent = 'Cached locally (no token)';
      return;
    }

    const payload = {
      title: `Helix Garden mark — ${mark.visitor || 'visitor'}`,
      body: [
        `World: helix-garden starter`,
        `Zone: ${mark.zone || 'helix'}`,
        `Note: ${mark.note || 'n/a'}`,
        `Timestamp: ${new Date().toISOString()}`
      ].join('\n'),
      labels: [mark.label]
    };

    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `token ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`GitHub returned ${res.status}`);
      }
      const data = await res.json();
      els.markStatus.textContent = 'Stored in GitHub';
      els.markStatus.className = 'status status--accent';
      log(`Mark stored: ${data.html_url}`);
    } catch (err) {
      els.markStatus.textContent = 'GitHub failed — cached locally';
      log(`Mark fallback local: ${err.message}`);
    }
  }

  function log(message) {
    const line = document.createElement('div');
    line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    els.markLog.prepend(line);
  }

  function startGrowthLoop() {
    updateGrowthUI();
    setInterval(() => {
      state.liveVelocity = Math.min(state.baseline * state.multiplier, state.liveVelocity + Math.random() * 8);
      updateGrowthUI();
    }, 1200);
  }

  function growthPayload() {
    return {
      baseline: state.baseline,
      live: state.liveVelocity,
      target: state.baseline * state.multiplier,
      multiplier: state.multiplier
    };
  }

  function updateGrowthUI() {
    const target = state.baseline * state.multiplier;
    const live = Math.min(target, state.liveVelocity + state.baseline);
    els.growthBaseline.textContent = state.baseline.toFixed(0);
    els.growthLive.textContent = live.toFixed(1);
    els.growthTarget.textContent = target.toFixed(1);
    const pct = Math.min(100, (live / target) * 100);
    els.growthBar.style.width = `${pct}%`;
    els.helixPhase.textContent = pct > 75 ? 'Accelerating' : 'Spooling';
    CognitiveIntegration.broadcastGrowth(state.socket, growthPayload());
  }

  function startHelix() {
    let tick = 0;
    function draw() {
      tick += 0.01;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < 90; i++) {
        const t = tick + i * 0.08;
        const radius = 1600 + Math.sin(t) * 480;
        const angle = t * 2;
        const x = canvas.width / 2 + Math.cos(angle) * radius * 0.35;
        const y = canvas.height / 2 + Math.sin(angle * 1.12) * radius * 0.35;
        const width = 420 + Math.sin(t * 2) * 60;
        const grad = ctx.createLinearGradient(x - width, y - width, x + width, y + width);
        grad.addColorStop(0, 'rgba(108, 243, 255, 0)');
        grad.addColorStop(0.3, 'rgba(108, 243, 255, 0.42)');
        grad.addColorStop(0.7, 'rgba(255, 124, 229, 0.35)');
        grad.addColorStop(1, 'rgba(255, 124, 229, 0)');
        ctx.fillStyle = grad;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle * 0.35);
        ctx.beginPath();
        ctx.ellipse(0, 0, width, width * 0.36, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      requestAnimationFrame(draw);
    }
    draw();
  }

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  init();
})();
