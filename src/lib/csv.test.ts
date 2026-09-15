import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { parseCsv, stringifyCsv } from './csv'

describe('parseCsv', () => {
  it('parses quoted commas and escaped quotes', () => {
    const rows = parseCsv('Address,Weight\n"Main St, 1, Lutsk",12.5\n"Shop ""Castle""",0')
    assert.deepEqual(rows, [
      ['Address', 'Weight'],
      ['Main St, 1, Lutsk', '12.5'],
      ['Shop "Castle"', '0'],
    ])
  })

  it('strips a BOM and skips blank lines', () => {
    const rows = parseCsv('\uFEFFAddress,Weight\n\nLutsk,10\n')
    assert.deepEqual(rows, [
      ['Address', 'Weight'],
      ['Lutsk', '10'],
    ])
  })
})

describe('stringifyCsv', () => {
  it('round-trips quoted fields', () => {
    const csv = stringifyCsv([
      ['Address', 'Weight'],
      ['Main St, 1', '12.5'],
    ])
    assert.deepEqual(parseCsv(csv), [
      ['Address', 'Weight'],
      ['Main St, 1', '12.5'],
    ])
  })
})
