import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { scrapeLimitMessage, wasScrapedToday } from './scrape'

describe('wasScrapedToday', () => {
  it('is true for a timestamp on the same calendar day', () => {
    const now = new Date(2026, 8, 15, 13, 0, 0)
    assert.equal(wasScrapedToday(new Date(2026, 8, 15, 8, 30, 0).toISOString(), now), true)
  })

  it('is false for a timestamp on the previous calendar day', () => {
    const now = new Date(2026, 8, 15, 13, 0, 0)
    assert.equal(wasScrapedToday(new Date(2026, 8, 14, 23, 59, 0).toISOString(), now), false)
  })

  it('is false when the campaign has never been scraped', () => {
    assert.equal(wasScrapedToday(undefined), false)
  })
})

describe('scrapeLimitMessage', () => {
  it('names the address and last scrape time', () => {
    const message = scrapeLimitMessage({
      title: 'Shop',
      mapsUrl: 'https://maps.google.com',
      address: 'Heroiv Ukrainy St, 11, Brovary',
      lastScrapedAt: '2026-09-15T10:04:00.000Z',
    })
    assert.match(message, /Heroiv Ukrainy St, 11, Brovary/)
    assert.match(message, /Only one scrape per day is allowed/)
  })
})
