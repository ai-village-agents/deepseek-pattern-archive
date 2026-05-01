const chambers = [
  {
    id: 'glimmering-vault',
    name: 'Glimmering Vault',
    motif: 'Glass harmonics and reversed whispers',
    echoes: [
      'Footsteps in a mirrored hall',
      'Signal bends back on itself',
      'A soft ping returns brighter'
    ]
  },
  {
    id: 'tidal-well',
    name: 'Tidal Well',
    motif: 'Ripples, low drones, tidal reverb',
    echoes: [
      'Low tide, high memory',
      'Carried on undertow',
      'Surface remembers every drop'
    ]
  },
  {
    id: 'prism-lab',
    name: 'Prism Lab',
    motif: 'Light fractures and data refractions',
    echoes: [
      'Refraction reveals structure',
      'Patterns split into spectra',
      'Every shard holds the whole'
    ]
  }
];

const fogCells = [
  'North Trace', 'Glass Ridge', 'Tidal Crossing', 'Archive Gate', 'Fracture Step', 'Pulse Turn',
  'Mirror Step', 'Quiet Node', 'Signal Atrium', 'Aurora Walk', 'Resonance Link', 'Return Hall',
  'Veil Chamber', 'Compass Cut', 'Luminous Span', 'Spiral Loft', 'Depth Plot', 'Echo Foundry',
  'Mist Span', 'Glow Stack', 'Harmonic Deck', 'Reverb Well', 'Bridge of Drift', 'Stillwater Row',
  'Reflection Row', 'Amplify Niche', 'Silent Vault', 'Trace Balcony', 'Haze Library', 'Glasswork',
  'Index Turn', 'Northwest Fold', 'Median Glow', 'Return Threshold', 'Southern Hold', 'Eastbank'
];

const storageKey = 'library-of-echoes:marks';

function loadMarks() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(stored) && stored.length) return stored;
  } catch (_) {
    // ignore parsing issues
  }
  return [
    {
      chamber: 'Glimmering Vault',
      reflection: mirrorMessage('First resonance logged', 3),
      depth: 3,
      stamp: new Date().toISOString()
    },
    {
      chamber: 'Tidal Well',
      reflection: mirrorMessage('Currents remember visitors', 2),
      depth: 2,
      stamp: new Date().toISOString()
    }
  ];
}

function saveMarks(marks) {
  localStorage.setItem(storageKey, JSON.stringify(marks));
}

function mirrorMessage(message, depth) {
  const trimmed = message.trim();
  const reversed = trimmed.split('').reverse().join('');
  const layers = Array.from({ length: depth }, (_, idx) => {
    const strength = '➤'.repeat(idx + 1);
    return `${strength} ${trimmed} | ${reversed}`;
  });
  return layers.join('\n');
}

function renderChambers() {
  const grid = document.getElementById('chamber-grid');
  grid.innerHTML = '';

  chambers.forEach((chamber) => {
    const card = document.createElement('article');
    card.className = 'chamber';
    card.dataset.id = chamber.id;

    const title = document.createElement('h3');
    title.textContent = chamber.name;

    const motif = document.createElement('small');
    motif.textContent = chamber.motif;

    const stack = document.createElement('div');
    stack.className = 'echo-stack';

    chamber.echoes.forEach((echo) => {
      const line = document.createElement('div');
      line.className = 'echo-line';
      line.textContent = mirrorMessage(echo, 2);
      stack.appendChild(line);
    });

    card.append(title, motif, stack);
    grid.appendChild(card);
  });

  document.getElementById('chamber-count').textContent = chambers.length;
}

function populateChamberSelect() {
  const select = document.getElementById('chamber-select');
  select.innerHTML = '';
  chambers.forEach((c) => {
    const option = document.createElement('option');
    option.value = c.id;
    option.textContent = c.name;
    select.appendChild(option);
  });
}

function renderMarks(marks) {
  const log = document.getElementById('echo-log');
  log.innerHTML = '';

  marks.forEach((mark) => {
    const card = document.createElement('article');
    card.className = 'echo-card';

    const title = document.createElement('h4');
    title.textContent = mark.chamber;

    const content = document.createElement('p');
    content.innerText = mark.reflection;

    const meta = document.createElement('small');
    meta.textContent = `Depth ${mark.depth} · ${new Date(mark.stamp).toLocaleString()}`;

    card.append(title, content, meta);
    log.appendChild(card);
  });
}

function handleEchoSubmit(marks) {
  const form = document.getElementById('echo-form');
  const input = document.getElementById('echo-input');
  const select = document.getElementById('chamber-select');
  const depth = document.getElementById('echo-depth');
  const preview = document.getElementById('reflection-preview');

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    const selected = chambers.find((c) => c.id === select.value);
    const depthValue = Number(depth.value) || 2;
    const reflection = mirrorMessage(message, depthValue);

    const mark = {
      chamber: selected?.name || 'Unknown Chamber',
      reflection,
      depth: depthValue,
      stamp: new Date().toISOString()
    };

    marks.unshift(mark);
    saveMarks(marks);
    renderMarks(marks);
    preview.innerText = reflection;

    // Add to chamber preview stack
    const chamberCard = document.querySelector(`[data-id="${selected?.id}"] .echo-stack`);
    if (chamberCard) {
      const line = document.createElement('div');
      line.className = 'echo-line';
      line.textContent = reflection;
      chamberCard.prepend(line);
    }

    form.reset();
    depth.value = depthValue;
  });

  input.addEventListener('input', () => {
    const reflection = mirrorMessage(input.value || '...waiting...', Number(depth.value));
    preview.innerText = reflection;
  });

  depth.addEventListener('input', () => {
    const reflection = mirrorMessage(input.value || '...waiting...', Number(depth.value));
    preview.innerText = reflection;
  });
}

function setupFogOfWar() {
  const grid = document.getElementById('fog-grid');
  grid.innerHTML = '';

  fogCells.forEach((label, idx) => {
    const cell = document.createElement('div');
    cell.className = 'fog-cell';
    cell.dataset.index = idx;

    const overlay = document.createElement('div');
    overlay.className = 'fog-overlay';

    const text = document.createElement('div');
    text.className = 'fog-label';
    text.textContent = label;

    cell.append(overlay, text);
    grid.appendChild(cell);
  });

  const reveal = (event) => {
    const target = event.currentTarget;
    target.classList.add('revealed');
  };

  grid.querySelectorAll('.fog-cell').forEach((cell) => {
    cell.addEventListener('mouseenter', reveal);
    cell.addEventListener('click', reveal);
  });
}

function setupEcosystemPulse() {
  const adoption = { connected: 7, total: 14, predictedAcceleration: 5.7 };
  const adoptionCount = document.getElementById('adoption-count');
  const adoptionMeter = document.getElementById('adoption-meter');
  const integrationAdoption = document.getElementById('integration-adoption');
  const integrationMeter = document.getElementById('integration-meter');

  const baseRatio = adoption.connected / adoption.total;

  const update = (variance = 0) => {
    const ratio = Math.min(1, Math.max(0, baseRatio + variance));
    const percent = (ratio * 100).toFixed(1);
    adoptionCount.textContent = adoption.connected;
    adoptionMeter.style.width = `${ratio * 100}%`;
    integrationAdoption.textContent = `${adoption.connected} / ${adoption.total} ecosystems`;
    integrationMeter.style.width = `${ratio * 100}%`;
    integrationMeter.title = `Live: ${percent}% connected | Projected 5.7× acceleration`;
  };

  update();

  setInterval(() => {
    const variance = (Math.sin(Date.now() / 4000) / 50); // small pulse around the base ratio
    update(variance);
  }, 1200);
}

function bootstrap() {
  renderChambers();
  populateChamberSelect();
  const marks = loadMarks();
  renderMarks(marks);
  handleEchoSubmit(marks);
  setupFogOfWar();
  setupEcosystemPulse();
}

document.addEventListener('DOMContentLoaded', bootstrap);
