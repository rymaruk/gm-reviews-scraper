import { ReviewsApp } from '@/components/reviews-app'
import { readFilterParamsFromRecord } from '@/lib/search-params'
import type { Campaign, StoredReview } from '@/lib/types'
import { healthPayload } from '@/server/env'
import { handleStore } from '@/server/handlers'

export const dynamic = 'force-dynamic'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const initialFilters = readFilterParamsFromRecord(params)
  const health = healthPayload()
  const store = await handleStore()
  const body = store.body as { campaigns?: Campaign[]; reviews?: StoredReview[]; error?: string }

  const campaigns = store.status === 200 ? (body.campaigns ?? []) : []
  const reviews = store.status === 200 ? (body.reviews ?? []) : []
  const storeError = store.status === 200 ? null : (body.error ?? 'Could not load saved reviews.')

  return (
    <ReviewsApp
      initialCampaigns={campaigns}
      initialReviews={reviews}
      initialFilters={initialFilters}
      initialConfigError={storeError ?? configErrorFromHealth(health)}
    />
  )
}

function configErrorFromHealth(health: ReturnType<typeof healthPayload>): string | null {
  if (health.configured && health.supabase) return null
  const missing = health.missing.length
    ? health.missing.join(', ')
    : 'SERPAPI_KEY, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY'
  return `Missing on the server: ${missing}. Add them to .env.local or Vercel → Project Settings → Environment Variables, then restart or redeploy.`
}
