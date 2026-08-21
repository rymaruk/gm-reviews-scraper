import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { cityFromAddress } from './place.js'

describe('cityFromAddress', () => {
  it('uses the city, not the oblast, from a Ukrainian Maps address', () => {
    assert.equal(
      cityFromAddress("Vulytsya Kovelʹsʹka, 107б, Volodymyr, Volyn Oblast, Ukraine, 44701"),
      'Volodymyr',
    )
  })

  it('uses the city from a US address', () => {
    assert.equal(
      cityFromAddress('500 Terry A Francois Blvd, San Francisco, CA 94158, United States'),
      'San Francisco',
    )
  })

  it('uses the city when the address is only city and country', () => {
    assert.equal(cityFromAddress('Kyiv, Ukraine'), 'Kyiv')
  })
})
