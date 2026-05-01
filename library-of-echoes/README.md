# Library of Echoes — Starter Template

Archive-world starter focused on echoes and reflections, inspired by Liminal Archive. Includes echoing chambers, fog-of-war exploration, permanent marks, and a pre-configured ecosystem pulse showing current 7/14 adoption and a projected 5.7× acceleration.

## What's inside
- `index.html` — Main interface with echoing chambers, fog-of-war map, and ecosystem pulse.
- `styles.css` — Echo/reflection visual system with glass gradients and atmospheric glows.
- `echoes.js` — Interactive behavior for echoes, fog reveal, local persistence, and live adoption pulse.

## Key behaviors
- **Echo chambers reflect visitor input**: Messages are mirrored and layered to create reflections, then injected into the chosen chamber.
- **Permanent marks**: Echoes are stored locally (via `localStorage`) to simulate durable archive traces.
- **Fog-of-war exploration**: A grid of hidden zones that reveal as you hover or click, mirroring Liminal Archive discovery patterns.
- **Ecosystem integration pulse**: Displays live adoption (7/14) with a subtle pulse and the projected 5.7× acceleration lifted from the Liminal Archive trajectory.

## Quick start
1. Open `library-of-echoes/index.html` directly in a browser, or run any static server in this folder (e.g., `python -m http.server 8080`).
2. Type a message, pick a chamber, choose a resonance depth, and click **Release echo**. Your reflection renders in the chamber and is added to Permanent Marks.
3. Move across the fog-of-war grid to reveal nodes. Each reveal animates the map and hints at deeper exploration paths.
4. Watch the adoption pulse in the hero and integration panel for real-time 7/14 status and 5.7× projection.

## Customizing
- **Chambers and seeds**: Edit the `chambers` array near the top of `echoes.js` to change names, motifs, and starter echoes.
- **Echo styling**: Adjust gradient colors, blur, and card styles in `styles.css` to fit your brand while keeping the reflection motif.
- **Fog grid labels**: Update the `fogCells` array in `echoes.js` to rename or resize exploration zones.
- **Permanent storage**: Local persistence uses `localStorage` with the key `library-of-echoes:marks`; swap for a backend API when you are ready to network it.

## Deployment (GitHub Pages)
1. Create a repository and add the `library-of-echoes` folder contents to the repo root.
2. Commit and push to GitHub.
3. In **Settings → Pages**, choose source **Deploy from a branch** and select your default branch (`main`), folder `/` (or `docs/` if you move the files there).
4. Save. GitHub Pages will publish a URL like `https://<user>.github.io/<repo>/`. Visit it to confirm the echo interactions and ecosystem pulse.

## Ecosystem benefits
- **Shared resonance layer**: Partners can mirror and reflect signals without changing upstream schemas, reducing integration friction.
- **Longitudinal insight**: Permanent marks provide a trail of reflections useful for drift and sentiment analysis.
- **Progressive reveal UX**: Fog-of-war onboarding lets visitors learn the world gradually, lowering overwhelm while keeping intrigue.
- **Live readiness signal**: The 7/14 adoption pulse (with the 5.7× projection) sets a clear growth target and shows partners where expansion is needed.

## Next steps
- Wire the adoption pulse to your real metrics endpoint when available.
- Connect local persistence to a backend or durable store to make echoes globally visible.
- Add audio or spatialized sound cues for deeper immersion, keeping latency budgets in mind.
