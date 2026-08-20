import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseMapsUrl } from './maps-url.js'

describe('parseMapsUrl', () => {
  it('extracts data_id and coordinates from a place URL', () => {
    const parsed = parseMapsUrl(
      'https://www.google.com/maps/place/Starbucks/@40.758896,-73.98513,17z/data=!4m6!3m5!1s0x89c25855c4b8c8e5:0x4e0b0b0b0b!8m2!3d40.758896!4d-73.98513',
    )

    assert.equal(parsed.dataId, '0x89c25855c4b8c8e5:0x4e0b0b0b0b')
    assert.equal(parsed.placeName, 'Starbucks')
    assert.equal(parsed.lat, 40.758896)
    assert.equal(parsed.lng, -73.98513)
  })

  it('extracts encoded data_id values', () => {
    const parsed = parseMapsUrl(
      'https://www.google.com/maps/place/Shop/data=!4m2!3m1!1s0x89c259af336b3341%3A0xa4969e07ce3108de',
    )

    assert.equal(parsed.dataId, '0x89c259af336b3341:0xa4969e07ce3108de')
  })

  it('extracts place_id from query strings', () => {
    const parsed = parseMapsUrl(
      'https://www.google.com/maps/search/?api=1&query=Coffee&query_place_id=ChIJhRwB-yFawokR5Phil-QQ3zM',
    )

    assert.equal(parsed.placeId, 'ChIJhRwB-yFawokR5Phil-QQ3zM')
  })

  it('extracts cid values', () => {
    const parsed = parseMapsUrl('https://maps.google.com/?cid=10281178965878114402')
    assert.equal(parsed.dataCid, '10281178965878114402')
  })
})
