import type { PlaceInfo, Review, ReviewsPage } from '@/lib/types'

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string }
  if (!response.ok) {
    throw new Error(data.error ?? 'Request failed.')
  }
  return data
}

export async function getHealth(): Promise<{ ok: boolean; configured: boolean }> {
  const response = await fetch('/api/health')
  return parseJson(response)
}

export async function resolvePlace(url: string): Promise<{
  url: string
  resolvedUrl: string
  place: PlaceInfo
  reviews: Review[]
  nextPageToken?: string
}> {
  const response = await fetch('/api/places/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  return parseJson(response)
}

export async function fetchReviewsPage(input: {
  dataId?: string
  placeId?: string
  nextPageToken?: string
  sortBy?: string
}): Promise<ReviewsPage> {
  const response = await fetch('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson(response)
}
