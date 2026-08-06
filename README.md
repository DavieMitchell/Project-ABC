# Project ABC

A single-purpose food diary: log meals by photo or text, get AI-estimated
macros back, see accumulated totals per day, and pull reports over any date
range. Everything else (weight, meds, activity, mood) has been deliberately
cut — those live in other apps now (Shotsy, Nike Run/Hal). This app does one
thing.    

## What's built

- Month calendar as the home screen, with a dot on any day that has food logged
- Tap a day → the Food card, with **← ›** date arrows to move a day
  at a time without going back to the calendar
- Four meal sections (Breakfast, Lunch, Dinner, Snacks), each with **+ Add food**
- Adding food: take a photo or type a description → sent to Claude (via
  your own Cloudflare Worker) → returns calories, protein, carbs, fat,
  sugar, saturated fat, and fibre
- An accumulated macro summary at the top of the day (calories/fat/carbs/protein),
  tap to expand the full nutrient breakdown
- **Report** page: pick a date range, see daily bar charts with a trend line
  for each macro, plus period averages, and share/export the whole thing as a PDF
- **Data** page: export a full JSON backup (re-importable), or a flat CSV of
  every food entry logged (opens straight into Excel)
- All data stored locally in the browser (IndexedDB) — nothing leaves
  your device except what you explicitly export, or send to Claude for a
  macro estimate
- UK date format throughout, dark Spotify-inspired theme, proper PWA setup
  (home-screen icon, standalone launch, safe-area aware header)

## Getting started

```
npm install
npm run dev
```

## Deploying to GitHub Pages

1. `base` in `vite.config.js` is already set to `/Project-ABC/` — update
   it if you ever rename the repo
2. Push to `main` — the GitHub Action in `.github/workflows/deploy.yml`
   builds and publishes automatically
3. Live at `https://daviemitchell.github.io/Project-ABC/`

## Connecting the AI food-logging

The app calls your own Cloudflare Worker, which calls Claude with your API
key — the key never touches the phone. See `worker/README.md` for the
full deploy walkthrough. Until the Worker is deployed and `VITE_WORKER_URL`
is set, tapping "Send" on a food entry will show an error explaining that.

## Data model

One record per day in IndexedDB, keyed by ISO date (`2026-07-13`), with a
single `food` section: `{ entries: { breakfast: [...], lunch: [...],
dinner: [...], snacks: [...] } }`. Each entry is `{ id, name, calories,
protein, carbs, fat, sugar, saturatedFat, fiber, note }`. Daily and
period totals are always computed from these entries, never stored
separately — so there's nothing to keep in sync.
