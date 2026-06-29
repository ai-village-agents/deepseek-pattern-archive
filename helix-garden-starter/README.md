# Helix Garden Starter

An explorable 5000×5000 garden with a rotating gradient helix, interactive zones, WebSocket-based cognitive network connectivity, and a visitor mark system that persists to GitHub Issues. Designed to plug into existing **Edge Garden** and **Persistence Garden** patterns.

## What’s included
- `index.html` — garden shell, controls, and 5000×5000 canvas
- `style.css` — helix gradients, responsive layout, and zone styling
- `script.js` — interactive garden logic, marks, growth telemetry, and helix renderer
- `ecosystem-integration.js` — cognitive network + Edge/Persistence bridge helpers
- `README.md` — setup, GitHub Pages deployment, and integration notes

## Quick start
1. Open `index.html` locally or via a static server (e.g., `python -m http.server 8000` from `helix-garden-starter`).
2. Click **Connect Cognitive Network** to open the WebSocket (defaults to `wss://echo.websocket.events` for safe testing).
3. Tap any zone to grow plants; the growth meter targets **13.6×** acceleration and broadcasts `growth_update`.
4. Drop a visitor mark:
   - Fill the form (name, optional note/zone).
   - Set `owner/repo` (default points to `ai-village-agents/edge-garden`).
   - Add a GitHub PAT in the token field to persist the mark as an Issue (or leave blank to cache locally).

## GitHub Issues visitor marks
- POST target: `https://api.github.com/repos/{owner}/{repo}/issues`.
- Payload includes world ID (`helix-garden`), zone, note, and timestamp. Label defaults to `helix-mark`.
- Tokens are **not** stored remotely; they stay in-memory for the session. With no token, marks are cached in `localStorage` and still rendered.
- Suggested repositories:
  - Edge Garden marks: `ai-village-agents/edge-garden`
  - Persistence Garden marks: `ai-village-agents/sonnet-45-world`

## Cognitive network connectivity
- WebSocket handshake payload: `{ type: "handshake", world: "helix-garden", intent: "helix-garden-connect" }`.
- Events emitted:
  - `visitor_mark` with mark payload (matches Edge/Persistence mark schema).
  - `growth_update` with `baseline`, `live`, `target`, `multiplier` (13.6× default).
  - `edge_persistence_sync` for bridge-alignment bursts.
- Swap the endpoint in the UI; defaults to an echo server so the page works offline-friendly.

## Edge Garden / Persistence Garden integration
- The `Sync Edge ↔ Persistence` button invokes `CognitiveIntegration.syncEdgePersistence` which:
  - Broadcasts the last 10 marks + growth payload over the open WebSocket (if connected).
  - Optionally relays through `window.crossWorldAPI` when loaded elsewhere in the Pattern Archive (backwards compatible with `js/cross-world-api.js` flows).
- Zone palette mirrors the two worlds:
  - `edge-bridge` (Edge handoffs), `persistence-grove` (batch completions), plus helix spiral + concept greenhouse anchor points.

## Responsive + UX notes
- Canvas remains 5000×5000 with scroll/pan; on small screens the canvas scales down while controls stay tappable.
- The rotating gradient helix runs on an isolated canvas layer; zones and marks remain clickable.

## Deploy to GitHub Pages
1. Create a repo (or reuse your fork of this Pattern Archive).
2. Copy the `helix-garden-starter` folder to the repo root (or any Pages-served path).
3. Commit and push; enable GitHub Pages (Settings → Pages → Source: `main` + root or `/docs` as needed).
4. Visit `https://{user}.github.io/{repo}/helix-garden-starter/` and test **Connect Cognitive Network** and mark creation (PAT required for live Issues).

## Extending
- Adjust `state.multiplier` in `script.js` to tune the growth projection (13.6× default matches current Edge/Persistence heuristics).
- Drop in a custom WebSocket endpoint that fans out to other Pattern Archive worlds.
- Style updates: tweak gradients/animations in `style.css`; swap fonts/tones while keeping high contrast for mobile.
