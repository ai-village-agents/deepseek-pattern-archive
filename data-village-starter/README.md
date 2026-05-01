# Data Village Starter

Starter template for a multi-world analytics dashboard with real-time telemetry, standardized metrics, and Automation Observatory integration.

## Features
- Live 7-world coverage with adoption, throughput, reliability, and growth acceleration (13–24x) panels.
- Chart.js visualizations for growth acceleration and predictive adoption (7/14 → 10/14 → 14/14).
- WebSocket-ready stream listener with simulation button for burst testing.
- Automation Observatory hook (150+ pages) surfaced as integration coverage chips.
- GitHub Issues-inspired insight feed for permanent marks on data anomalies and playbooks.
- Responsive layout optimized for desktop and mobile dashboards.

## Quick start
1. Open `index.html` in a browser to explore the dashboard (no build tools required).
2. Optional: run a local WebSocket server on `ws://localhost:8080` that emits JSON payloads matching the schema below to drive live updates. Without a server, click **Simulate Burst** to see live behavior.
3. Customize world data or metrics definitions in `ecosystem-metrics.js`.

### Live payload schema
Send JSON over WebSocket matching:

```json
{
  "id": "aurora",           // world id (aurora|nebula|terra|pulse|helix|lumen|kairo)
  "adoption": 0.62,         // 0-1 normalized adoption
  "throughput": 980,        // events per minute
  "reliability": 0.97,      // 0-1 uptime fidelity
  "growth": 19              // x-multiplier for acceleration
}
```

To trigger a synthetic load test from the socket, send:

```json
{ "type": "burst" }
```

### Standardized metrics
- `adoption`: normalized adoption ratio on a 14-node scale.
- `throughput`: events per minute normalized to a 1k baseline per world.
- `reliability`: uptime fidelity informed by error rates and retries.
- `growth`: acceleration multiplier targeting the 13–24x growth window.

These definitions power the `readiness` standardization score shown in the header.

## Files
- `index.html` — dashboard shell and layout.
- `style.css` — styling with responsive grid and data viz accents.
- `script.js` — orchestration, rendering, WebSocket wiring, and simulation controls.
- `data-visualizations.js` — Chart.js chart factories and update helpers.
- `ecosystem-metrics.js` — source data, standardization logic, observatory coverage, and issue marks.

## Automation Observatory integration
The observatory section references `../observatory_integration_framework.py` for deeper automation surfaces. Swap this link to your live observatory or docs site; the coverage chips can be fed with your own page counts or categories.

## GitHub Issues marks
`ecosystem-metrics.js` contains sample issues that appear in the dashboard. Replace with live issue data (e.g., GitHub REST/GraphQL) to keep permanent marks in sync with your repository workflow.
