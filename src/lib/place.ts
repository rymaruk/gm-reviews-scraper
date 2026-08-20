import type { Campaign } from './types'

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
