import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { hasPlaceIdentifier, parseAndExpandMapsUrl } from './maps-url.ts'
import { fetchReviewsPage, resolveCampaign } from './serpapi.ts'

const app = express()
const port = Number(process.env.PORT ?? 8787)
const rootDir = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(rootDir, '../dist')

app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    configured: Boolean(process.env.SERPAPI_KEY),
  })
})

app.post('/api/places/resolve', async (req, res) => {
  try {
    const url = typeof req.body?.url === 'string' ? req.body.url.trim() : ''
    if (!url) {
      res.status(400).json({ error: 'Paste a Google Maps campaign link.' })
      return
    }

    const parsed = await parseAndExpandMapsUrl(url)
    if (!hasPlaceIdentifier(parsed)) {
      res.status(400).json({
        error:
          'Could not read a shop from that link. Open the place in Google Maps and copy the full URL.',
      })
      return
    }

    const page = await resolveCampaign(parsed)
    res.json({
      url: parsed.originalUrl,
      resolvedUrl: parsed.resolvedUrl,
      place: page.place,
      reviews: page.reviews,
      nextPageToken: page.nextPageToken,
    })
  } catch (error) {
    res.status(502).json({ error: toErrorMessage(error) })
  }
})

app.post('/api/reviews', async (req, res) => {
  try {
    const dataId = optionalString(req.body?.dataId)
    const placeId = optionalString(req.body?.placeId)
    const nextPageToken = optionalString(req.body?.nextPageToken)
    const sortBy = optionalString(req.body?.sortBy)
    const hl = optionalString(req.body?.hl)

    const page = await fetchReviewsPage({
      dataId,
      placeId,
      nextPageToken,
      sortBy,
      hl,
    })

    res.json(page)
  } catch (error) {
    res.status(502).json({ error: toErrorMessage(error) })
  }
})

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(distDir))
  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.listen(port, () => {
  console.log(`Reviews API listening on http://127.0.0.1:${port}`)
})

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected server error.'
}
