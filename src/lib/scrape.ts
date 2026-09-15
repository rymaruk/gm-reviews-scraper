import { campaignDisplayName } from './place'
import type { Campaign } from './types'

export function wasScrapedToday(lastScrapedAt?: string, now = new Date()): boolean {
  if (!lastScrapedAt) return false
  const scraped = new Date(lastScrapedAt)
  if (Number.isNaN(scraped.getTime())) return false
  return isSameCalendarDay(scraped, now)
}

export function isSameCalendarDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

export function formatScrapedAt(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function scrapeLimitMessage(
  campaign: Pick<Campaign, 'title' | 'mapsUrl' | 'address' | 'lastScrapedAt'>,
): string {
  const address = campaign.address?.trim() || campaignDisplayName(campaign)
  const when = campaign.lastScrapedAt ? formatScrapedAt(campaign.lastScrapedAt) : 'today'
  return `Current ${address} has been scraped at ${when}. Only one scrape per day is allowed.`
}
