import cors from 'cors'
import express from 'express'
import { campaignIdentity } from '../src/lib/reviews.ts'
import { placeNameFromMapsUrl, preferName } from '../src/lib/place.ts'
import type { Campaign } from '../src/lib/types.ts'
import {
  deleteCampaign,
  getCampaign,
  listCampaigns,
  listReviews,
  upsertCampaign,
  upsertReviews,
} from './db.ts'
import { hasPlaceIdentifier, parseAndExpandMapsUrl } from './maps-url.ts'
import { fetchReviewsPage, resolveCampaign } from './serpapi.ts'
import { healthPayload } from './env.ts'

export const app = express()

app.use(cors())
app.use(express.json({ limit: '1mb' }))

const router = express.Router()

router.get('/health', (_req, res) => {
  res.json(healthPayload())
})

router.get('/store', async (_req, res) => {
  try {
    const [campaigns, reviews] = await Promise.all([listCampaigns(), listReviews()])
    res.json({ campaigns, reviews })
  } catch (error) {
    res.status(502).json({ error: toErrorMessage(error) })
  }
})

router.delete('/campaigns/:id', async (req, res) => {
  try {
    await deleteCampaign(req.params.id)
    res.json({ ok: true })
  } catch (error) {
    res.status(502).json({ error: toErrorMessage(error) })
  }
})

router.patch('/campaigns/:id', async (req, res) => {
  try {
    const existing = await getCampaign(req.params.id)
    if (!existing) {
      res.status(404).json({ error: 'Campaign not found.' })
      return
    }

    const scrapeStatus = optionalString(req.body?.scrapeStatus) as Campaign['scrapeStatus'] | undefined
    const scrapeError = optionalString(req.body?.scrapeError)
    const nextPageToken = optionalString(req.body?.nextPageToken)

    await upsertCampaign({
      ...existing,
      scrapeStatus: scrapeStatus ?? existing.scrapeStatus,
      scrapeError,
      nextPageToken: nextPageToken ?? existing.nextPageToken,
    })
    res.json({ ok: true })
  } catch (error) {
    res.status(502).json({ error: toErrorMessage(error) })
  }
})

router.post('/places/resolve', async (req, res) => {
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
    const id = campaignIdentity(page.place)
    const existing = await getCampaign(id)
    const title = preferName(
      page.place.title,
      existing?.title,
      placeNameFromMapsUrl(parsed.resolvedUrl),
      placeNameFromMapsUrl(parsed.originalUrl),
    )

    const campaign: Campaign = {
      id,
      mapsUrl: parsed.resolvedUrl || parsed.originalUrl,
      title,
      address: page.place.address || existing?.address,
      rating: page.place.rating ?? existing?.rating,
      reviewsCount: page.place.reviewsCount ?? existing?.reviewsCount,
      type: page.place.type ?? existing?.type,
      thumbnail: page.place.thumbnail ?? existing?.thumbnail,
      dataId: page.place.dataId ?? existing?.dataId,
      placeId: page.place.placeId ?? existing?.placeId,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      lastScrapedAt: new Date().toISOString(),
      scrapeStatus: page.nextPageToken ? 'scraping' : 'done',
      nextPageToken: page.nextPageToken,
    }

    await upsertCampaign(campaign)
    await upsertReviews(page.reviews.map((review) => ({ ...review, campaignId: id })))

    res.json({
      url: parsed.originalUrl,
      resolvedUrl: parsed.resolvedUrl,
      place: page.place,
      reviews: page.reviews,
      nextPageToken: page.nextPageToken,
      campaign,
    })
  } catch (error) {
    res.status(502).json({ error: toErrorMessage(error) })
  }
})

router.post('/reviews', async (req, res) => {
  try {
    const campaignId = optionalString(req.body?.campaignId)
    const dataId = optionalString(req.body?.dataId)
    const placeId = optionalString(req.body?.placeId)
    const nextPageToken = optionalString(req.body?.nextPageToken)
    const sortBy = optionalString(req.body?.sortBy)
    const hl = optionalString(req.body?.hl)
    const scrapeStatus = optionalString(req.body?.scrapeStatus) as Campaign['scrapeStatus'] | undefined

    const page = await fetchReviewsPage({
      dataId,
      placeId,
      nextPageToken,
      sortBy,
      hl,
    })

    if (campaignId) {
      const existing = await getCampaign(campaignId)
      const campaign: Campaign = {
        id: campaignId,
        mapsUrl: existing?.mapsUrl ?? '',
        title: preferName(page.place.title, existing?.title),
        address: page.place.address || existing?.address,
        rating: page.place.rating ?? existing?.rating,
        reviewsCount: page.place.reviewsCount ?? existing?.reviewsCount,
        type: page.place.type ?? existing?.type,
        thumbnail: page.place.thumbnail ?? existing?.thumbnail,
        dataId: page.place.dataId ?? existing?.dataId ?? dataId,
        placeId: page.place.placeId ?? existing?.placeId ?? placeId,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        lastScrapedAt: new Date().toISOString(),
        scrapeStatus: scrapeStatus ?? (page.nextPageToken ? 'scraping' : 'done'),
        nextPageToken: page.nextPageToken,
      }

      await upsertCampaign(campaign)
      await upsertReviews(page.reviews.map((review) => ({ ...review, campaignId })))
    }

    res.json(page)
  } catch (error) {
    res.status(502).json({ error: toErrorMessage(error) })
  }
})

app.use('/api', router)
app.use('/', router)

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected server error.'
}
