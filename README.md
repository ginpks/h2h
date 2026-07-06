# Tennis Head-to-Head Dashboard

Interactive dashboard for comparing two tennis players across ranking, surface profile, current-year form, recent match history, head-to-head record, and an OpenAI-ready matchup read.

## Run

```bash
npm install
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

GitHub Pages is static hosting only. The hosted Pages version can render the dashboard and bundled sample data, but it cannot run `server.mjs`; live Tennis Abstract search/fetch and OpenAI analysis need a separate backend host.

After pushing to GitHub, enable Pages in the repo settings with source set to **GitHub Actions**.

To connect a hosted backend to the Pages frontend:

1. Deploy this repo's `server.mjs` on a Node host.
2. Set backend environment variables:
   - `HOST=0.0.0.0`
   - `PORT` to the value provided by the host
   - `ALLOWED_ORIGIN=https://ginpks.github.io`
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
```

## Data Sources

The current build includes a bundled sample dataset so the dashboard is usable offline. It also includes a live Tennis Abstract adapter for typed player search and player-profile fetching.

Planned live sources:

- ATP Tour: rankings, player metadata, official men's stats
- WTA Tour: rankings, player metadata, official women's stats and H2H
- Tennis Abstract: live player search, match logs, surface splits, season stats, career records, H2H history
- OpenAI Responses API: narrative analysis from already-fetched tennis facts

OpenAI should not be treated as the raw source of tennis stats. It is the analysis layer.

## API

- `GET /api/status` reports data mode, analysis mode, and provider readiness.
- `GET /api/search?q=PLAYER` searches Tennis Abstract player names.
- `GET /api/player?name=PLAYER&tour=M|W` fetches and normalizes a Tennis Abstract player profile.
- `POST /api/analyze` accepts `{ first, second, headToHead }` and returns structured matchup analysis.

## Next Live-Data Step

The next upgrade is deeper official-provider coverage: ATP/WTA direct ranking pages, richer official stat splits, and full historical H2H beyond the current fetched recent-results slice.
