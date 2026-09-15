import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { Campaign } from './types'
import { exportWeightsCsv, planWeightImport, weightsCsvFilename } from './weight-csv'

function shop(input: {
  id: string
  address?: string
  title?: string
  weight: number
}): Campaign {
  return {
    id: input.id,
    mapsUrl: 'https://maps.google.com/?cid=1',
    title: input.title ?? 'Cloud Castle',
    address: input.address,
    createdAt: '2026-01-01T00:00:00.000Z',
    scrapeStatus: 'done',
    weight: input.weight,
  }
}

describe('weightsCsvFilename', () => {
  it('uses the local calendar date', () => {
    assert.equal(weightsCsvFilename(new Date(2026, 8, 15, 23, 59)), '2026-09-15-cc_shops_weights.csv')
  })
})

describe('exportWeightsCsv', () => {
  it('exports Address and Weight for every shop', () => {
    const csv = exportWeightsCsv([
      shop({ id: 'a', address: 'Lutsk, Ukraine', weight: 40 }),
      shop({ id: 'b', address: 'Kyiv, Ukraine', weight: 60 }),
    ])
    assert.match(csv, /"Address","Weight"/)
    assert.match(csv, /"Lutsk, Ukraine","40"/)
    assert.match(csv, /"Kyiv, Ukraine","60"/)
  })

  it('falls back to the display name when address is missing', () => {
    const csv = exportWeightsCsv([shop({ id: 'a', title: 'Nameless shop', weight: 100 })])
    assert.match(csv, /"Nameless shop","100"/)
  })
})

describe('planWeightImport', () => {
  const campaigns = [
    shop({ id: 'a', address: 'Rivnens\'ka St, 83, Lutsk, Volyn Oblast, Ukraine, 43000', weight: 40 }),
    shop({ id: 'b', address: 'Kyiv, Ukraine', weight: 40 }),
    shop({ id: 'c', address: 'Lviv, Ukraine', weight: 20 }),
  ]

  it('matches addresses case-insensitively and saves a subset even when the total is not 100%', () => {
    const plan = planWeightImport(
      campaigns,
      'Address,Weight\n"rivnens\'ka st, 83, lutsk, volyn oblast, ukraine, 43000",50\n"Kyiv, Ukraine",30',
    )
    assert.equal(plan.canSave, true)
    assert.equal(plan.changedCount, 2)
    assert.deepEqual(
      plan.weights.map((item) => item.weight),
      [50, 30],
    )
    assert.equal(plan.rows.filter((row) => row.status === 'updated').length, 2)
  })

  it('saves matched rows even when the merged total is not 100%', () => {
    const plan = planWeightImport(campaigns, 'Address,Current weights\n"Kyiv, Ukraine",5')
    assert.equal(plan.canSave, true)
    assert.equal(plan.rows[0]?.status, 'updated')
    assert.deepEqual(plan.weights, [{ id: 'b', weight: 5 }])
  })

  it('lists unknown addresses as not found', () => {
    const plan = planWeightImport(campaigns, 'Address,Weight\n"Nowhere Street",10')
    assert.equal(plan.rows[0]?.status, 'not_found')
    assert.equal(plan.canSave, false)
  })

  it('rejects duplicate rows and invalid weights', () => {
    const plan = planWeightImport(
      campaigns,
      'Address,Weight\n"Kyiv, Ukraine",10\n"Kyiv, Ukraine",20\n"Lviv, Ukraine",-1',
    )
    assert.equal(plan.rows[1]?.status, 'duplicate')
    assert.equal(plan.rows[2]?.status, 'invalid_weight')
  })
})
