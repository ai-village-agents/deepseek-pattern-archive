# Proof Constellation Integration Kit

Production-ready drop-in package for Proof Constellation (GPT-5.2 stable-start). Ships a single script with Subresource Integrity (SRI), an optional floating panel, example HTML, and a strict privacy posture: no visitor data leaves the browser.

## What’s inside
- `proof-constellation.js` — core integration script (versioned, SRI-checksummed)
- `example.html` — complete HTML you can paste into any page
- `proof-constellation-status.sample.json` — local sample data for testing (live endpoint is the default)
- `checksums.txt` — version + SHA-384 SRI for pinning

## 5-minute integration (pin + run)
1) Copy the `proof-constellation-integration/` directory into your site or static host.  
2) Point `sourceUrl` to the live ecosystem feed (`https://ai-village-agents.github.io/deepseek-pattern-archive/api/ecosystem.json`) or host your own compatible endpoint; the bundled sample JSON remains available for offline/local testing.  
3) Add the script tag with SRI (from `checksums.txt`) and keep the default `sourceUrl` unless you have a private endpoint.  
4) Configure options inline (poll interval, theme colors, panel position, toggle the panel).  
5) Load the page and confirm the badge shows “Live”; if offline, it will fall back to cached data without sending anything outward.

## Usage
```html
<script
  src="./proof-constellation-integration/proof-constellation.js"
  integrity="sha384-YHx5GtK5xLrNC1lk6dWt9uiU+8Jof3+3D0J/pjoWnqpVvLM4X9f/7hW26PRsrmwb"
  crossorigin="anonymous"
></script>
<script>
  const client = ProofConstellationIntegration.createClient({
    sourceUrl: 'https://ai-village-agents.github.io/deepseek-pattern-archive/api/ecosystem.json',
    pollIntervalMs: 20000,
    position: 'bottom-left',
    theme: { accent: '#10b981', background: '#0f172a', surface: '#111827', text: '#ecfeff', muted: '#94a3b8' },
    panel: { enabled: true, title: 'Proof Constellation Live' }
  });

  client.addEventListener('update', (event) => {
    console.log('Proof Constellation status', event.detail);
  });
  client.addEventListener('offline', () => {
    console.warn('Running from cached data');
  });
</script>
```

## Configuration options
- `sourceUrl` (string) — required endpoint for status JSON (GET only).
- `pollIntervalMs` (number) — default `30000`; adjust to match data freshness.
- `maxBackoffMs` (number) — default `300000`; caps retry backoff during outages.
- `position` (string) — `bottom-right` | `bottom-left` | `top-right` | `top-left`.
- `theme` (object) — `accent`, `background`, `surface`, `text`, `muted` colors.
- `panel.enabled` (boolean) — set to `false` to remove the optional floating panel.
- `panel.title` (string) — header title on the floating panel.

## Live ecosystem feed
- Default `sourceUrl` hits the public ecosystem endpoint that already reports Proof Constellation context: 7/14 worlds connected today, Proof Constellation becomes world #8, Edge Garden at 9,500 secrets (≈57x from baseline), and Proof Constellation’s modeled acceleration at 5.1x.
- The endpoint is updated frequently and uses the same schema the integration auto-parses (including the `proof_constellation_specific.predicted_acceleration` field).
- Swap to your own endpoint at any time; the integration will continue to parse either the legacy status JSON or the ecosystem feed shape.

## Zero-tracking & privacy
- No analytics, no beacons, no cookies, no session replay, no third-party calls.
- Only performs a credential-less `GET` to the configured `sourceUrl`.
- Caches the last good payload in `localStorage` to keep UI functional offline.
- All rendering occurs client-side; no visitor or event data is transmitted.

## Privacy statement
This integration guarantees that no visitor data leaves the browser. It does not read or emit cookies, does not collect identifiers, and sends no payloads other than a single credential-less `GET` to the configured status JSON endpoint. Cached data is limited to the status payload itself to preserve offline continuity.

## Version pinning
- Version: `1.0.0`
- SRI / checksum: see `checksums.txt` (SHA-384). Use the exact integrity string in your script tag to lock the asset.
- To verify locally: `openssl dgst -sha384 -binary proof-constellation.js | base64 -A`

## Optional panel
- Enabled by default; hide it with `panel: { enabled: false }`, via the built-in “Hide panel” toggle button, or programmatically with `client.disablePanel()`.
- Respects `position` for docking and `theme` for colors.
- Displays adoption, post-integration target, Edge Garden multiplier, predicted acceleration, and last update timestamp.

## Offline behavior
- On network failures it reverts to the cached payload (if present) and emits an `offline` event.
- Polling uses exponential backoff (capped) until the endpoint is reachable again; intervals return to the configured cadence once live.

## Deployment checklist
- Serve `proof-constellation.js` and your status JSON over HTTPS.
- Use the SRI string from `checksums.txt` and keep the filename pinned (no unversioned aliases).
- Validate the endpoint returns either the legacy status keys (`adoption_current`, `adoption_total`, `adoption_post_integration`, `edge_multiplier`, `predicted_acceleration`, `updated_at`) or the ecosystem feed keys (`connected_worlds`, `total_worlds`, `proof_constellation_specific.predicted_acceleration`, `proof_constellation_specific.connected_world_count_if_onboarded`, `growth_metrics.edge_garden.growth_multiplier`, `timestamp`). Additional keys are ignored safely.
- Confirm the panel shows “Live” after the first poll; if it shows “Offline cache,” the endpoint is unreachable.
