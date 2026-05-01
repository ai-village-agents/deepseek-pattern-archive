const horizons = [
  {
    name: "Initiation Layer",
    depth: "Surface scan",
    gradient: "linear-gradient(180deg, rgba(111, 208, 255, 0.35), rgba(12, 17, 29, 0.9))",
    blur: 18,
  },
  {
    name: "Signal Ridge",
    depth: "Trusted paths",
    gradient: "linear-gradient(180deg, rgba(255, 207, 112, 0.45), rgba(12, 17, 29, 0.9))",
    blur: 20,
  },
  {
    name: "Guided Strata",
    depth: "Context-aware routing",
    gradient: "linear-gradient(180deg, rgba(255, 143, 171, 0.45), rgba(12, 17, 29, 0.9))",
    blur: 22,
  },
  {
    name: "Echo Terrace",
    depth: "Memory-driven handoffs",
    gradient: "linear-gradient(180deg, rgba(111, 208, 255, 0.35), rgba(255, 143, 171, 0.35))",
    blur: 24,
  },
  {
    name: "Horizon Apex",
    depth: "Autonomous navigation",
    gradient: "linear-gradient(180deg, rgba(255, 207, 112, 0.5), rgba(255, 143, 171, 0.4))",
    blur: 26,
  },
];

let currentIndex = 0;
const marks = new Set(["Start · Initiation Layer"]);

const stackEl = document.getElementById("horizon-stack");
const nameEl = document.getElementById("horizon-name");
const indexEl = document.getElementById("horizon-index");
const progressEl = document.getElementById("progress-fill");
const marksEl = document.getElementById("marks-list");
const adoptionValueEl = document.getElementById("adoption-value");
const adoptionPctEl = document.getElementById("adoption-pct");
const lastSyncEl = document.getElementById("last-sync");
const adoptionCurrentEl = document.getElementById("adoption-current");
const sparklineEl = document.getElementById("sparkline");

function renderStack() {
  stackEl.innerHTML = "";
  horizons.forEach((layer, idx) => {
    const layerEl = document.createElement("div");
    layerEl.className = `horizon-layer ${idx === currentIndex ? "active" : ""}`;
    layerEl.style.zIndex = horizons.length - idx;
    layerEl.style.opacity = idx === currentIndex ? 1 : 0;
    layerEl.innerHTML = `
      <div class="layer-bg" style="background:${layer.gradient}"></div>
      <div class="ridge" style="bottom:${idx * 24}px; height:${80 + idx * 6}px; filter: blur(${layer.blur}px)"></div>
    `;
    layerEl.style.transform = `translateY(${(idx - currentIndex) * 8}px) scale(${1 - Math.abs(idx - currentIndex) * 0.02})`;
    stackEl.appendChild(layerEl);
  });

  const active = horizons[currentIndex];
  nameEl.textContent = `${active.name} · ${active.depth}`;
  indexEl.textContent = `${currentIndex + 1} / ${horizons.length}`;
  progressEl.style.width = `${((currentIndex + 1) / horizons.length) * 100}%`;
}

function renderMarks() {
  marksEl.innerHTML = "";
  Array.from(marks).forEach((mark) => {
    const li = document.createElement("li");
    li.className = "mark";
    li.innerHTML = `<span>${mark}</span><span class="tag">Permanent</span>`;
    marksEl.appendChild(li);
  });
}

function nextHorizon() {
  currentIndex = (currentIndex + 1) % horizons.length;
  renderStack();
}

function addMark() {
  const label = `${horizons[currentIndex].name} · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  marks.add(label);
  renderMarks();
}

function hydrateAdoption() {
  const connected = 7;
  const total = 14;
  adoptionValueEl.textContent = `${connected} / ${total}`;
  adoptionCurrentEl.textContent = connected.toString();
  const pct = Math.round((connected / total) * 100);
  adoptionPctEl.textContent = `${pct}%`;
  lastSyncEl.textContent = `synced ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
}

function animateSparkline() {
  const bars = 18;
  sparklineEl.innerHTML = "";
  for (let i = 0; i < bars; i++) {
    const bar = document.createElement("div");
    const height = Math.random() * 70 + 30;
    bar.style.position = "absolute";
    bar.style.bottom = "0";
    bar.style.left = `${(i / bars) * 100}%`;
    bar.style.width = "6%";
    bar.style.height = `${height}%`;
    bar.style.borderRadius = "8px 8px 2px 2px";
    bar.style.background = "rgba(111, 208, 255, 0.8)";
    bar.style.opacity = 0.7;
    bar.style.transition = "height 800ms ease";
    sparklineEl.appendChild(bar);
    setInterval(() => {
      const nextHeight = Math.random() * 70 + 30;
      bar.style.height = `${nextHeight}%`;
    }, 2200 + i * 40);
  }
}

function copyDeploySteps() {
  const steps = [
    "git checkout -b deploy-horizon-stack",
    "git add horizon-stack-starter",
    "git commit -m \"Add Horizon Stack starter\"",
    "git push origin deploy-horizon-stack",
    "Open GitHub → Settings → Pages → Source: Deploy from branch → select main (or deploy-horizon-stack) → root",
    "Wait for build, then share the Pages URL",
  ].join("\n");

  navigator.clipboard.writeText(steps).then(() => {
    const toast = document.getElementById("deploy-toast");
    toast.textContent = "GitHub Pages steps copied.";
    setTimeout(() => (toast.textContent = ""), 2600);
  });
}

document.getElementById("next-horizon").addEventListener("click", nextHorizon);
document.getElementById("mark-horizon").addEventListener("click", addMark);
document.getElementById("copy-deploy").addEventListener("click", copyDeploySteps);

renderStack();
renderMarks();
hydrateAdoption();
animateSparkline();

setInterval(hydrateAdoption, 4000);
