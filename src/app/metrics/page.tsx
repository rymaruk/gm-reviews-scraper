import type { Metadata } from 'next'

import { MetricsGrid } from '@/components/metrics-grid'
import type { Campaign } from '@/lib/types'
import { handleCampaigns } from '@/server/handlers'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Metric',
}

export default async function MetricsPage() {
  const result = await handleCampaigns()
  const body = result.body as { campaigns?: Campaign[]; error?: string }
  const campaigns = result.status === 200 ? (body.campaigns ?? []) : []
  const error = result.status === 200 ? null : (body.error ?? 'Could not load campaigns.')

  return <MetricsGrid initialCampaigns={campaigns} initialError={error} />
}
