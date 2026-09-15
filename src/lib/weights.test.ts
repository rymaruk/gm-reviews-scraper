import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { formatWeight, parseWeight, validateWeights, weightsTotal } from './weights'

describe('parseWeight', () => {
  it('treats a blank value as 0', () => {
    assert.equal(parseWeight(''), 0)
    assert.equal(parseWeight('  '), 0)
  })

  it('parses decimal values', () => {
    assert.equal(parseWeight('12.5'), 12.5)
    assert.equal(parseWeight('12,5'), 12.5)
  })
})

describe('formatWeight', () => {
  it('drops trailing zeros', () => {
    assert.equal(formatWeight(12.5), '12.5')
    assert.equal(formatWeight(100), '100')
    assert.equal(formatWeight(33.33), '33.33')
  })
})

describe('validateWeights', () => {
  it('requires a non-negative value on every row', () => {
    const result = validateWeights([50, -1, 51])
    assert.equal(result.ok, false)
    assert.match(result.error ?? '', /0 or greater/)
  })

  it('requires the total to be 100%', () => {
    const result = validateWeights([40, 40, 10])
    assert.equal(result.ok, false)
    assert.equal(result.total, 90)
    assert.match(result.error ?? '', /100%/)
  })

  it('accepts weights that add up to 100%', () => {
    const result = validateWeights([33.33, 33.33, 33.34])
    assert.equal(result.ok, true)
    assert.equal(weightsTotal([33.33, 33.33, 33.34]), 100)
  })
})
