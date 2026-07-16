# Tennis Head-to-Head Dashboard

Interactive dashboard for comparing two tennis players across ranking, surface profile, current-year form, recent match history, head-to-head record, and an OpenAI-ready matchup read.

## Run

```bash
npm install
set RAPID_TENNIS_API_KEY=your_rapidapi_key_here
npm run build
npm run serve
```

Open `http://127.0.0.1:4173/`.

For frontend-only development:

```bash
npm run dev
```

## GitHub Pages

This repo includes `.github/workflows/pages.yml`, which builds the Vite frontend and deploys `dist` to GitHub Pages whenever `main` is pushed.

GitHub Pages is static hosting only. The hosted Pages version can render the dashboard and bundled sample data, but it cannot run `server.mjs`; Rapid Tennis API search/fetch, live scores, and OpenAI analysis need a separate backend host.

After pushing to GitHub, enable Pages in the repo settings with source set to **GitHub Actions**.

To connect a hosted backend to the Pages frontend:

1. Deploy this repo's `server.mjs` on a Node host.
2. Set backend environment variables:
   - `HOST=0.0.0.0`
   - `PORT` to the value provided by the host
   - `ALLOWED_ORIGIN=https://ginpks.github.io`
   - `RAPID_TENNIS_API_KEY`
   - optional `OPENAI_API_KEY`
3. In GitHub repo settings, add an Actions variable:
   - `VITE_API_BASE_URL=https://YOUR_BACKEND_HOST`
4. Re-run the Pages workflow.

Without `VITE_API_BASE_URL`, the Pages site falls back to bundled sample players and local analysis.

## OpenAI Analysis

The app works without an API key by using deterministic local analysis. To enable model-generated analysis from the server:

```bash
set OPENAI_API_KEY=your_key_here
npm run build
npm run serve
```

Optional:

```bash
set OPENAI_MODEL=gpt-5.5
set OPENAI_ENABLE_WEB_SEARCH=1
```

When `OPENAI_ENABLE_WEB_SEARCH=1`, the OpenAI analysis request may use hosted web search for public context facts such as college roster pages or player bios. Tennis statistics still come from Rapid Tennis API data normalized by the backend.

It may also verify public TennisStats player/H2H rows for percentiles, current-year set splits, recent form, and career match counts when Rapid does not expose those fields. Direct backend fetching from TennisStats is opt-in with `TENNISSTATS_ENABLE_FETCH=1` because the site may reject server-side requests.

For deeper career set-split and deciding-set streak analysis, the backend can fetch multiple Rapid match-history pages:

```bash
set RAPID_TENNIS_MATCH_PAGE_LIMIT=100
set RAPID_TENNIS_MATCH_MAX_PAGES=6
```

The default fetches up to 600 match rows per player and caches Rapid responses for 5 minutes.

## Data Sources

The current build includes a bundled sample dataset so the dashboard is usable offline. The backend uses Rapid Tennis API for typed player search, player statistics, match history, surface records, and live score context.

Planned live sources:

- Rapid Tennis API: player profiles, rankings, historical match logs, surface splits, season/career records, H2H-ready IDs, and live score context
- OpenAI Responses API: narrative analysis from already-fetched tennis facts

OpenAI should not be treated as the raw source of tennis stats. It is the analysis layer.

## API

- `GET /api/status` reports data mode, analysis mode, and provider readiness.
- `GET /api/search?q=PLAYER` searches Rapid Tennis API player names.
- `GET /api/player?name=PLAYER&tour=M|W` fetches and normalizes a Rapid Tennis API player profile.
- `GET /api/live-events` fetches current Rapid Tennis live matches.
- `GET /api/live-event?id=EVENT_ID` fetches Rapid Tennis live score detail for one match.
- `POST /api/analyze` accepts `{ first, second, headToHead, liveMatch }` and returns a punchy matchup read.

## Next Live-Data Step

The next upgrade is deeper Rapid API H2H integration: direct H2H fetches by Rapid player ID, event auto-matching, and point-by-point live hooks where the plan allows it.
