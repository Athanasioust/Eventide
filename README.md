# Eventide

A personal Pokémon GO tracker: every current and upcoming event, raid bosses,
field research, egg pools, and Team GO Rocket lineups in one place. Plain
HTML/CSS/vanilla JS, no build step, installable as a PWA.

Live at: https://athanasioust.github.io/Eventide/

## Data source

All data comes from [leak-duck](https://github.com/zhenga8533/leak-duck), a
scraper that pulls LeekDuck.com hourly via GitHub Actions and publishes JSON
to its `data` branch. This app fetches those files directly in the browser
from `raw.githubusercontent.com` (which sends
`access-control-allow-origin: *`, so no backend/proxy is needed):

- `events.json` — category name → array of events
- `raid_bosses.json` — tier name → array of raid bosses
- `research_tasks.json` — task group → array of tasks + rewards
- `egg_pool.json` — egg group → array of hatchable Pokémon
- `rocket_lineups.json` — leader/grunt name → 3 lineup slots

Sprites and banners are loaded from `cdn.leekduck.com`. If a sprite URL
fails to load, the app falls back to a PokeAPI sprite (looked up by dex
number parsed from the leekduck URL), and finally to a plain text chip if
neither works — this matters for items and mega energy, which have no dex
number to fall back to.

This app does not modify or reinterpret the underlying game data — it only
renders what's in the JSON. It is not affiliated with Niantic, Scopely, The
Pokémon Company, or the leak-duck project.

## Time handling

Events carry an `is_local_time` flag:

- **`true`** — the timestamp is a wall-clock string (`"2026-09-29T10:00:00"`)
  meaning "this local hour wherever you are." Parsed by building a `Date`
  from its individual components, never by handing the string to `new
  Date(string)` (which some browsers interpret as UTC).
- **`false`** — the timestamp is Unix seconds representing one fixed instant
  worldwide, converted with `new Date(seconds * 1000)` and displayed in the
  visitor's own time zone.

The detail view always states which kind of time an event uses. Missing or
unparseable dates never crash the app — they render as "Date not announced"
and get bucketed under "Unscheduled."

## Features

- **Events** — ending-soon / live / upcoming (grouped by day) / recently
  ended (7 days, collapsed), with search, category filters, and a starred-
  only toggle (stars persist in `localStorage`).
- **Event detail** — bottom sheet on mobile, modal on desktop: banner,
  times with a time-zone explainer, live countdown, full description,
  bonuses, every populated details section (featured/spawns/raids/research/
  eggs/shadow/shiny), a link to the LeekDuck article, and an "Add to
  calendar" button that downloads a `.ics` file.
- **Raids** — bosses grouped by tier with CP and weather-boosted CP ranges.
- **Research** — tasks grouped by category with their rewards; searchable
  by task text or reward name.
- **Eggs** — Pokémon grouped by egg distance/group. `rarity_tier` from the
  source data is intentionally not shown or labeled — its meaning wasn't
  confirmed against LeekDuck, so this app doesn't guess.
- **Rocket** — every leader/grunt with their 3 lineup slots; encounter
  slots are marked "Catchable."
- Offline-friendly: the last successful fetch is cached in `localStorage`;
  if a refresh fails, the app shows that cached data with a visible
  "offline, showing data from …" notice instead of failing silently. Data
  refreshes automatically every 30 minutes while the page is open.
- Installable PWA (manifest + service worker) — the app shell is cached so
  it still opens offline, showing whatever data was last loaded.
- Light/dark mode follows the system setting; respects
  `prefers-reduced-motion`.

## Project structure

```
index.html
manifest.json
sw.js                   service worker (app-shell caching only)
css/styles.css
js/
  main.js                orchestration: tabs, refresh loop, ticker
  data.js                fetch + localStorage cache + event normalization
  time.js                date parsing, countdown/classification logic
  images.js              sprite resolution + fallback chain
  categoryColors.js      deterministic per-category color assignment
  text.js                description → HTML, search text normalization
  ics.js                 .ics calendar file generation
  stars.js               starred-events persistence
  ticker.js              1-second pub/sub used for live countdowns
  detail.js              event detail bottom sheet / modal
  tabs/{events,raids,research,eggs,rocket}.js
icons/                   generated PWA icons (source.svg is the original)
```

## Running locally

No build step — just serve the directory statically (ES modules need
`http://`, not `file://`):

```sh
python3 -m http.server 8000
# then open http://localhost:8000/
```

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. In the repo settings, go to **Pages** and set the source to the `main`
   branch, root folder (`/`).
3. The site will be available at `https://<your-username>.github.io/<repo>/`.

All asset references in this app use relative paths, so it works correctly
whether it's served from a domain root or a subpath like
`/Eventide/`.

## Regenerating the app icon

`icons/source.svg` is the master icon. Rasterized sizes were generated with:

```sh
rsvg-convert -w 192 -h 192 icons/source.svg -o icons/icon-192.png
rsvg-convert -w 512 -h 512 icons/source.svg -o icons/icon-512.png
rsvg-convert -w 180 -h 180 icons/source.svg -o icons/apple-touch-icon.png
rsvg-convert -w 32  -h 32  icons/source.svg -o icons/favicon-32.png
```

`icons/icon-maskable-512.png` is `icon-512.png` composited onto a full-bleed
background at ~72% scale, so it survives being cropped to a circle/squircle
on Android home screens.
