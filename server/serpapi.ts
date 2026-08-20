import type { ParsedMapsLink } from './maps-url.js'
import { getSerpapiKey } from './env.js'

const SERPAPI_URL = 'https://serpapi.com/search.json'

export type PlaceInfo = {
  title: string
  address?: string
  rating?: number
  reviewsCount?: number
  type?: string
  thumbnail?: string
  dataId?: string
  placeId?: string
  dataCid?: string
}

export type ReviewUser = {
  name: string
  thumbnail?: string
  link?: string
  localGuide?: boolean
  reviews?: number
}

export type Review = {
  id: string
  rating: number
  date?: string
  isoDate?: string
  snippet: string
  likes?: number
  link?: string
  source?: string
  images?: string[]
  user: ReviewUser
}

export type ReviewsPage = {
  place: PlaceInfo
  reviews: Review[]
  nextPageToken?: string
}

type SerpSearchParams = Record<string, string | undefined>

export async function resolveCampaign(parsed: ParsedMapsLink): Promise<ReviewsPage> {
  const identifiers = await resolveIdentifiers(parsed)
  const page = await fetchReviewsPage(identifiers)
  let title = preferTitle(page.place.title, parsed.placeName)
  let mapsPlace: PlaceInfo | undefined

  if (isUnknownTitle(title)) {
    mapsPlace = await lookupMapsPlaceName(identifiers, parsed)
    title = preferTitle(title, mapsPlace?.title, parsed.placeName)
  }

  return {
    ...page,
    place: {
      ...page.place,
      ...identifiers,
      title,
      address: page.place.address || mapsPlace?.address,
      rating: page.place.rating ?? mapsPlace?.rating,
      reviewsCount: page.place.reviewsCount ?? mapsPlace?.reviewsCount,
      type: page.place.type ?? mapsPlace?.type,
      thumbnail: page.place.thumbnail ?? mapsPlace?.thumbnail,
    },
  }
}

async function resolveIdentifiers(parsed: ParsedMapsLink): Promise<{
  dataId?: string
  placeId?: string
  dataCid?: string
}> {
  if (parsed.dataId || parsed.placeId) {
    return {
      dataId: parsed.dataId,
      placeId: parsed.placeId,
      dataCid: parsed.dataCid,
    }
  }

  if (parsed.dataCid) {
    const result = await serpapiSearch({
      engine: 'google_maps',
      data_cid: parsed.dataCid,
    })
    const place = mapMapsPlace(result, parsed)
    return { dataId: place.dataId, placeId: place.placeId, dataCid: place.dataCid }
  }

  if (parsed.placeName) {
    const result = await serpapiSearch({
      engine: 'google_maps',
      type: 'search',
      q: parsed.placeName,
      ll:
        parsed.lat != null && parsed.lng != null
          ? `@${parsed.lat},${parsed.lng},17z`
          : undefined,
    })
    const place = mapMapsPlace(result, parsed)
    return { dataId: place.dataId, placeId: place.placeId, dataCid: place.dataCid }
  }

  throw new Error('Could not find a Google Maps shop in this link.')
}

export async function fetchReviewsPage(input: {
  dataId?: string
  placeId?: string
  nextPageToken?: string
  sortBy?: string
  hl?: string
}): Promise<ReviewsPage> {
  if (!input.dataId && !input.placeId) {
    throw new Error('A data_id or place_id is required to fetch reviews.')
  }

  const result = await serpapiSearch({
    engine: 'google_maps_reviews',
    data_id: input.dataId,
    place_id: input.placeId,
    next_page_token: input.nextPageToken,
    sort_by: input.sortBy ?? 'newestFirst',
    hl: input.hl ?? 'en',
    num: input.nextPageToken ? '20' : undefined,
  })

  const placeInfo = (result.place_info ?? result.place ?? {}) as Record<string, unknown>
  const reviews = Array.isArray(result.reviews) ? result.reviews : []
  const pagination = (result.serpapi_pagination ?? {}) as Record<string, unknown>

  return {
    place: {
      title: stringValue(placeInfo.title) ?? stringValue(placeInfo.name) ?? '',
      address: stringValue(placeInfo.address),
      rating: numberValue(placeInfo.rating),
      reviewsCount: numberValue(placeInfo.reviews),
      type: stringValue(placeInfo.type),
      dataId: input.dataId,
      placeId: input.placeId,
    },
    reviews: reviews.map(mapReview),
    nextPageToken: stringValue(pagination.next_page_token),
  }
}

async function serpapiSearch(params: SerpSearchParams): Promise<Record<string, unknown>> {
  const apiKey = getSerpapiKey()
  if (!apiKey) {
    throw new Error('SERPAPI_KEY is not configured on the server.')
  }

  const search = new URLSearchParams()
  search.set('api_key', apiKey)
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value)
  }

  const response = await fetch(`${SERPAPI_URL}?${search.toString()}`, {
    signal: AbortSignal.timeout(45_000),
  })
  const json = (await response.json()) as Record<string, unknown>

  if (!response.ok || typeof json.error === 'string') {
    throw new Error(typeof json.error === 'string' ? json.error : 'SerpAPI request failed.')
  }

  return json
}

function mapMapsPlace(result: Record<string, unknown>, parsed: ParsedMapsLink): PlaceInfo {
  const placeResults = result.place_results as Record<string, unknown> | undefined
  const localResults = Array.isArray(result.local_results)
    ? (result.local_results as Record<string, unknown>[])
    : []
  const place = placeResults ?? localResults[0]

  if (!place) {
    throw new Error('SerpAPI did not return a matching shop for this campaign link.')
  }

  return {
    title: stringValue(place.title) ?? stringValue(place.name) ?? parsed.placeName ?? '',
    address: stringValue(place.address),
    rating: numberValue(place.rating),
    reviewsCount: numberValue(place.reviews),
    type: stringValue(place.type),
    thumbnail: stringValue(place.thumbnail),
    dataId: stringValue(place.data_id) ?? parsed.dataId,
    placeId: stringValue(place.place_id) ?? parsed.placeId,
    dataCid: stringValue(place.data_cid) ?? parsed.dataCid,
  }
}

function mapReview(raw: unknown): Review {
  const review = (raw ?? {}) as Record<string, unknown>
  const user = (review.user ?? {}) as Record<string, unknown>
  const snippet =
    stringValue(review.snippet) ??
    stringValue((review.extracted_snippet as Record<string, unknown> | undefined)?.original) ??
    ''

  return {
    id:
      stringValue(review.review_id) ??
      stringValue(review.link) ??
      `${stringValue(user.name) ?? 'reviewer'}-${stringValue(review.iso_date) ?? Math.random()}`,
    rating: numberValue(review.rating) ?? 0,
    date: stringValue(review.date),
    isoDate: stringValue(review.iso_date),
    snippet,
    likes: numberValue(review.likes),
    link: stringValue(review.link),
    source: stringValue(review.source),
    images: Array.isArray(review.images)
      ? review.images.filter((image): image is string => typeof image === 'string')
      : undefined,
    user: {
      name: stringValue(user.name) ?? 'Google user',
      thumbnail: stringValue(user.thumbnail),
      link: stringValue(user.link),
      localGuide: Boolean(user.local_guide),
      reviews: numberValue(user.reviews),
    },
  }
}

function preferTitle(...names: Array<string | undefined>): string {
  for (const name of names) {
    const trimmed = name?.trim()
    if (trimmed && !isUnknownTitle(trimmed)) return trimmed
  }
  return names.find((name) => name?.trim())?.trim() ?? 'Unknown place'
}

function isUnknownTitle(name?: string): boolean {
  return !name?.trim() || name.trim().toLowerCase() === 'unknown place'
}

async function lookupMapsPlaceName(
  identifiers: { dataId?: string; placeId?: string; dataCid?: string },
  parsed: ParsedMapsLink,
): Promise<PlaceInfo | undefined> {
  try {
    if (identifiers.placeId) {
      const result = await serpapiSearch({
        engine: 'google_maps',
        place_id: identifiers.placeId,
      })
      return mapMapsPlace(result, parsed)
    }

    if (identifiers.dataCid) {
      const result = await serpapiSearch({
        engine: 'google_maps',
        data_cid: identifiers.dataCid,
      })
      return mapMapsPlace(result, parsed)
    }
  } catch {
    return undefined
  }

  return undefined
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}
