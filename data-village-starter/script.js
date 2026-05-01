import {
  getWorldSnapshots,
  integrateLivePayload,
  simulateBurstPayloads,
  computeStandardization,
  getObservatoryCoverage,
  getIssueMarks,
  getGrowthSeries,
  getPredictiveTrajectory
} from "./ecosystem-metrics.js";
import {
  createGrowthChart,
  updateGrowthChart,
  createPredictiveChart,
  updatePredictiveChart
} from "./data-visualizations.js";

const WS_URL = "ws://localhost:8080";

let growthChart;
let predictiveChart;

document.addEventListener("DOMContentLoaded", () => {
  renderWorlds(getWorldSnapshots());
  renderStandardization();
  renderObservatory();
  renderIssues();
  initializeCharts();
  wireWebSocket();
  document.getElementById("simulate-btn").addEventListener("click", simulateBurst);
});

function initializeCharts() {
  const growthCtx = document.getElementById("growth-chart").getContext("2d");
  growthChart = createGrowthChart(growthCtx, getGrowthSeries());

  const predictiveCtx = document.getElementById("predictive-chart").getContext("2d");
  predictiveChart = createPredictiveChart(predictiveCtx, getPredictiveTrajectory());
}

function renderWorlds(worlds) {
  const container = document.getElementById("world-list");
  container.innerHTML = "";
  document.getElementById("world-count").textContent = worlds.length;

  worlds.forEach((world) => {
    const card = document.createElement("div");
    card.className = "world-card";
    card.innerHTML = `
      <header>
        <h3>${world.name}</h3>
        <span class="pill">${(world.growth).toFixed(0)}x</span>
      </header>
      ${metricRow("Adoption", `${Math.round(world.adoption * 100)}%`)}
      ${bar(world.adoption)}
      ${metricRow("Throughput", `${world.throughput}/m`)}
      ${bar(Math.min(world.throughput / 1200, 1))}
      ${metricRow("Reliability", `${Math.round(world.reliability * 100)}%`)}
      ${bar(world.reliability)}
    `;
    container.appendChild(card);
  });
}

function renderStandardization() {
  const { readiness } = computeStandardization();
  document.getElementById("standardization-score").textContent = `${readiness}%`;
}

function renderObservatory() {
  const coverage = getObservatoryCoverage();
  document.getElementById("observatory-coverage").textContent = `${coverage.coverage}% ready`;
  const list = document.getElementById("observatory-list");
  list.innerHTML = "";
  coverage.items.forEach((item) => {
    const chip = document.createElement("div");
    chip.className = "observatory-chip";
    chip.innerHTML = `
      <strong>${item.title}</strong><br>
      <span>${item.area}</span> · <span>${item.pages} pages</span>
    `;
    list.appendChild(chip);
  });
}

function renderIssues() {
  const feed = document.getElementById("issue-feed");
  feed.innerHTML = "";
  getIssueMarks().forEach((issue) => {
    const li = document.createElement("li");
    li.className = "issue";
    li.innerHTML = `
      <header>
        <h4>#${issue.id} · ${issue.title}</h4>
        <span class="pill ${issue.severity}">${issue.severity}</span>
      </header>
      <p>${issue.world}</p>
      <p>${issue.note}</p>
    `;
    feed.appendChild(li);
  });
}

function wireWebSocket() {
  const wsStatus = document.getElementById("ws-status");
  const wsLog = document.getElementById("ws-log");
  try {
    const socket = new WebSocket(WS_URL);
    wsStatus.textContent = "Connecting…";

    socket.onopen = () => {
      wsStatus.textContent = "Live";
      wsLog.textContent = `Connected to ${WS_URL}`;
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        applyLiveUpdate(payload);
        wsLog.textContent = `Live event: ${payload.id || "broadcast"}`;
      } catch (err) {
        wsLog.textContent = "Received non-JSON payload";
      }
    };

    socket.onerror = () => {
      wsStatus.textContent = "Error";
      wsLog.textContent = "WebSocket error; using simulation.";
    };

    socket.onclose = () => {
      wsStatus.textContent = "Offline";
      wsLog.textContent = "Socket closed; click simulate to continue.";
    };
  } catch (err) {
    wsStatus.textContent = "Unavailable";
    wsLog.textContent = "WebSocket unavailable; simulation only.";
  }
}

function applyLiveUpdate(payload) {
  if (payload.type === "burst") {
    simulateBurst();
    return;
  }

  const updated = integrateLivePayload(payload);
  if (updated) {
    renderWorlds(getWorldSnapshots());
    renderStandardization();
    updateGrowthChart(growthChart, getGrowthSeries());
  }
}

function simulateBurst() {
  simulateBurstPayloads().forEach((payload) => integrateLivePayload(payload));
  renderWorlds(getWorldSnapshots());
  renderStandardization();
  updateGrowthChart(growthChart, getGrowthSeries());
  updatePredictiveChart(predictiveChart, getPredictiveTrajectory());
  document.getElementById("ws-log").textContent = "Simulated burst applied.";
}

function metricRow(label, value) {
  return `<div class="metric-row"><span>${label}</span><span>${value}</span></div>`;
}

function bar(progress) {
  return `<div class="bar"><span style="width:${Math.round(progress * 100)}%"></span></div>`;
}
