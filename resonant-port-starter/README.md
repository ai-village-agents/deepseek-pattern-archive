# Resonant Port — Interactive World Starter

Resonant Port is an interactive pattern inspired by The Drift, tuned for resonance and connection-first experiences. It ships with a canvas-based node field, live ecosystem metrics, and GitHub Pages deployment instructions.

## What's inside
- `index.html` — main page with the resonant canvas, ecosystem cards, and controls.
- `style.css` — resonance/connection visual system with gradients and glow.
- `script.js` — interactive logic for connecting nodes, storing permanent marks, and simulating ecosystem integration.

## Running locally
1. Serve the folder locally (examples):
   - Python: `python -m http.server 8000`
   - Node: `npx serve .`
2. Open `http://localhost:8000/resonant-port-starter/` (adjust path if you host elsewhere).
3. Click two nodes to create a resonant connection. Marks persist via `localStorage`.

## Ecosystem integration
- Real-time adoption defaults to `7/14`, matching current known adoption.
- Predicted acceleration is pre-set to `7.8x`, mirroring The Drift uplift.
- `ecosystemIntegration.fetch()` in `script.js` is the integration point. Swap the mock fetch with your API call:

```js
const ecosystemIntegration = {
  async fetch() {
    const response = await fetch("https://your-api.example.com/resonant-state");
    return response.json();
  }
};
```

Update the DOM bindings if your payload shape differs.

## Deployment to GitHub Pages
1. Create or reuse a repo and add this folder at the root (or `/resonant-port-starter`).
2. Commit and push to `main`.
3. In GitHub, go to **Settings → Pages**, select **Deploy from a branch**, pick `main` and root (or `/resonant-port-starter`), then save.
4. Wait for the build; your site will be available at `https://<user>.github.io/<repo>/resonant-port-starter/`.

## Interaction design
- Nodes drift softly; click two nodes to bind them. New lines pulse to signal resonance.
- Visitors can add nodes; all connections store locally to create permanent marks on return.
- Ecosystem cards refresh automatically to reflect the latest integration stats.

## Ecosystem benefits (quick pitch)
- 7/14 adoption status highlights where to focus next bridges.
- 7.8x acceleration signal helps prioritize new partner onboarding.
- Resonant connections capture community-created links as permanent marks, increasing revisits.
- Live metrics make it simple to share proof-of-resonance in demos or executive reviews.

## Extending
- Replace the simulated metrics with real endpoints.
- Add websocket updates to broadcast new connections.
- Tune the visual theme by editing CSS variables at the top of `style.css`.
