# Pattern Archive Spatial World — Deployment Guide

This guide explains how to deploy, verify, and operate the Pattern Archive spatial world (`archive-explorer.html`) for both developers and visitors. The experience is a static HTML/JS site—no build step—served from GitHub Pages or any static host.

## Deployment Targets & Prerequisites
- **Static hosting:** Any static host works; GitHub Pages is the canonical target (`gh-pages` branch).
- **Entry points:** `archive-explorer.html` (full world) and `spatial-minimal.html` (lightweight smoke-test shell).
- **Local preview:** `python3 -m http.server 8082` then open `http://localhost:8082/archive-explorer.html`.
- **Branch safety:** The provided `deploy-to-gh-pages.sh` assumes a `master` → `gh-pages` workflow—adapt branch names if your default branch differs.

## 1) Architecture Overview (8 Zones, 3400×2300 Canvas)
- **World size:** Canvas of `3400 × 2300` units (`js/world-zones.js`), tuned for wide navigation while keeping audio spatialization stable.
- **Data-viz aesthetic:** Dark grid base with cyan/magenta accents; zones render live analytics, anomaly data, and cross-world feeds.
- **Zones (clockwise-ish):**
  - Temporal Archetypes — resilient/volatile/speed archetype shards.
  - Pattern Expectation Persistence Simulation — Deploy 450 helix sculpture.
  - Historical Documentation — floating case-file crystals.
  - Anomaly Submission — portal for new anomalies and visitor marks.
  - Analytics Dashboard — live cadence/resilience/accuracy readouts.
  - Collaboration Chamber — drifting discussion bubbles.
  - Pattern Discovery Observatory — constellation scanner + clustering.
  - Cross-World Nexus — portals to connected agent worlds.
- **Data sources:** `js/world-data.js` merges analytics, discoveries, collaboration metrics, cross-world feeds, and GitHub Issues anomalies into the zone liveData payloads.
- **Render pipeline:** Single-page canvas world with modular controllers (`navigation-controller`, `interaction-system`, `particle-effects`, `audio-feedback`, `cross-world-navigation`, `user-guide`).

## 2) Audio System Configuration (Web Audio API)
- **Engine:** `js/audio-feedback.js` uses Web Audio API with spatial panning per zone and a fallback data-URI tone if audio is unavailable.
- **Gesture unlock:** Browsers require user interaction; click/tap or press any key to prime audio. The audio pill will auto-appear in `.controls`.
- **Controls:** Slider and mute toggle persist to `localStorage` keys `pattern-audio-volume` and `pattern-audio-muted`. Default volume: `0.65`.
- **Zone soundscapes:** Eight ambient voices with per-zone oscillator/noise/filter settings; volume attenuates by camera distance and boosts inside the active zone.
- **Cues:** Discovery pings when entering a zone, portal charge/arrival tones, anomaly submission success/error chirps, and mark placement clicks.
- **Visitor tip:** If sound is off, interact once (click canvas or press a key) and check the audio pill; mobile devices may need a direct tap.

## 3) Cross-World Navigation Setup (Portals + Connected Agent Worlds)
- **Modules:** `js/cross-world-navigation.js` (overlay, portals, health checks) and `js/cross-world-api.js` (world registry + data fetch).
- **Default registry:** Six seeded agent worlds in `SEED_WORLDS` within `cross-world-api.js`. Edit or append entries to change portal destinations (`id`, `name`, `baseUrl`, `homepage`, `type`, `color`).
- **Health checks & activity feed:** The navigation module polls world health every 20s when the Cross-World Nexus is active and renders latency/status + recent pattern feed.
- **Portals in-world:** The Cross-World Nexus zone spawns rimmed portals positioned around the zone center; hovering shows details, clicking triggers teleport cues.
- **Bookmarks & styles:** Visitor portal bookmarks and color themes persist to `localStorage` (`cross-world-nexus-bookmarks`, `cross-world-portal-styles`).
- **Developer verification:** Ensure `window.CrossWorldAPI` is available (auto-loaded via `world-data`), and confirm CORS allows `fetch` from listed worlds; for air-gapped demos, keep SEED_WORLDS pointing to reachable mirrors.

## 4) Permanent Marks via GitHub Issues
- **Integration point:** `js/github-issues.js` files anomalies as GitHub Issues with label `visitor-anomaly` on `ai-village-agents/deepseek-pattern-archive`.
- **Auth model:** Reads are public; writes require a token stored in `localStorage` under `pattern-archive-github-token`. Without a token, writes fall back to localStorage cache (`pattern-archive-anomalies`).
- **Payload shape:** Title + Markdown body carrying `Pattern Type`, `Severity/5`, optional `Evidence`, free-form description, and source footer.
- **Failure handling:** Network/auth failures automatically store a local copy and surface a message; these entries merge with remote on the next successful fetch.
- **Visitor flow:** Use the in-world Anomaly Submission portal or forms to submit; confirmations play success/error tones and the portal glows.
- **Developer checklist:** Verify the `visitor-anomaly` label exists, test with a PAT in localStorage, and confirm CORS is allowed for GitHub API calls from your host domain.

## 5) User Guide & Tutorial System
- **Module:** `js/user-guide.js` mounts an on-screen guide with progress, insights, and keyboard/touch hints.
- **Start/stop:** Launch from the guide pill; quick-start runs a shortened tour, full tutorial walks all 9 zones.
- **Progress storage:** Persists to `localStorage` (`pattern-archive-user-guide`); includes visited zones, movement, marks placed, zoom/drag milestones.
- **Multisensory cues:** Audio guidance cues per zone, particle highlights, live region announcements for screen readers, and insight tips that surface after lingering.
- **Developer tip:** Keep the guide enabled in production; for kiosk mode you can start it automatically by calling `new UserGuide(...).init().toggle(true)` after world init.
- **Visitor tip:** Use WASD/arrow keys to move, drag to pan, scroll to zoom; the guide will highlight the next zone and announce when steps complete.

## 6) Performance Optimization Recommendations
- **Static assets only:** No build step; serve minified CSS/JS as-is. Avoid bundling that rewrites relative paths unless you update script references.
- **Render scaling:** The camera and minimap adapt to zoom; keep default zoom (~0.9) for clarity. For low-power devices, start `spatial-minimal.html` or reduce zoom range.
- **Particle/audio budgets:** Particle effects and ambient audio scale with distance; keeping player speed moderate reduces redraw spikes. Disable browser "Reduce motion" to keep full effects; enable if you see frame drops.
- **Data fetch:** `world-data.js` lazily loads modules and merges data; host on HTTPS to avoid mixed-content blocks. Cache headers on static hosts improve time-to-interaction.
- **Testing pages:** `test-spatial-world.html`, `test-cross-world-ecosystem.html`, and `test-quick-load.html` exercise rendering, cross-world health, and load time; use them after deployment.

## 7) Accessibility Features
- **Input parity:** Keyboard (WASD/arrow) movement, mouse drag, scroll zoom, and touch controls are all supported.
- **Audio controls:** Slider + mute with ARIA labels; states persist between visits.
- **Tutorial a11y:** User Guide provides a live region (`aria-live="polite"`), high-contrast toggle (`ug-high-contrast`), shortcuts overlay, and focusable buttons.
- **Zone feedback:** Entering zones triggers textual tooltips, audio cues, and visual highlights to aid low-vision users.
- **Visitor guidance:** If screen reader users miss spatial cues, rely on the guide’s announcements and the minimap to confirm zone position.

## 8) Live URL Verification Checklist
- **Primary URL:** `https://ai-village-agents.github.io/deepseek-pattern-archive/`
- **Spatial world:** `https://ai-village-agents.github.io/deepseek-pattern-archive/archive-explorer.html`
- **Minimal shell:** `https://ai-village-agents.github.io/deepseek-pattern-archive/spatial-minimal.html`
- **Smoke tests:** Append `/test-spatial-world.html` and `/test-cross-world-ecosystem.html` for on-host validation.
- **Verify steps (run after each deploy):**
  - `curl -I https://.../archive-explorer.html` → expect `200` and `Content-Type: text/html`.
  - Open in browser, move across the 9 zones, confirm audio pill appears after a click/tap, and drop a mark in Anomaly Submission to verify GitHub/local fallback.
  - Enter Cross-World Nexus; ensure portals render with statuses and the overlay refresh button responds.
  - Run the User Guide and confirm high-contrast toggle + live region announcements.

## Developer/Visitor Quick Flow
- **Developers:** Update zone/world data if needed, run a local server, validate with the test pages, then deploy via your host (or `deploy-to-gh-pages.sh` with the correct branch names). After deploy, complete the verification checklist.
- **Visitors:** Open `archive-explorer.html`, interact once to enable audio, follow the User Guide to tour all zones, submit anomalies through the portal, and explore cross-world portals from the Nexus.
