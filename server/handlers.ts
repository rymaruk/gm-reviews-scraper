import { campaignIdentity } from '../src/lib/reviews.js'
import { placeNameFromMapsUrl, preferName } from '../src/lib/place.js'
import type { Campaign } from '../src/lib/types.js'
import {
  deleteCampaign,
  findExistingCampaign,
  getCampaign,
  listCampaigns,
  listReviews,
  upsertCampaign,
  upsertReviews,
} from './db.js'
import { hasPlaceIdentifier, parseAndExpandMapsUrl } from './maps-url.js'
import { fetchReviewsPage, resolveCampaign } from './serpapi.js'

export type ApiResult = { status: number; body: unknown }

export async function handleStore(): Promise<ApiResult> {
  try {
    const [campaigns, reviews] = await Promise.all([listCampaigns(), listReviews()])
    return { status: 200, body: { campaigns, reviews } }
  } catch (error) {
    return { status: 502, body: { error: toErrorMessage(error) } }
  }
}

export async function handleDeleteCampaign(id: string): Promise<ApiResult> {
  try {
    await deleteCampaign(id)
    return { status: 200, body: { ok: true } }
  } catch (error) {
    return { status: 502, body: { error: toErrorMessage(error) } }
  }
}

export async function handlePatchCampaign(id: string, body: unknown): Promise<ApiResult> {
  try {
    const existing = await getCampaign(id)
    if (!existing) {
      return { status: 404, body: { error: 'Campaign not found.' } }
    }

    const payload = asRecord(body)
    const scrapeStatus = optionalString(payload.scrapeStatus) as Campaign['scrapeStatus'] | undefined
    const scrapeError = optionalString(payload.scrapeError)
    const nextPageToken = optionalString(payload.nextPageToken)

    await upsertCampaign({
      ...existing,
      scrapeStatus: scrapeStatus ?? existing.scrapeStatus,
      scrapeError,
      nextPageToken: nextPageToken ?? existing.nextPageToken,
    })
    return { status: 200, body: { ok: true } }
  } catch (error) {
    return { status: 502, body: { error: toErrorMessage(error) } }
  }
}

export async function handleResolvePlace(body: unknown): Promise<ApiResult> {
  try {
    const payload = asRecord(body)
    const url = typeof payload.url === 'string' ? payload.url.trim() : ''
    if (!url) {
      return { status: 400, body: { error: 'Paste a Google Maps campaign link.' } }
    }

    const parsed = await parseAndExpandMapsUrl(url)
    if (!hasPlaceIdentifier(parsed)) {
      return {
        status: 400,
        body: {
          error:
            'Could not read a shop from that link. Open the place in Google Maps and copy the full URL.',
        },
      }
    }

    const page = await resolveCampaign(parsed)
    const id = campaignIdentity(page.place)
    const existing = await findExistingCampaign({
      id,
      address: page.place.address,
      mapsUrl: parsed.resolvedUrl || parsed.originalUrl,
      dataId: page.place.dataId,
      placeId: page.place.placeId,
    })

    if (existing) {
      return {
        status: 409,
        body: { error: 'This address has already been scraped.' },
      }
    }

    const title = preferName(
      page.place.title,
      placeNameFromMapsUrl(parsed.resolvedUrl),
      placeNameFromMapsUrl(parsed.originalUrl),
    )

    const campaign: Campaign = {
      id,
      mapsUrl: parsed.resolvedUrl || parsed.originalUrl,
      title,
      address: page.place.address,
      rating: page.place.rating,
      reviewsCount: page.place.reviewsCount,
      type: page.place.type,
      thumbnail: page.place.thumbnail,
      dataId: page.place.dataId,
      placeId: page.place.placeId,
      createdAt: new Date().toISOString(),
      lastScrapedAt: new Date().toISOString(),
      scrapeStatus: page.nextPageToken ? 'scraping' : 'done',
      nextPageToken: page.nextPageToken,
    }

    await upsertCampaign(campaign)
    await upsertReviews(page.reviews.map((review) => ({ ...review, campaignId: id })))

    return {
      status: 200,
      body: {
        url: parsed.originalUrl,
        resolvedUrl: parsed.resolvedUrl,
        place: page.place,
        reviews: page.reviews,
        nextPageToken: page.nextPageToken,
        campaign,
      },
    }
  } catch (error) {
    return { status: 502, body: { error: toErrorMessage(error) } }
  }
}

export async function handleReviews(body: unknown): Promise<ApiResult> {
  try {
    const payload = asRecord(body)
    const campaignId = optionalString(payload.campaignId)
    const dataId = optionalString(payload.dataId)
    const placeId = optionalString(payload.placeId)
    const nextPageToken = optionalString(payload.nextPageToken)
    const sortBy = optionalString(payload.sortBy)
    const hl = optionalString(payload.hl)
    const scrapeStatus = optionalString(payload.scrapeStatus) as Campaign['scrapeStatus'] | undefined

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

    return { status: 200, body: page }
  } catch (error) {
    return { status: 502, body: { error: toErrorMessage(error) } }
  }
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return {}
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected server error.'
}
