import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  clearActiveFilter,
  defaultFilterParams,
  listActiveFilters,
  resetActiveFilters,
} from './search-params'

const filters = {
  ...defaultFilterParams,
  query: 'delivery',
  rating: '5' as const,
  city: 'Lutsk',
  company: 'shop-1',
  timeRange: '7d' as const,
  sort: 'oldest' as const,
}

describe('listActiveFilters', () => {
  it('lists only non-default filters', () => {
    const chips = listActiveFilters(filters, { company: 'Cloud Castle' })
    assert.deepEqual(
      chips.map((chip) => chip.id),
      ['query', 'rating', 'timeRange', 'city', 'sort', 'company'],
    )
    assert.equal(chips.find((chip) => chip.id === 'company')?.label, 'Cloud Castle')
    assert.equal(chips.find((chip) => chip.id === 'rating')?.label, '5 stars')
  })
})

describe('clearActiveFilter', () => {
  it('clears one filter back to its default', () => {
    const next = clearActiveFilter(filters, 'city')
    assert.equal(next.city, 'all')
    assert.equal(next.query, 'delivery')
  })

  it('clears custom dates with the time range', () => {
    const next = clearActiveFilter(
      { ...filters, timeRange: 'custom', fromDate: '2026-09-01', toDate: '2026-09-15' },
      'timeRange',
    )
    assert.equal(next.timeRange, 'all')
    assert.equal(next.fromDate, '')
    assert.equal(next.toDate, '')
  })
})

describe('resetActiveFilters', () => {
  it('returns the default filter set', () => {
    assert.deepEqual(resetActiveFilters(), defaultFilterParams)
  })
})
