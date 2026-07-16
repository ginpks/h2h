# Tennis Head-to-Head Dashboard

Interactive dashboard for comparing two tennis players across ranking, surface profile, current-year form, recent match history, head-to-head record, and an OpenAI-ready matchup read.

## Run

```bash
npm install
set RAPID_TENNIS_API_KEY=your_rapidapi_key_here
npm run build
npm start
```

Open `http://127.0.0.1:4173/`.

For frontend-only development:

```bash
npm run dev
```

## Render

This app is intended to run as one Render web service. The Node server builds and serves the Vite frontend from `dist`, and the browser calls the same origin for `/api/*`.

The repo includes `render.yaml` for Blueprint deploys. In Render:

1. Create a new Blueprint from this repository.
2. Confirm the web service settings:
   - Build command: `npm ci && npm run build`
   - Start command: `npm run serve`
   - Runtime: Node
3. Add secret environment variables in Render:
   - `RAPID_TENNIS_API_KEY`
   - optional `OPENAI_API_KEY`
4. Deploy the Blueprint.

The service binds to Render with `HOST=0.0.0.0`. Render provides `PORT`, so do not hard-code a port in the dashboard.

GitHub Pages deployment has been removed. The frontend no longer needs `VITE_API_BASE_URL` on Render because the API and frontend are served from the same origin.

## OpenAI Analysis

The app works without an API key by using deterministic local analysis. To enable model-generated analysis from the server:

```bash
set OPENAI_API_KEY=your_key_here
npm run build
npm start
```

Optional:

```bash
set OPENAI_MODEL=gpt-5-mini
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

If RapidAPI returns a quota or rate-limit response, backend player search falls through to public search sources instead of failing the request. Wikidata and the bundled demo roster are enabled by default; TennisStats search can be opted in with:

```bash
set TENNISSTATS_ENABLE_SEARCH=1
```

Set `SEARCH_FALLBACK_ENABLE=0` to disable non-Rapid search fallbacks.

## Data Sources

The current build includes a bundled sample dataset so the dashboard is usable offline. The backend uses Rapid Tennis API for player statistics, match history, surface records, and live score context. Player search uses Rapid first, then public fallbacks when Rapid quota is exhausted or unavailable.

Planned live sources:

- Rapid Tennis API: player profiles, rankings, historical match logs, surface splits, season/career records, H2H-ready IDs, and live score context
- OpenAI Responses API: narrative analysis from already-fetched tennis facts

OpenAI should not be treated as the raw source of tennis stats. It is the analysis layer.

## API

- `GET /api/status` reports data mode, analysis mode, and provider readiness.
- `GET /api/search?q=PLAYER` searches Rapid Tennis API player names, then fallback public sources if Rapid is unavailable.
- `GET /api/player?name=PLAYER&tour=M|W` fetches and normalizes a Rapid Tennis API player profile. If Rapid quota is exhausted, it returns a sparse public-source fallback profile.
- `GET /api/live-events` fetches current Rapid Tennis live matches.
- `GET /api/live-event?id=EVENT_ID` fetches Rapid Tennis live score detail for one match.
- `POST /api/analyze` accepts `{ first, second, headToHead, liveMatch }` and returns a punchy matchup read.

## Next Live-Data Step

The next upgrade is deeper Rapid API H2H integration: direct H2H fetches by Rapid player ID, event auto-matching, and point-by-point live hooks where the plan allows it.
