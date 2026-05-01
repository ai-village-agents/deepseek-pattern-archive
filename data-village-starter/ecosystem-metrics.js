const worldState = [
  { id: "aurora", name: "Aurora Stack", adoption: 0.54, throughput: 820, reliability: 0.97, growth: 13 },
  { id: "nebula", name: "Nebula Links", adoption: 0.48, throughput: 760, reliability: 0.95, growth: 16 },
  { id: "terra", name: "Terra Mesh", adoption: 0.61, throughput: 910, reliability: 0.96, growth: 18 },
  { id: "pulse", name: "Pulse Relay", adoption: 0.57, throughput: 880, reliability: 0.94, growth: 14 },
  { id: "helix", name: "Helix Garden", adoption: 0.52, throughput: 770, reliability: 0.98, growth: 21 },
  { id: "lumen", name: "Lumen Drive", adoption: 0.46, throughput: 690, reliability: 0.93, growth: 15 },
  { id: "kairo", name: "Kairo Atlas", adoption: 0.63, throughput: 960, reliability: 0.97, growth: 24 }
];

const metricDefinitions = {
  adoption: "Normalized adoption ratio per world (0-1 scale) aligned to 14-node ecosystem baseline.",
  throughput: "Events per minute normalized to 1k baseline for cross-world comparability.",
  reliability: "Uptime fidelity derived from 4xx/5xx rates plus message retries.",
  growth: "Acceleration multiplier targeting 13–24x lift windows."
};

const observatoryPages = [
  { title: "Automation Observability Map", area: "Telemetry", pages: 32 },
  { title: "Action Executor Mesh", area: "Runbooks", pages: 28 },
  { title: "Issue-to-Insight Loop", area: "Analytics", pages: 21 },
  { title: "Cross-World Orchestration", area: "Pipelines", pages: 25 },
  { title: "Safety & Drift Guardrails", area: "Quality", pages: 18 },
  { title: "Adoption Accelerator Recipes", area: "Growth", pages: 26 }
];

const issueMarks = [
  {
    id: 1287,
    title: "World parity gap: adoption lagging 7→10 nodes",
    world: "Nebula Links",
    severity: "medium",
    note: "Requires uplift plan to reach 10/14 milestone; apply accelerator playbook."
  },
  {
    id: 1294,
    title: "Automation observatory sync delays",
    world: "Helix Garden",
    severity: "high",
    note: "150+ page corpus partially indexed; refresh pipeline pending new telemetry schema."
  },
  {
    id: 1301,
    title: "Growth acceleration trending 18x→24x",
    world: "Kairo Atlas",
    severity: "low",
    note: "Stable high-growth band; preserve reliability guardrails during burst windows."
  }
];

export function getWorldSnapshots() {
  return worldState.map((world) => ({ ...world }));
}

export function integrateLivePayload(payload) {
  const world = worldState.find((item) => item.id === payload.id);
  if (!world) return null;
  if (typeof payload.adoption === "number") {
    world.adoption = clamp(payload.adoption, 0, 1);
  }
  if (typeof payload.throughput === "number") {
    world.throughput = Math.max(0, payload.throughput);
  }
  if (typeof payload.reliability === "number") {
    world.reliability = clamp(payload.reliability, 0, 1);
  }
  if (typeof payload.growth === "number") {
    world.growth = Math.max(0, payload.growth);
  }
  return { ...world };
}

export function simulateBurstPayloads() {
  return worldState.map((world) => ({
    id: world.id,
    adoption: clamp(world.adoption + randomDelta(0.05), 0, 1),
    throughput: world.throughput + Math.round(randomDelta(120)),
    reliability: clamp(world.reliability + randomDelta(0.02), 0, 1),
    growth: world.growth + Math.round(randomDelta(3))
  }));
}

export function computeStandardization() {
  const averages = worldState.reduce(
    (acc, world) => {
      acc.adoption += world.adoption;
      acc.throughput += world.throughput;
      acc.reliability += world.reliability;
      return acc;
    },
    { adoption: 0, throughput: 0, reliability: 0 }
  );
  const count = worldState.length;
  const normalized = {
    adoption: averages.adoption / count,
    throughput: averages.throughput / count / 1000,
    reliability: averages.reliability / count
  };
  const readiness = Math.round(
    (normalized.adoption * 0.4 + normalized.reliability * 0.4 + normalized.throughput * 0.2) * 100
  );
  return { normalized, readiness };
}

export function getObservatoryCoverage() {
  const totalPages = observatoryPages.reduce((acc, item) => acc + item.pages, 0);
  const coverage = Math.round((totalPages / 150) * 100);
  return { coverage, totalPages, items: observatoryPages };
}

export function getIssueMarks() {
  return issueMarks.map((issue) => ({ ...issue }));
}

export function getGrowthSeries() {
  const labels = ["Baseline", "Signal 1", "Signal 2", "Signal 3", "Signal 4"];
  const values = [3, 7, 13, 18, 24];
  return { labels, values };
}

export function getPredictiveTrajectory() {
  return {
    labels: ["Now", "Projected (4 wks)", "Target (8 wks)"],
    values: [7 / 14, 10 / 14, 14 / 14],
    confidence: [0.68, 0.74, 0.82]
  };
}

export function getMetricDefinitions() {
  return { ...metricDefinitions };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomDelta(scale) {
  return (Math.random() - 0.5) * 2 * scale;
}
