import type { Campaign, PlaceInfo, Review, ReviewsPage, StoredReview } from '@/lib/types'

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string }
  if (!response.ok) {
    throw new Error(data.error ?? 'Request failed.')
  }
  return data
}

export async function getHealth(): Promise<{
  ok: boolean
  configured: boolean
  supabase: boolean
  missing?: string[]
}> {
  const response = await fetch('/api/health')
  return parseJson(response)
}

export async function fetchStore(): Promise<{ campaigns: Campaign[]; reviews: StoredReview[] }> {
  const response = await fetch('/api/store')
  return parseJson(response)
}

export async function resolvePlace(url: string): Promise<{
  url: string
  resolvedUrl: string
  place: PlaceInfo
  reviews: Review[]
  nextPageToken?: string
  campaign: Campaign
}> {
  const response = await fetch('/api/places/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  return parseJson(response)
}

export async function fetchReviewsPage(input: {
  campaignId?: string
  dataId?: string
  placeId?: string
  nextPageToken?: string
  sortBy?: string
  scrapeStatus?: Campaign['scrapeStatus']
}): Promise<ReviewsPage> {
  const response = await fetch('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson(response)
}

export async function deleteCampaign(id: string): Promise<void> {
  const response = await fetch(`/api/campaigns/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  await parseJson(response)
}

export async function patchCampaign(
  id: string,
  patch: {
    scrapeStatus?: Campaign['scrapeStatus']
    scrapeError?: string
    nextPageToken?: string
  },
): Promise<void> {
  const response = await fetch(`/api/campaigns/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  await parseJson(response)
}
