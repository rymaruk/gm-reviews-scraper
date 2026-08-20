import type { Campaign, StoredReview } from '@/lib/types'
import { campaignDisplayName } from '@/lib/place'

const CAMPAIGNS_KEY = 'gm-reviews:campaigns'
const REVIEWS_KEY = 'gm-reviews:reviews'

export function loadCampaigns(): Campaign[] {
  return readJson<Campaign[]>(CAMPAIGNS_KEY, []).map((campaign) => ({
    ...campaign,
    title: campaignDisplayName(campaign),
    scrapeStatus: campaign.scrapeStatus === 'scraping' ? 'idle' : campaign.scrapeStatus,
  }))
}

export function saveCampaigns(campaigns: Campaign[]): void {
  localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns))
}

export function loadReviews(): StoredReview[] {
  return readJson<StoredReview[]>(REVIEWS_KEY, [])
}

export function saveReviews(reviews: StoredReview[]): void {
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews))
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
