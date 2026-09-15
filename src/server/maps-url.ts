const SHORT_HOSTS = new Set(['maps.app.goo.gl', 'goo.gl', 'g.co'])
const DATA_ID_PATTERN = /0x[0-9a-fA-F]+:0x[0-9a-fA-F]+/
const PLACE_ID_PATTERN = /ChIJ[\w-]+/

export type ParsedMapsLink = {
  originalUrl: string
  resolvedUrl: string
  dataId?: string
  placeId?: string
  dataCid?: string
  placeName?: string
  lat?: number
  lng?: number
}

export function parseMapsUrl(urlString: string, resolvedUrl = urlString): ParsedMapsLink {
  const trimmed = urlString.trim()
  const decoded = safeDecode(trimmed)

  let searchParams: URLSearchParams | undefined
  try {
    searchParams = new URL(trimmed).searchParams
  } catch {
    searchParams = undefined
  }

  const dataId =
    matchFirst(decoded, /!1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)/) ??
    searchParams?.get('ftid') ??
    matchFirst(decoded, /[?&]ftid=(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)/i) ??
    decoded.match(DATA_ID_PATTERN)?.[0]

  const placeId =
    searchParams?.get('query_place_id') ??
    searchParams?.get('place_id') ??
    matchFirst(decoded, /place_id:([^&\s/]+)/i) ??
    matchFirst(decoded, /!1s(ChIJ[\w-]+)/) ??
    decoded.match(PLACE_ID_PATTERN)?.[0]

  const dataCid = searchParams?.get('cid') ?? searchParams?.get('ludocid')

  const coords = decoded.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  const placeName = extractPlaceName(decoded)

  return {
    originalUrl: trimmed,
    resolvedUrl,
    dataId: dataId || undefined,
    placeId: placeId ? decodeURIComponent(placeId) : undefined,
    dataCid: dataCid || undefined,
    placeName,
    lat: coords ? Number(coords[1]) : undefined,
    lng: coords ? Number(coords[2]) : undefined,
  }
}

export async function expandMapsUrl(urlString: string): Promise<string> {
  const trimmed = urlString.trim()
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error('That does not look like a valid URL.')
  }

  if (!SHORT_HOSTS.has(parsed.hostname)) {
    return trimmed
  }

  const response = await fetch(trimmed, {
    method: 'GET',
    redirect: 'follow',
    signal: AbortSignal.timeout(15_000),
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
  })

  return response.url || trimmed
}

export async function parseAndExpandMapsUrl(urlString: string): Promise<ParsedMapsLink> {
  const resolvedUrl = await expandMapsUrl(urlString)
  const parsed = parseMapsUrl(resolvedUrl, resolvedUrl)
  return { ...parsed, originalUrl: urlString.trim() }
}

export function hasPlaceIdentifier(parsed: ParsedMapsLink): boolean {
  return Boolean(parsed.dataId || parsed.placeId || parsed.dataCid || parsed.placeName)
}

function extractPlaceName(url: string): string | undefined {
  const match = url.match(/\/maps\/place\/([^/@?]+)/i)
  if (!match?.[1]) return undefined

  const name = decodeURIComponent(match[1].replace(/\+/g, ' ')).trim()
  if (!name || name === '.' || DATA_ID_PATTERN.test(name) || PLACE_ID_PATTERN.test(name)) {
    return undefined
  }

  return name
}

function matchFirst(value: string, pattern: RegExp): string | undefined {
  return value.match(pattern)?.[1]
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '))
  } catch {
    return value
  }
}
