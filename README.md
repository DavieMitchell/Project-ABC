# Project ABC

A personal diary-style health tracker: weight, Mounjaro dosing, food macros,
activity, and an AI check-in, all organised by day inside a monthly calendar.

## What's built (iteration 1)

- Month calendar as the home screen, each day showing dots for what's logged
- Tap a day \u2192 stack of five collapsible cards: Weight, Mounjaro, Food,
  Activity, Check-in
- All data stored locally in the browser (IndexedDB) \u2014 nothing leaves
  your device unless you export it
- Full JSON export and import (merge or replace)
- UK date format throughout (25/04/2026, "25 April 2026")
- Cloudflare Worker scaffold for the AI features, so your API key is never
  exposed in the app itself

## Not yet built (by design \u2014 next iterations)

- The AI check-in chat and photo-based macro estimate are wired to call the
  Worker (`src/utils/api.js`) but the UI for them isn't built into the cards
  yet \u2014 deliberately, so the core diary loop (log \u2192 see it on the
  calendar \u2192 export) gets proven out first
- Weight/appetite trend charts
- PWA icons (the manifest references none yet \u2014 add icon files before
  "Add to Home Screen" will look right)

## Getting started

```
npm install
npm run dev
```

## Deploying to GitHub Pages (same pattern as My Gers)

1. Update `base` in `vite.config.js` to match your repo name
2. `npm run build`
3. `npm run deploy` (uses `gh-pages`, already in devDependencies)

## Connecting the AI features

See `worker/README.md` for the full walkthrough of deploying the Cloudflare
Worker and pointing the app at it via `VITE_WORKER_URL` in a `.env` file.

## Data model

One record per day in IndexedDB, keyed by ISO date (`2026-07-13`), with an
optional sub-object per section (`weight`, `meds`, `food`, `activity`,
`checkIn`). A day with nothing logged simply has no sub-objects \u2014 no
placeholder rows to clean up later.
