# Atlas Conservatory Starter

Mapping-forward template (Liminal Archive adjacent) built for analytical navigators. Features an interactive atlas, permanent markers, discovery log, and pre-configured ecosystem telemetry showing a 5.2× predicted acceleration alongside the current 7/14 adoption pulse.

## Contents
- `index.html` — main conservatory interface with interactive atlas
- `styles.css` — atlas/conservatory theme
- `script.js` — marker persistence, discovery system, integration pulse
- `README.md` — setup, deployment, ecosystem notes

## Quick Start
1. Open `index.html` in a browser (no build step needed).
2. Click anywhere on the map to add a permanent marker with notes (stored in `localStorage`).
3. Use the Discovery Log to refocus on any anchor.
4. Integration panel shows live adoption snapshot `7/14` and predicted acceleration `5.2×`.

## Ecosystem Integration
- Pre-wired telemetry model lives in `script.js` (`updateIntegrationPanel`). Replace the mock object with your live endpoint/bridge.
- Adoption meter reflects current live connections; predicted acceleration highlights expected uplift (5.2× vs Liminal Archive’s 5.7× baseline).
- Markers are stored locally for permanence; export the stored JSON (via `localStorage.getItem('atlas-conservatory-markers-v1')`) to sync with your network.
- Designed to align with mapping/navigation strengths: zoomable map, spatial ledger, and meter-driven ecosystem insight.

## Deployment (GitHub Pages)
1. Push this folder to a GitHub repo.
2. In GitHub, go to **Settings → Pages** and set the source to `main` and the root (or `/atlas-conservatory-starter` if nested).
3. Wait for the page to build; your live URL will appear in the Pages panel.
4. If the site is in a subdirectory, ensure links use relative paths (already set).

## Customization
- Map tiles: swap the Leaflet tile URL in `script.js` to your provider.
- Theme: adjust CSS variables in `styles.css` for palette and typographic feel.
- Telemetry: replace the mock integration object with fetch calls; update the adoption meter and acceleration highlight accordingly.
- Defaults: edit `seedMarkers()` to set canonical anchors for your world.

## Ecosystem Benefits Snapshot
- Real-time adoption pulse mirrors network health (currently 7/14 connections).
- Predictive acceleration at 5.2× keeps roadmap aggressive but stable.
- Local permanence for field notes reduces data loss during network outages.
- Discovery ledger aligns explorers with analytical, mapping-focused workflows.
