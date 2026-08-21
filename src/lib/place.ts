import type { Campaign, CompanySort } from './types.js'

const PLACEHOLDER_NAMES = new Set(['unknown place', 'unknown campaign', 'unknown'])

export function isPlaceholderName(name?: string): boolean {
  return !name?.trim() || PLACEHOLDER_NAMES.has(name.trim().toLowerCase())
}

export function preferName(...names: Array<string | undefined>): string {
  for (const name of names) {
    const trimmed = name?.trim()
    if (trimmed && !isPlaceholderName(trimmed)) return trimmed
  }
  return names.find((name) => name?.trim())?.trim() ?? 'Unknown place'
}

export function placeNameFromMapsUrl(url?: string): string | undefined {
  if (!url) return undefined

  try {
    const decoded = decodeURIComponent(url.replace(/\+/g, ' '))
    const match = decoded.match(/\/maps\/place\/([^/@?]+)/i)
    if (!match?.[1]) return undefined

    const name = match[1].trim()
    if (!name || name === '.' || /^0x[0-9a-f]+:0x/i.test(name) || /^ChIJ/.test(name)) {
      return undefined
    }
    return name
  } catch {
    return undefined
  }
}

export function campaignDisplayName(campaign: Pick<Campaign, 'title' | 'mapsUrl'>): string {
  return preferName(campaign.title, placeNameFromMapsUrl(campaign.mapsUrl))
}

const COUNTRIES = new Set(
  [
    'united states',
    'usa',
    'us',
    'u.s.',
    'u.s.a.',
    'united kingdom',
    'uk',
    'england',
    'scotland',
    'wales',
    'canada',
    'australia',
    'germany',
    'deutschland',
    'france',
    'spain',
    'españa',
    'italy',
    'italia',
    'poland',
    'polska',
    'ukraine',
    'україна',
    'укр',
    'portugal',
    'netherlands',
    'nederland',
    'belgium',
    'sweden',
    'norway',
    'denmark',
    'finland',
    'ireland',
    'austria',
    'switzerland',
    'czechia',
    'czech republic',
    'slovakia',
    'hungary',
    'romania',
    'bulgaria',
    'greece',
    'turkey',
    'israel',
    'india',
    'japan',
    'china',
    'brazil',
    'mexico',
    'argentina',
    'chile',
    'colombia',
    'south africa',
    'new zealand',
    'singapore',
    'uae',
    'united arab emirates',
  ].map((name) => name.toLowerCase()),
)

export function cityFromAddress(address?: string): string | undefined {
  if (!address?.trim()) return undefined

  const parts = address
    .split(',')
    .map((part) => stripPostalPrefix(part.trim()))
    .filter(Boolean)

  while (parts.length > 1 && isCountryOrAdminArea(parts.at(-1)!)) {
    parts.pop()
  }
  while (parts.length > 1 && isStreetNumber(parts.at(-1)!)) {
    parts.pop()
  }

  const city = parts.at(-1)?.trim()
  if (!city || isCountryOrAdminArea(city)) return undefined
  return city
}

export function campaignCities(campaigns: Array<Pick<Campaign, 'address'>>): string[] {
  const seen = new Set<string>()
  const cities: string[] = []

  for (const campaign of campaigns) {
    const city = cityFromAddress(campaign.address)
    if (!city) continue
    const key = city.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    cities.push(city)
  }

  return cities.sort((left, right) => left.localeCompare(right))
}

export function groupCampaignsByCity(
  campaigns: Campaign[],
  companySort: CompanySort = 'rating-desc',
): Array<{ city: string; campaigns: Campaign[] }> {
  const groups = new Map<string, { city: string; campaigns: Campaign[] }>()
  const unknown: Campaign[] = []

  for (const campaign of campaigns) {
    const city = cityFromAddress(campaign.address)
    if (!city) {
      unknown.push(campaign)
      continue
    }

    const key = city.toLowerCase()
    const existing = groups.get(key)
    if (existing) existing.campaigns.push(campaign)
    else groups.set(key, { city, campaigns: [campaign] })
  }

  for (const group of groups.values()) {
    group.campaigns.sort((left, right) => compareCampaignsByRating(left, right, companySort))
  }

  const sorted = [...groups.values()].sort((left, right) => {
    const ratingCmp = compareCampaignsByRating(left.campaigns[0], right.campaigns[0], companySort)
    if (ratingCmp !== 0) return ratingCmp
    return left.city.localeCompare(right.city)
  })

  if (unknown.length > 0) {
    unknown.sort((left, right) => compareCampaignsByRating(left, right, companySort))
    sorted.push({ city: 'Unknown city', campaigns: unknown })
  }

  return sorted
}

export function sortCampaignsByRating(campaigns: Campaign[], companySort: CompanySort): Campaign[] {
  return [...campaigns].sort((left, right) => compareCampaignsByRating(left, right, companySort))
}

export function compareCampaignsByRating(
  left: Campaign | undefined,
  right: Campaign | undefined,
  companySort: CompanySort,
): number {
  if (!left && !right) return 0
  if (!left) return 1
  if (!right) return -1

  const leftRating = campaignRating(left)
  const rightRating = campaignRating(right)
  if (leftRating == null && rightRating == null) {
    return campaignDisplayName(left).localeCompare(campaignDisplayName(right))
  }
  if (leftRating == null) return 1
  if (rightRating == null) return -1

  const diff =
    companySort === 'rating-asc' ? leftRating - rightRating : rightRating - leftRating
  if (diff !== 0) return diff
  return campaignDisplayName(left).localeCompare(campaignDisplayName(right))
}

function campaignRating(campaign: Campaign): number | undefined {
  return campaign.rating != null && Number.isFinite(campaign.rating) ? campaign.rating : undefined
}

export function campaignMatchesCity(campaign: Pick<Campaign, 'address'>, city: string): boolean {
  if (!city || city === 'all') return true
  return cityFromAddress(campaign.address)?.toLowerCase() === city.toLowerCase()
}

const REGION_PATTERN =
  /\b(oblast|область|обл\.?|province|voivodeship|województwo|krai|kraj|county|region|район|raion|prefecture|governorate|département|departement|kreis|bezirk|autonomous republic|автономна республіка)\b/i

function isCountryOrAdminArea(value: string): boolean {
  const trimmed = value.trim()
  const normalized = trimmed.toLowerCase()
  if (COUNTRIES.has(normalized)) return true
  if (REGION_PATTERN.test(trimmed)) return true
  if (/^[a-z]{2}$/i.test(trimmed)) return true
  if (/^[a-z]{2}\s*\d/i.test(trimmed)) return true
  if (/^\d{4,6}(?:[-\s]\d{2,4})?$/.test(trimmed)) return true
  if (/^[a-z]{1,2}\d[a-z\d]?\s*\d[a-z]{2}$/i.test(trimmed)) return true
  return false
}

function isStreetNumber(value: string): boolean {
  return /^\d+[a-zа-яёіїєґʹ']*$/iu.test(value.trim())
}

function stripPostalPrefix(value: string): string {
  return value.replace(/^\d{2,6}(?:[-\s]\d{2,4})?\s+/, '').trim()
}
