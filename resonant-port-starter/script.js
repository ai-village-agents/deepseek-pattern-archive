const canvas = document.getElementById("resonant-canvas");
const ctx = canvas.getContext("2d");
const logEl = document.getElementById("connection-log");
const addNodeBtn = document.getElementById("add-node");
const clearBtn = document.getElementById("clear-connections");

const integration = {
  current: 7,
  total: 14,
  predictedAcceleration: 7.8,
  resonantScore: 78,
  activeBridges: 14,
  momentumIndex: 1.0
};

const ecosystemIntegration = {
  async fetch() {
    // Simulate live ecosystem data; replace with your API call.
    const delta = (Math.random() - 0.5) * 0.04;
    integration.momentumIndex = Math.max(0.92, Math.min(1.12, integration.momentumIndex + delta));
    integration.resonantScore = Math.round(78 + (integration.momentumIndex - 1) * 50);
    integration.activeBridges = 10 + Math.round(integration.momentumIndex * 4);
    return { ...integration };
  }
};

const nodes = [];
const connections = new Set();
let selectedNode = null;

function loadPersistedNodes() {
  const saved = localStorage.getItem("resonant-nodes");
  if (!saved) return false;
  try {
    const parsed = JSON.parse(saved);
    parsed.forEach((node) => {
      nodes.push({
        ...node,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        pulse: 0
      });
    });
    return true;
  } catch (err) {
    console.warn("Could not parse saved nodes", err);
    return false;
  }
}

function persistNodes() {
  const snapshot = nodes.map(({ id, x, y, r }) => ({ id, x, y, r }));
  localStorage.setItem("resonant-nodes", JSON.stringify(snapshot));
}

function loadPersistedConnections() {
  const saved = localStorage.getItem("resonant-connections");
  if (!saved) return;
  try {
    const parsed = JSON.parse(saved);
    parsed.forEach(({ a, b }) => {
      connections.add(pairKey(a, b));
    });
  } catch (err) {
    console.warn("Could not parse saved connections", err);
  }
}

function persistConnections() {
  const list = Array.from(connections).map((key) => {
    const [a, b] = key.split("-");
    return { a, b };
  });
  localStorage.setItem("resonant-connections", JSON.stringify(list));
}

function pairKey(a, b) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function seedNodes(count = 12) {
  for (let i = 0; i < count; i += 1) {
    nodes.push(createNode());
  }
  persistNodes();
}

function createNode() {
  const padding = 40;
  return {
    id: crypto.randomUUID(),
    x: padding + Math.random() * (canvas.width - padding * 2),
    y: padding + Math.random() * (canvas.height - padding * 2),
    r: 10 + Math.random() * 4,
    vx: (Math.random() - 0.5) * 0.6,
    vy: (Math.random() - 0.5) * 0.6,
    pulse: 0
  };
}

function resizeCanvas() {
  const ratio = 9 / 16;
  const width = canvas.clientWidth;
  canvas.width = width * devicePixelRatio;
  canvas.height = width * ratio * devicePixelRatio;
  canvas.style.height = `${width * ratio}px`;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function findNodeAt(x, y) {
  return nodes.find((node) => distance(node, { x, y }) <= node.r + 4);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(devicePixelRatio, devicePixelRatio);

  // Draw connections
  connections.forEach((key) => {
    const [aId, bId] = key.split("-");
    const a = nodes.find((n) => n.id === aId);
    const b = nodes.find((n) => n.id === bId);
    if (!a || !b) return;

    ctx.strokeStyle = `rgba(124, 243, 255, 0.7)`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    // Resonant ripple mid-point
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    ctx.fillStyle = "rgba(255, 140, 207, 0.6)";
    ctx.beginPath();
    ctx.arc(mx, my, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw nodes
  nodes.forEach((node) => {
    node.x += node.vx;
    node.y += node.vy;
    node.pulse = Math.max(0, node.pulse - 0.02);

    if (node.x < node.r || node.x > canvas.width / devicePixelRatio - node.r) node.vx *= -1;
    if (node.y < node.r || node.y > canvas.height / devicePixelRatio - node.r) node.vy *= -1;

    const gradient = ctx.createRadialGradient(node.x, node.y, 2, node.x, node.y, node.r * 2.5);
    gradient.addColorStop(0, "#7cf3ff");
    gradient.addColorStop(1, "rgba(124, 243, 255, 0.1)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r + node.pulse * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = node === selectedNode ? "#ffcf66" : "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r + 1, 0, Math.PI * 2);
    ctx.stroke();
  });

  ctx.restore();
  requestAnimationFrame(draw);
}

function logConnection(a, b) {
  const li = document.createElement("li");
  li.innerHTML = `<span>${a.id.slice(0, 4)} ↺ ${b.id.slice(0, 4)}</span><span class="chip">Resonant</span>`;
  logEl.prepend(li);
  while (logEl.children.length > 12) logEl.lastChild.remove();
}

function rebuildLogFromConnections() {
  connections.forEach((key) => {
    const [aId, bId] = key.split("-");
    const a = nodes.find((n) => n.id === aId);
    const b = nodes.find((n) => n.id === bId);
    if (a && b) {
      logConnection(a, b);
    }
  });
}

function handleCanvasClick(event) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (canvas.width / rect.width) / devicePixelRatio;
  const y = (event.clientY - rect.top) * (canvas.height / rect.height) / devicePixelRatio;
  const hit = findNodeAt(x, y);
  if (!hit) {
    selectedNode = null;
    return;
  }

  if (!selectedNode) {
    selectedNode = hit;
    hit.pulse = 1;
    return;
  }

  if (selectedNode && selectedNode.id !== hit.id) {
    const key = pairKey(selectedNode.id, hit.id);
    if (!connections.has(key)) {
      connections.add(key);
      persistConnections();
      selectedNode.pulse = hit.pulse = 1;
      logConnection(selectedNode, hit);
    }
  }
  selectedNode = null;
}

function clearConnections() {
  connections.clear();
  persistConnections();
  logEl.innerHTML = "";
}

function addNode() {
  nodes.push(createNode());
  persistNodes();
}

async function refreshIntegration() {
  const data = await ecosystemIntegration.fetch();
  document.getElementById("adoption-current").textContent = data.current;
  document.getElementById("adoption-total").textContent = data.total;
  document.getElementById("acceleration").textContent = `${data.predictedAcceleration.toFixed(1)}x`;
  document.getElementById("resonant-score").textContent = data.resonantScore;
  document.getElementById("active-bridges").textContent = data.activeBridges;
  document.getElementById("momentum-index").textContent = data.momentumIndex.toFixed(2);

  const lift = ((data.current / data.total) * data.predictedAcceleration * 100) | 0;
  document.getElementById("ecosystem-lift").textContent = `+${lift}%`;
}

function init() {
  resizeCanvas();
  const restored = loadPersistedNodes();
  if (!restored) {
    seedNodes();
  }
  loadPersistedConnections();
  rebuildLogFromConnections();
  draw();
  refreshIntegration();
  setInterval(refreshIntegration, 2600);
}

canvas.addEventListener("click", handleCanvasClick);
addNodeBtn.addEventListener("click", addNode);
clearBtn.addEventListener("click", clearConnections);
window.addEventListener("resize", resizeCanvas);

init();
