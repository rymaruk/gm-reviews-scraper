import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { Campaign } from './types'
import { exportSharesCsv, planShareImport, sharesCsvFilename } from './share-csv'

function shop(input: {
  id: string
  address?: string
  title?: string
  share: number
}): Campaign {
  return {
    id: input.id,
    mapsUrl: 'https://maps.google.com/?cid=1',
    title: input.title ?? 'Cloud Castle',
    address: input.address,
    createdAt: '2026-01-01T00:00:00.000Z',
    scrapeStatus: 'done',
    share: input.share,
  }
}

describe('sharesCsvFilename', () => {
  it('uses the local calendar date', () => {
    assert.equal(sharesCsvFilename(new Date(2026, 8, 15, 23, 59)), '2026-09-15-cc_shops_shares.csv')
  })
})

describe('exportSharesCsv', () => {
  it('exports Address and Share for every shop', () => {
    const csv = exportSharesCsv([
      shop({ id: 'a', address: 'Lutsk, Ukraine', share: 40 }),
      shop({ id: 'b', address: 'Kyiv, Ukraine', share: 60 }),
    ])
    assert.match(csv, /"Address","Share"/)
    assert.match(csv, /"Lutsk, Ukraine","40"/)
    assert.match(csv, /"Kyiv, Ukraine","60"/)
  })

  it('falls back to the display name when address is missing', () => {
    const csv = exportSharesCsv([shop({ id: 'a', title: 'Nameless shop', share: 100 })])
    assert.match(csv, /"Nameless shop","100"/)
  })
})

describe('planShareImport', () => {
  const campaigns = [
    shop({ id: 'a', address: 'Rivnens\'ka St, 83, Lutsk, Volyn Oblast, Ukraine, 43000', share: 40 }),
    shop({ id: 'b', address: 'Kyiv, Ukraine', share: 40 }),
    shop({ id: 'c', address: 'Lviv, Ukraine', share: 20 }),
  ]

  it('matches addresses case-insensitively and saves a subset even when the total is not 100%', () => {
    const plan = planShareImport(
      campaigns,
      'Address,Share\n"rivnens\'ka st, 83, lutsk, volyn oblast, ukraine, 43000",50\n"Kyiv, Ukraine",30',
    )
    assert.equal(plan.canSave, true)
    assert.equal(plan.changedCount, 2)
    assert.deepEqual(
      plan.shares.map((item) => item.share),
      [50, 30],
    )
    assert.equal(plan.rows.filter((row) => row.status === 'updated').length, 2)
  })

  it('still accepts legacy Weight column headers', () => {
    const plan = planShareImport(campaigns, 'Address,Current weights\n"Kyiv, Ukraine",5')
    assert.equal(plan.canSave, true)
    assert.equal(plan.rows[0]?.status, 'updated')
    assert.deepEqual(plan.shares, [{ id: 'b', share: 5 }])
  })

  it('lists unknown addresses as not found', () => {
    const plan = planShareImport(campaigns, 'Address,Share\n"Nowhere Street",10')
    assert.equal(plan.rows[0]?.status, 'not_found')
    assert.equal(plan.canSave, false)
  })

  it('rejects duplicate rows and invalid shares', () => {
    const plan = planShareImport(
      campaigns,
      'Address,Share\n"Kyiv, Ukraine",10\n"Kyiv, Ukraine",20\n"Lviv, Ukraine",-1',
    )
    assert.equal(plan.rows[1]?.status, 'duplicate')
    assert.equal(plan.rows[2]?.status, 'invalid_share')
  })
})
