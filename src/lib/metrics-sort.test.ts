import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  compareMetricsCampaigns,
  defaultMetricsSort,
  groupCampaignsForMetrics,
  nextMetricsSort,
  type MetricsSortContext,
} from './metrics-sort'
import type { Campaign, CampaignReviewStats } from './types'

function shop(input: {
  id: string
  title: string
  address?: string
  share?: number
}): Campaign {
  return {
    id: input.id,
    mapsUrl: 'https://maps.google.com/?cid=1',
    title: input.title,
    address: input.address,
    createdAt: '2026-01-01T00:00:00.000Z',
    scrapeStatus: 'done',
    share: input.share ?? 0,
  }
}

const baker = shop({ id: 'baker', title: 'Baker', address: 'Kyiv, Ukraine', share: 10 })
const zebra = shop({ id: 'zebra', title: 'Zebra', address: 'Kyiv, Ukraine', share: 40 })
const apple = shop({ id: 'apple', title: 'Apple', address: 'Lviv, Ukraine', share: 50 })

const stats: Record<string, CampaignReviewStats> = {
  baker: { count: 2, lastReviewAt: '2026-08-01T00:00:00.000Z' },
  zebra: { count: 8, lastReviewAt: '2026-09-01T00:00:00.000Z' },
  apple: { count: 5, lastReviewAt: null },
}

const drafts = { baker: '10', zebra: '40', apple: '50' }
const context: MetricsSortContext = { drafts, reviewStats: stats }

describe('nextMetricsSort', () => {
  it('starts address A-Z, last review newest first, and numbers high to low', () => {
    assert.deepEqual(nextMetricsSort(defaultMetricsSort, 'lastReview'), {
      column: 'lastReview',
      direction: 'desc',
    })
    assert.deepEqual(nextMetricsSort(defaultMetricsSort, 'reviews'), {
      column: 'reviews',
      direction: 'desc',
    })
    assert.deepEqual(nextMetricsSort(defaultMetricsSort, 'share'), {
      column: 'share',
      direction: 'desc',
    })
  })

  it('toggles direction on the same column', () => {
    assert.deepEqual(nextMetricsSort(defaultMetricsSort, 'address'), {
      column: 'address',
      direction: 'desc',
    })
  })
})

describe('compareMetricsCampaigns', () => {
  it('sorts shops alphabetically by name', () => {
    const sort = { column: 'address' as const, direction: 'asc' as const }
    assert.ok(compareMetricsCampaigns(apple, zebra, sort, context) < 0)
    assert.ok(compareMetricsCampaigns(zebra, baker, sort, context) > 0)
  })

  it('sorts last review by date and keeps shops without a date last', () => {
    const newest = { column: 'lastReview' as const, direction: 'desc' as const }
    assert.ok(compareMetricsCampaigns(zebra, baker, newest, context) < 0)
    assert.ok(compareMetricsCampaigns(apple, baker, newest, context) > 0)
    assert.ok(compareMetricsCampaigns(apple, zebra, newest, context) > 0)
  })

  it('sorts review counts high to low', () => {
    const sort = { column: 'reviews' as const, direction: 'desc' as const }
    assert.ok(compareMetricsCampaigns(zebra, apple, sort, context) < 0)
    assert.ok(compareMetricsCampaigns(apple, baker, sort, context) < 0)
  })

  it('sorts share from the draft values', () => {
    const sort = { column: 'share' as const, direction: 'desc' as const }
    const live = { ...context, drafts: { baker: '70', zebra: '20', apple: '10' } }
    assert.ok(compareMetricsCampaigns(baker, zebra, sort, live) < 0)
  })
})

describe('groupCampaignsForMetrics', () => {
  it('keeps city groups and sorts shops A-Z inside them', () => {
    const grouped = groupCampaignsForMetrics([zebra, baker, apple], defaultMetricsSort, context)
    assert.deepEqual(
      grouped.map((group) => [group.city, group.campaigns.map((campaign) => campaign.id)]),
      [
        ['Kyiv', ['baker', 'zebra']],
        ['Lviv', ['apple']],
      ],
    )
  })

  it('orders city groups Z-A when address sort is reversed', () => {
    const grouped = groupCampaignsForMetrics(
      [zebra, baker, apple],
      { column: 'address', direction: 'desc' },
      context,
    )
    assert.deepEqual(
      grouped.map((group) => group.city),
      ['Lviv', 'Kyiv'],
    )
  })

  it('puts the city with the highest-share shop first', () => {
    const grouped = groupCampaignsForMetrics(
      [zebra, baker, apple],
      { column: 'share', direction: 'desc' },
      context,
    )
    assert.equal(grouped[0]?.city, 'Lviv')
    assert.deepEqual(
      grouped.find((group) => group.city === 'Kyiv')?.campaigns.map((campaign) => campaign.id),
      ['zebra', 'baker'],
    )
  })
})
