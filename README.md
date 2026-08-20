# GoogleMap Review

React app that collects Google Maps reviews for campaign shops. Paste Maps place links, scrape reviews through [SerpAPI](https://serpapi.com), and store everything in [Supabase](https://supabase.com).

## Setup

1. Copy `.env.example` to `.env` and set:

```bash
SERPAPI_KEY=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
```

2. Install dependencies:

```bash
npm install
```

3. Apply the database schema (once):

```bash
npx supabase db push --db-url "postgresql://postgres:[DB_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
```

4. Start locally:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Vite proxies `/api` to the Express process on port `8787`.

## Vercel

Local `.env` is not deployed. Add the same keys in **Vercel → Project → Settings → Environment Variables** for **Production** (and Preview if you use it), then **Redeploy**:

- `SERPAPI_KEY`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` (or `SUPABASE_ANON_KEY`)

The API is served from Vercel Functions in `api/` (`GET`/`POST`/`PATCH`/`DELETE` handlers). Scraped campaigns and reviews are upserted into Supabase on every page.

## Usage

1. Click **Add** and paste Google Maps shop URLs (one per line).
2. The scraper saves each shop and every review page to Supabase.
3. Reload the app on any device — the same data comes back from the database.

## Notes

- SerpAPI and Supabase keys stay on the server.
- Each reviews page uses one SerpAPI search credit.
- Do not commit `.env`.
