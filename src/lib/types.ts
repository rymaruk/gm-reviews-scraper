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

export type Campaign = {
  id: string
  mapsUrl: string
  title: string
  address?: string
  rating?: number
  reviewsCount?: number
  type?: string
  thumbnail?: string
  dataId?: string
  placeId?: string
  createdAt: string
  lastScrapedAt?: string
  scrapeStatus: 'idle' | 'scraping' | 'done' | 'error'
  scrapeError?: string
  nextPageToken?: string
}

export type StoredReview = Review & {
  campaignId: string
}

export type ReviewsPage = {
  place: PlaceInfo
  reviews: Review[]
  nextPageToken?: string
}

export type RatingFilter = 'all' | '5' | '4' | '3' | '2' | '1'
export type SortOption = 'newest' | 'oldest'
export type TimeRange = 'all' | '7d' | '30d' | '90d' | '365d' | 'custom'
export type CampaignFilter = 'all' | string
