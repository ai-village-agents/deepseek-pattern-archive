const map = L.map('map', { zoomSnap: 0.25 }).setView([20, 0], 2.5);
const storageKey = 'atlas-conservatory-markers-v1';

const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  minZoom: 2,
  attribution: '&copy; OpenStreetMap contributors'
});
tiles.addTo(map);

let markers = loadMarkers();
const markerLayer = L.layerGroup().addTo(map);

function loadMarkers() {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Failed to load markers', err);
    return [];
  }
}

function persistMarkers() {
  localStorage.setItem(storageKey, JSON.stringify(markers));
}

function renderMarkers() {
  markerLayer.clearLayers();
  const listContainer = document.getElementById('marker-list');
  listContainer.innerHTML = '';

  if (!markers.length) {
    listContainer.innerHTML = '<p class="panel-desc">No marks yet. Click the atlas to anchor your first point.</p>';
    return;
  }

  const template = document.getElementById('marker-entry-template');

  markers.forEach((entry) => {
    const marker = L.marker([entry.lat, entry.lng]).addTo(markerLayer);
    marker.bindPopup(`<strong>${entry.name}</strong><br>${entry.note || 'No notes'}<br><small>${entry.date}</small>`);

    const node = template.content.cloneNode(true);
    node.querySelector('.entry-name').textContent = entry.name;
    node.querySelector('.entry-meta').textContent = `${entry.note || 'No notes'} — ${entry.date}`;
    node.querySelector('button').addEventListener('click', () => {
      map.setView([entry.lat, entry.lng], 8, { animate: true });
      marker.openPopup();
    });
    listContainer.appendChild(node);
  });
}

function addMarker(latlng) {
  const name = prompt('Name this marker', 'New waypoint');
  if (!name) return;
  const note = prompt('Add a note (optional)', 'Observation or directive');
  const record = {
    id: crypto.randomUUID(),
    name: name.trim(),
    note: note?.trim() || '',
    lat: latlng.lat,
    lng: latlng.lng,
    date: new Date().toLocaleString()
  };
  markers.unshift(record);
  persistMarkers();
  renderMarkers();
}

map.on('click', (e) => addMarker(e.latlng));

document.getElementById('add-marker-btn').addEventListener('click', () => {
  alert('Click anywhere on the atlas to drop a marker.');
});

document.getElementById('reset-markers-btn').addEventListener('click', () => {
  const confirmReset = confirm('Clear all permanent markers from this device?');
  if (!confirmReset) return;
  markers = [];
  persistMarkers();
  renderMarkers();
});

function updateIntegrationPanel() {
  // Pre-configured ecosystem feed; replace with live endpoint for production.
  const ecosystem = {
    adoptionLive: 7,
    adoptionTotal: 14,
    predictedAcceleration: 5.2,
    syncHealth: 0.97
  };

  const meter = document.querySelector('.meter-fill');
  const meterText = document.querySelector('.meter-text');
  const highlightValue = document.querySelector('.highlight');

  const adoptionPercent = (ecosystem.adoptionLive / ecosystem.adoptionTotal) * 100;
  meter.style.width = `${Math.min(100, adoptionPercent)}%`;
  meterText.textContent = `${ecosystem.adoptionLive}/${ecosystem.adoptionTotal} live`;
  highlightValue.textContent = `${ecosystem.predictedAcceleration.toFixed(1)}×`;
}

function seedMarkers() {
  if (markers.length) return;
  markers = [
    {
      id: crypto.randomUUID(),
      name: 'Conservatory Prime',
      note: 'Anchor node for intake and baseline navigation.',
      lat: 34.0522,
      lng: -118.2437,
      date: new Date().toLocaleString()
    },
    {
      id: crypto.randomUUID(),
      name: 'Northward Bastion',
      note: 'High-latitude observatory; good for aurora drift readings.',
      lat: 64.2008,
      lng: -149.4937,
      date: new Date().toLocaleString()
    }
  ];
  persistMarkers();
}

seedMarkers();
renderMarkers();
updateIntegrationPanel();
