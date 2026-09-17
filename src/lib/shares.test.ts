import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  formatShare,
  formatWeightedAverage,
  parseShare,
  shareWeightedAverage,
  sharesTotal,
  validateShares,
} from './shares'

describe('parseShare', () => {
  it('treats a blank value as 0', () => {
    assert.equal(parseShare(''), 0)
    assert.equal(parseShare('  '), 0)
  })

  it('parses decimal values', () => {
    assert.equal(parseShare('12.5'), 12.5)
    assert.equal(parseShare('12,5'), 12.5)
  })
})

describe('formatShare', () => {
  it('drops trailing zeros', () => {
    assert.equal(formatShare(12.5), '12.5')
    assert.equal(formatShare(100), '100')
    assert.equal(formatShare(33.33), '33.33')
  })
})

describe('validateShares', () => {
  it('requires a non-negative value on every row', () => {
    const result = validateShares([50, -1, 51])
    assert.equal(result.ok, false)
    assert.match(result.error ?? '', /0 or greater/)
  })

  it('requires the total to be 100%', () => {
    const result = validateShares([40, 40, 10])
    assert.equal(result.ok, false)
    assert.equal(result.total, 90)
    assert.match(result.error ?? '', /100%/)
  })

  it('accepts shares that add up to 100%', () => {
    const result = validateShares([33.33, 33.33, 33.34])
    assert.equal(result.ok, true)
    assert.equal(sharesTotal([33.33, 33.33, 33.34]), 100)
  })
})

describe('shareWeightedAverage', () => {
  it('matches SUMPRODUCT(share, rating) / SUM(share)', () => {
    const average = shareWeightedAverage([
      { share: 9, value: 5 },
      { share: 10, value: 4 },
      { share: 41, value: 3 },
      { share: 26, value: 2 },
      { share: 14, value: 1 },
    ])
    assert.equal(average, 2.74)
  })

  it('ignores shops with a 0 share', () => {
    const average = shareWeightedAverage([
      { share: 100, value: 5 },
      { share: 0, value: 1 },
    ])
    assert.equal(average, 5)
  })

  it('weights days since last review the same way', () => {
    const average = shareWeightedAverage([
      { share: 9, value: 6 },
      { share: 10, value: 2 },
      { share: 41, value: 55 },
      { share: 26, value: 1 },
      { share: 14, value: 4 },
    ])
    assert.equal(average, 24.11)
  })

  it('formats Google Maps ratings to one decimal and mixed scores to two', () => {
    assert.equal(formatWeightedAverage(4.8), '4.8')
    assert.equal(formatWeightedAverage(2.74), '2.74')
  })
})
