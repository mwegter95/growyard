# Growyard — Yard Almanac

A multi-user yard maintenance tracker. Per-yard plant database with a month-by-month task calendar — prune, water, plant, mow. Check things off as you go.

The 4th app of [michaelwegter.com](https://michaelwegter.com/apps).

## Tech

- Vite + React 18 (SPA).
- Auth and persistence via [mw-backend](https://api.michaelwegter.com) (Flask + SQLite + JWT).
- Deployed to GitHub Pages at `https://mwegter95.github.io/growyard/`.

## Local development

```sh
npm install
npm run dev   # → http://localhost:5174
```

Talks to a local `mw-backend` on `http://localhost:5050` (see `.env.development`).

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds with
`VITE_BASE=/growyard/` and `VITE_API_URL=https://api.michaelwegter.com` and
publishes the result to GitHub Pages.
