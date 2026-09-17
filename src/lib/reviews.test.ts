import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildCampaignReviewStats,
  daysSinceLastReview,
  formatDaysSinceLastReview,
  formatLastReviewDate,
} from './reviews'

describe('buildCampaignReviewStats', () => {
  it('counts reviews and keeps the newest iso date per shop', () => {
    const stats = buildCampaignReviewStats([
      { campaignId: 'a', isoDate: '2026-08-19T10:00:00.000Z' },
      { campaignId: 'a', isoDate: '2026-08-01T10:00:00.000Z' },
      { campaignId: 'b', isoDate: '2026-07-20T08:00:00.000Z' },
      { campaignId: 'b' },
    ])
    assert.deepEqual(stats.a, { count: 2, lastReviewAt: '2026-08-19T10:00:00.000Z' })
    assert.deepEqual(stats.b, { count: 2, lastReviewAt: '2026-07-20T08:00:00.000Z' })
  })
})

describe('daysSinceLastReview', () => {
  it('counts whole calendar days from the last review to today', () => {
    const now = new Date(2026, 7, 21)
    assert.equal(daysSinceLastReview('2026-08-19', now), 2)
    assert.equal(daysSinceLastReview('2026-08-21T18:00:00.000Z', now), 0)
  })
})

describe('formatLastReviewDate', () => {
  it('formats a calendar day', () => {
    assert.match(formatLastReviewDate('2026-08-19T10:00:00.000Z'), /19/)
    assert.match(formatLastReviewDate('2026-08-19T10:00:00.000Z'), /2026/)
  })
})

describe('formatDaysSinceLastReview', () => {
  it('uses today, 1 day ago, and N days ago', () => {
    assert.equal(formatDaysSinceLastReview(0), 'Today')
    assert.equal(formatDaysSinceLastReview(1), '1 day ago')
    assert.equal(formatDaysSinceLastReview(6), '6 days ago')
  })
})
