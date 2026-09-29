import { campaignDisplayName, groupCampaignsByCity } from './place'
import { parseShare } from './shares'
import type { Campaign, CampaignReviewStats } from './types'

export type MetricsSortColumn = 'address' | 'lastReview' | 'reviews' | 'share'
export type MetricsSortDirection = 'asc' | 'desc'

export type MetricsSort = {
  column: MetricsSortColumn
  direction: MetricsSortDirection
}

export type MetricsSortContext = {
  drafts: Record<string, string>
  reviewStats: Record<string, CampaignReviewStats>
}

export const defaultMetricsSort: MetricsSort = { column: 'address', direction: 'asc' }

const DEFAULT_DIRECTION: Record<MetricsSortColumn, MetricsSortDirection> = {
  address: 'asc',
  lastReview: 'desc',
  reviews: 'desc',
  share: 'desc',
}

export function defaultDirectionForColumn(column: MetricsSortColumn): MetricsSortDirection {
  return DEFAULT_DIRECTION[column]
}

export function nextMetricsSort(current: MetricsSort, column: MetricsSortColumn): MetricsSort {
  if (current.column === column) {
    return { column, direction: current.direction === 'asc' ? 'desc' : 'asc' }
  }
  return { column, direction: DEFAULT_DIRECTION[column] }
}

export function compareMetricsCampaigns(
  left: Campaign,
  right: Campaign,
  sort: MetricsSort,
  context: MetricsSortContext,
): number {
  const dir = sort.direction === 'asc' ? 1 : -1
  let cmp = 0

  switch (sort.column) {
    case 'address':
      cmp = campaignDisplayName(left).localeCompare(campaignDisplayName(right))
      if (cmp === 0) cmp = (left.address ?? '').localeCompare(right.address ?? '')
      break
    case 'lastReview': {
      const leftDate = context.reviewStats[left.id]?.lastReviewAt ?? null
      const rightDate = context.reviewStats[right.id]?.lastReviewAt ?? null
      if (!leftDate && !rightDate) cmp = 0
      else if (!leftDate) return 1
      else if (!rightDate) return -1
      else cmp = leftDate.localeCompare(rightDate)
      break
    }
    case 'reviews':
      cmp = reviewCount(context, left.id) - reviewCount(context, right.id)
      break
    case 'share': {
      const leftShare = shareSortValue(context.drafts[left.id])
      const rightShare = shareSortValue(context.drafts[right.id])
      if (leftShare.invalid && rightShare.invalid) cmp = 0
      else if (leftShare.invalid) return 1
      else if (rightShare.invalid) return -1
      else cmp = leftShare.value - rightShare.value
      break
    }
  }

  if (cmp !== 0) return cmp * dir
  const nameCmp = campaignDisplayName(left).localeCompare(campaignDisplayName(right))
  if (nameCmp !== 0) return nameCmp
  return left.id.localeCompare(right.id)
}

export function groupCampaignsForMetrics(
  campaigns: Campaign[],
  sort: MetricsSort,
  context: MetricsSortContext,
): Array<{ city: string; campaigns: Campaign[] }> {
  const groups = groupCampaignsByCity(campaigns, (left, right) =>
    compareMetricsCampaigns(left, right, sort, context),
  )

  if (sort.column !== 'address') return groups

  const known = groups.filter((group) => group.city !== 'Unknown city')
  const unknown = groups.filter((group) => group.city === 'Unknown city')
  known.sort((left, right) => {
    const cmp = left.city.localeCompare(right.city)
    return sort.direction === 'asc' ? cmp : -cmp
  })
  return [...known, ...unknown]
}

function reviewCount(context: MetricsSortContext, campaignId: string): number {
  return context.reviewStats[campaignId]?.count ?? 0
}

function shareSortValue(raw: string | undefined): { value: number; invalid: boolean } {
  const parsed = parseShare(raw ?? '')
  if (parsed == null || parsed < 0) return { value: 0, invalid: true }
  return { value: parsed, invalid: false }
}
