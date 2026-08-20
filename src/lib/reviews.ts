import { campaignDisplayName } from './place.js'
import type { Campaign, RatingFilter, SortOption, StoredReview, TimeRange } from './types.js'

export function mergeReviews(existing: StoredReview[], incoming: StoredReview[]): StoredReview[] {
  const byId = new Map(existing.map((review) => [reviewKey(review), review]))
  for (const review of incoming) {
    byId.set(reviewKey(review), review)
  }
  return [...byId.values()]
}

export function reviewKey(review: StoredReview): string {
  return `${review.campaignId}:${review.id}`
}

export function filterReviews(
  reviews: StoredReview[],
  campaigns: Campaign[],
  filters: {
    query: string
    rating: RatingFilter
    sort: SortOption
    timeRange: TimeRange
    fromDate?: string
    toDate?: string
  },
): StoredReview[] {
  const query = filters.query.trim().toLowerCase()
  const campaignIds = new Set(campaigns.map((campaign) => campaign.id))
  const bounds = timeRangeBounds(filters.timeRange, filters.fromDate, filters.toDate)

  const filtered = reviews.filter((review) => {
    if (!campaignIds.has(review.campaignId)) return false
    if (filters.rating !== 'all' && reviewStarCount(review.rating) !== Number(filters.rating)) {
      return false
    }
    if (!inTimeRange(review, bounds)) return false
    if (!query) return true

    const haystack = `${review.snippet} ${review.user.name}`.toLowerCase()
    return haystack.includes(query)
  })

  return filtered.sort((a, b) => compareReviews(a, b, filters.sort))
}

export function groupReviewsByCompany(
  campaigns: Campaign[],
  reviews: StoredReview[],
): Array<{ campaign: Campaign; reviews: StoredReview[] }> {
  const reviewsByCampaign = new Map<string, StoredReview[]>()
  for (const review of reviews) {
    const list = reviewsByCampaign.get(review.campaignId) ?? []
    list.push(review)
    reviewsByCampaign.set(review.campaignId, list)
  }

  return campaigns.map((campaign) => ({
    campaign,
    reviews: reviewsByCampaign.get(campaign.id) ?? [],
  }))
}

export function groupReviewsByDay(
  reviews: StoredReview[],
  sort: SortOption = 'newest',
): Array<{ key: string; label: string; reviews: StoredReview[] }> {
  const groups = new Map<string, StoredReview[]>()

  for (const review of reviews) {
    const key = review.isoDate?.slice(0, 10) ?? 'unknown'
    const list = groups.get(key) ?? []
    list.push(review)
    groups.set(key, list)
  }

  const newestFirst = sort !== 'oldest'

  return [...groups.entries()]
    .sort((left, right) => {
      if (left[0] === 'unknown') return 1
      if (right[0] === 'unknown') return -1
      return newestFirst ? right[0].localeCompare(left[0]) : left[0].localeCompare(right[0])
    })
    .map(([key, dayReviews]) => ({
      key,
      label: key === 'unknown' ? 'Unknown date' : formatDayLabel(key),
      reviews: dayReviews,
    }))
}

export function timeRangeBounds(
  range: TimeRange,
  fromDate?: string,
  toDate?: string,
): { from?: number; to?: number } {
  if (range === 'all') return {}
  if (range === 'custom') {
    return {
      from: fromDate ? Date.parse(`${fromDate}T00:00:00`) : undefined,
      to: toDate ? Date.parse(`${toDate}T23:59:59.999`) : undefined,
    }
  }

  const days = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }[range]
  return { from: Date.now() - days * 24 * 60 * 60 * 1000, to: Date.now() }
}

function compareReviews(a: StoredReview, b: StoredReview, sort: SortOption): number {
  const aTime = a.isoDate ? Date.parse(a.isoDate) : 0
  const bTime = b.isoDate ? Date.parse(b.isoDate) : 0
  return sort === 'oldest' ? aTime - bTime : bTime - aTime
}

export function reviewStarCount(rating: number): number {
  if (!Number.isFinite(rating) || rating <= 0) return 0
  return Math.min(5, Math.max(1, Math.round(rating)))
}

export function reviewsToCsv(reviews: StoredReview[], campaigns: Campaign[]): string {
  const campaignById = new Map(campaigns.map((campaign) => [campaign.id, campaign]))
  const header = [
    'campaign',
    'reviewer',
    'rating',
    'date',
    'review',
    'likes',
    'source',
    'review_url',
  ]

  const rows = reviews.map((review) => {
    const campaign = campaignById.get(review.campaignId)
    return [
      campaign ? campaignDisplayName(campaign) : review.campaignId,
      review.user.name,
      review.rating,
      review.isoDate ?? review.date ?? '',
      review.snippet,
      review.likes ?? 0,
      review.source ?? '',
      review.link ?? '',
    ]
      .map(csvCell)
      .join(',')
  })

  return [header.join(','), ...rows].join('\n')
}

function csvCell(value: string | number): string {
  const text = String(value).replaceAll('"', '""')
  return `"${text}"`
}

function inTimeRange(review: StoredReview, bounds: { from?: number; to?: number }): boolean {
  if (bounds.from == null && bounds.to == null) return true
  const time = review.isoDate ? Date.parse(review.isoDate) : Number.NaN
  if (!Number.isFinite(time)) return false
  if (bounds.from != null && time < bounds.from) return false
  if (bounds.to != null && time > bounds.to) return false
  return true
}

function formatDayLabel(isoDay: string): string {
  const date = new Date(`${isoDay}T00:00:00`)
  if (Number.isNaN(date.getTime())) return isoDay
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function campaignIdentity(place: { dataId?: string; placeId?: string; dataCid?: string }): string {
  return place.dataId ?? place.placeId ?? place.dataCid ?? crypto.randomUUID()
}
