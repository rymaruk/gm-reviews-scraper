import type { Campaign, StoredReview } from '../src/lib/types.ts'
import { getSupabase } from './supabase.ts'

const PAGE_SIZE = 1000

type CampaignRow = {
  id: string
  maps_url: string
  title: string
  address: string | null
  rating: number | null
  reviews_count: number | null
  type: string | null
  thumbnail: string | null
  data_id: string | null
  place_id: string | null
  created_at: string
  last_scraped_at: string | null
  scrape_status: Campaign['scrapeStatus']
  scrape_error: string | null
  next_page_token: string | null
}

type ReviewRow = {
  id: string
  campaign_id: string
  rating: number
  date: string | null
  iso_date: string | null
  snippet: string
  likes: number | null
  link: string | null
  source: string | null
  images: string[] | null
  user_name: string
  user_thumbnail: string | null
  user_link: string | null
  user_local_guide: boolean | null
  user_reviews: number | null
}

export async function listCampaigns(): Promise<Campaign[]> {
  const rows = await fetchAll<CampaignRow>('campaigns', 'last_scraped_at')
  return rows.map(fromCampaignRow)
}

export async function listReviews(): Promise<StoredReview[]> {
  const rows = await fetchAll<ReviewRow>('reviews', 'iso_date')
  return rows.map(fromReviewRow)
}

export async function getCampaign(id: string): Promise<Campaign | undefined> {
  const { data, error } = await getSupabase().from('campaigns').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? fromCampaignRow(data as CampaignRow) : undefined
}

export async function upsertCampaign(campaign: Campaign): Promise<void> {
  const { error } = await getSupabase().from('campaigns').upsert(toCampaignRow(campaign), {
    onConflict: 'id',
  })
  if (error) throw new Error(error.message)
}

export async function upsertReviews(reviews: StoredReview[]): Promise<void> {
  if (reviews.length === 0) return

  const supabase = getSupabase()
  for (let index = 0; index < reviews.length; index += 200) {
    const chunk = reviews.slice(index, index + 200).map(toReviewRow)
    const { error } = await supabase.from('reviews').upsert(chunk, {
      onConflict: 'campaign_id,id',
    })
    if (error) throw new Error(error.message)
  }
}

export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await getSupabase().from('campaigns').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

async function fetchAll<T>(table: 'campaigns' | 'reviews', orderColumn: string): Promise<T[]> {
  const supabase = getSupabase()
  const rows: T[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderColumn, { ascending: false, nullsFirst: false })
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw new Error(error.message)
    const page = (data ?? []) as T[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows
}

function toCampaignRow(campaign: Campaign): CampaignRow {
  return {
    id: campaign.id,
    maps_url: campaign.mapsUrl,
    title: campaign.title,
    address: campaign.address ?? null,
    rating: campaign.rating ?? null,
    reviews_count: campaign.reviewsCount ?? null,
    type: campaign.type ?? null,
    thumbnail: campaign.thumbnail ?? null,
    data_id: campaign.dataId ?? null,
    place_id: campaign.placeId ?? null,
    created_at: campaign.createdAt,
    last_scraped_at: campaign.lastScrapedAt ?? null,
    scrape_status: campaign.scrapeStatus,
    scrape_error: campaign.scrapeError ?? null,
    next_page_token: campaign.nextPageToken ?? null,
  }
}

function fromCampaignRow(row: CampaignRow): Campaign {
  return {
    id: row.id,
    mapsUrl: row.maps_url,
    title: row.title,
    address: row.address ?? undefined,
    rating: row.rating ?? undefined,
    reviewsCount: row.reviews_count ?? undefined,
    type: row.type ?? undefined,
    thumbnail: row.thumbnail ?? undefined,
    dataId: row.data_id ?? undefined,
    placeId: row.place_id ?? undefined,
    createdAt: row.created_at,
    lastScrapedAt: row.last_scraped_at ?? undefined,
    scrapeStatus: row.scrape_status === 'scraping' ? 'idle' : row.scrape_status,
    scrapeError: row.scrape_error ?? undefined,
    nextPageToken: row.next_page_token ?? undefined,
  }
}

function toReviewRow(review: StoredReview): ReviewRow {
  return {
    id: review.id,
    campaign_id: review.campaignId,
    rating: review.rating,
    date: review.date ?? null,
    iso_date: review.isoDate ?? null,
    snippet: review.snippet,
    likes: review.likes ?? null,
    link: review.link ?? null,
    source: review.source ?? null,
    images: review.images ?? null,
    user_name: review.user.name,
    user_thumbnail: review.user.thumbnail ?? null,
    user_link: review.user.link ?? null,
    user_local_guide: review.user.localGuide ?? null,
    user_reviews: review.user.reviews ?? null,
  }
}

function fromReviewRow(row: ReviewRow): StoredReview {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    rating: row.rating,
    date: row.date ?? undefined,
    isoDate: row.iso_date ?? undefined,
    snippet: row.snippet,
    likes: row.likes ?? undefined,
    link: row.link ?? undefined,
    source: row.source ?? undefined,
    images: row.images ?? undefined,
    user: {
      name: row.user_name,
      thumbnail: row.user_thumbnail ?? undefined,
      link: row.user_link ?? undefined,
      localGuide: row.user_local_guide ?? undefined,
      reviews: row.user_reviews ?? undefined,
    },
  }
}
