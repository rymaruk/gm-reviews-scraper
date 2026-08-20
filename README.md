# Maps Campaign Reviews

React app that collects Google Maps reviews for campaign shops. Paste one or more Maps place links, scrape every available review through [SerpAPI](https://serpapi.com), and group or filter them by campaign.

## Setup

1. Copy `.env.example` to `.env` and set `SERPAPI_KEY`.
2. Install dependencies:

```bash
npm install
```

3. Start the API and Vite app together:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The Vite dev server proxies `/api` to the Express process on port `8787`.

## Usage

1. Click **Add** and paste Google Maps shop URLs (one per line). Short `maps.app.goo.gl` links work.
2. The scraper resolves each marker, then pages through SerpAPI until reviews run out (capped at 25 pages per shop to protect API quota).
3. Use **All campaigns** to see every review grouped by shop, or filter to a single campaign.
4. Search, rating, and sort apply across the current view. **Export CSV** downloads the filtered list.

Campaigns and scraped reviews are stored in the browser (`localStorage`). Re-scrape a shop any time to refresh.

## Notes

- The SerpAPI key stays on the server. It is never sent to the browser.
- Each reviews page uses one SerpAPI search credit. Shops with thousands of reviews will consume more credits.
- Do not commit `.env`.
