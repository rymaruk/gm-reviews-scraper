# GoogleMap Review

Next.js app that collects Google Maps reviews for campaign shops. Paste Maps place links, scrape reviews through [SerpAPI](https://serpapi.com), and store everything in [Supabase](https://supabase.com).

## Setup

1. Copy `.env.example` to `.env.local` and set:

```bash
SERPAPI_KEY=
SERPAPI_KEY_RESERV=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
```

2. Install dependencies:

```bash
npm install
```

3. Apply the database schema (once). Run the same command again after pulling new migrations so `campaigns.weight` exists for the Metrics page:

```bash
npx supabase db push --db-url "postgresql://postgres:[DB_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
```

4. Start locally:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The App Router serves both the UI and `/api/*` route handlers.

## Vercel

This is a Next.js app (`vercel.json` sets `"framework": "nextjs"`). If Project Settings still use the old Vite values, they override the repo file — update **Vercel → Project → Settings → Build & Development Settings**:

- **Framework Preset** = Next.js
- **Output Directory** = empty (clear `dist`; Next.js does not use `dist`)

Then save and **Redeploy**.

Local `.env.local` is not deployed. Add the same keys in **Vercel → Project → Settings → Environment Variables** for **Production** (and Preview if you use it), then **Redeploy**:

- `SERPAPI_KEY`
- `SERPAPI_KEY_RESERV` (optional backup; used if the main key gets an error)
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` (or `SUPABASE_ANON_KEY`)

The API lives in Next.js Route Handlers under `src/app/api/`. Scraped campaigns and reviews are upserted into Supabase on every page.

## Usage

1. Click **Add** and paste Google Maps shop URLs (one per line).
2. The scraper saves each shop and every review page to Supabase.
3. Reload the app on any device — the same data comes back from the database.
4. Open **Metrics** (`/metrics`) to edit each shop’s weight. Values must be 0 or greater and add up to 100% before they can be saved.

## Notes

- SerpAPI and Supabase keys stay on the server.
- `SERPAPI_KEY` is used first. If SerpAPI returns an error, the same request is retried with `SERPAPI_KEY_RESERV`.
- Each reviews page uses one SerpAPI search credit.
- Do not commit `.env` or `.env.local`.
