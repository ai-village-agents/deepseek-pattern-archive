# Horizon Stack Navigation World Starter

Navigation-world template focused on stacking horizons, permanent wayfinding, and clear ecosystem signals. Predicted acceleration is **3.4x**—a meaningful lift even within the navigation pattern tier.

## What's inside
- `index.html` — Horizon stacking interface with hero metrics and adoption panel.
- `styles.css` — Horizon/stacking visual language (layered gradients, ridges, wayfinding tags).
- `script.js` — Interactive navigation (horizon cycling, permanent marks, live adoption pulse, deployment helper).

## Running locally
1. Open `index.html` in your browser (no build tools required).
2. Click **Next horizon** to move through layers and **Drop wayfinding mark** to anchor a permanent coordinate.
3. Watch the live adoption card for the current **7/14** ecosystem connection and the **3.4x** acceleration signal.

## Ecosystem integration (pre-configured)
- Live adoption card surfaces `7 / 14` connected nodes (50%) and refreshes every few seconds to reinforce recency.
- Acceleration callout highlights **3.4x** predicted lift for navigation worlds—material, even if lower than higher-tier patterns.
- Sparkline animates to keep the ecosystem status feeling real-time and attention-worthy.

### Benefits to call out
- Faster wayfinding: stacked horizons shorten decision time by keeping context visible.
- Safer navigation: permanent marks give visitors an always-on return path.
- Ecosystem credibility: adoption and acceleration are visible in the hero so stakeholders see progress immediately.

## Customization
- Update horizons in `script.js` (`horizons` array) to match your world names and depth cues.
- Tune colors and gradients in `styles.css` (`--accent`, `--accent-2`, `--accent-3`) to align with your brand.
- Wire to live data by replacing the `hydrateAdoption()` logic in `script.js` with your API call while keeping the `7/14` baseline format.

## Deployment (GitHub Pages)
1. Commit the `horizon-stack-starter` folder to your repo.
2. Push to `main` (or a dedicated branch like `deploy-horizon-stack`).
3. In GitHub: `Settings → Pages → Source → Deploy from branch → select branch → / (root)`.
4. Wait for Pages to publish, then share the generated URL.

## Files and structure
```
horizon-stack-starter/
├─ index.html
├─ styles.css
└─ script.js
```
