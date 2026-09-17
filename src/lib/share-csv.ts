import { parseCsv, stringifyCsv } from '@/lib/csv'
import { campaignDisplayName, groupCampaignsByCity, normalizeAddress } from '@/lib/place'
import type { Campaign } from '@/lib/types'
import { formatShare, parseShare, roundShare, validateShares } from '@/lib/shares'

const ADDRESS_HEADERS = ['address', 'campaign address']
const SHARE_HEADERS = [
  'share',
  'shares',
  'current shares',
  'current share',
  'доля магазину',
  'weight',
  'current weights',
  'current weight',
  'weights',
]

export type ShareImportStatus =
  | 'updated'
  | 'unchanged'
  | 'not_found'
  | 'invalid_share'
  | 'duplicate'
  | 'empty_address'
  | 'ambiguous'
  | 'blocked'

export type ShareImportRow = {
  line: number
  address: string
  share: string
  status: ShareImportStatus
  reason: string
  campaignId?: string
}

export type ShareImportPlan = {
  parseError?: string
  rows: ShareImportRow[]
  shares: Array<{ id: string; share: number }>
  validation: ReturnType<typeof validateShares>
  changedCount: number
  canSave: boolean
}

export function campaignExportAddress(campaign: Pick<Campaign, 'address' | 'title' | 'mapsUrl'>): string {
  const address = campaign.address?.trim()
  if (address) return address
  return campaignDisplayName(campaign)
}

export function sharesCsvFilename(now = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}-cc_shops_shares.csv`
}

export function exportSharesCsv(
  campaigns: Campaign[],
  drafts?: Record<string, string>,
): string {
  const rows: Array<Array<string | number>> = [['Address', 'Share']]
  for (const group of groupCampaignsByCity(campaigns)) {
    for (const campaign of group.campaigns) {
      rows.push([campaignExportAddress(campaign), currentShare(campaign, drafts)])
    }
  }
  return stringifyCsv(rows)
}

export type ShareCsvRecord = {
  line: number
  address: string
  share: string
}

export function parseShareCsvRows(csvText: string): {
  parseError?: string
  records: ShareCsvRecord[]
} {
  const table = parseCsv(csvText)
  if (table.length === 0) {
    return { parseError: 'CSV is empty.', records: [] }
  }

  const headers = table[0].map((cell) => normalizeHeader(cell))
  const addressIndex = headerIndex(headers, ADDRESS_HEADERS)
  const shareIndex = headerIndex(headers, SHARE_HEADERS)
  if (addressIndex < 0 || shareIndex < 0) {
    return { parseError: 'CSV must include Address and Share columns.', records: [] }
  }

  return {
    records: table.slice(1).map((cells, offset) => ({
      line: offset + 2,
      address: (cells[addressIndex] ?? '').trim(),
      share: (cells[shareIndex] ?? '').trim(),
    })),
  }
}

export function createShareImportState(
  campaigns: Campaign[],
  drafts?: Record<string, string>,
) {
  const index = indexCampaigns(campaigns)
  const seen = new Map<string, number>()
  const nextShares = new Map(
    campaigns.map((campaign) => [campaign.id, currentNumericShare(campaign, drafts)]),
  )

  function process(record: ShareCsvRecord): ShareImportRow {
    const { line, address, share: shareRaw } = record
    if (!address) {
      return {
        line,
        address,
        share: shareRaw,
        status: 'empty_address',
        reason: 'Missing address.',
      }
    }

    const key = normalizeAddress(address)
    const previousLine = seen.get(key)
    if (previousLine != null) {
      return {
        line,
        address,
        share: shareRaw,
        status: 'duplicate',
        reason: `Duplicate address (already seen on row ${previousLine}).`,
      }
    }
    seen.set(key, line)

    const share = parseCsvShare(shareRaw)
    if (share == null || share < 0) {
      return {
        line,
        address,
        share: shareRaw,
        status: 'invalid_share',
        reason: 'Share must be 0 or greater.',
      }
    }

    const matches = index.get(key) ?? []
    if (matches.length === 0) {
      return {
        line,
        address,
        share: shareRaw,
        status: 'not_found',
        reason: 'Address was not found.',
      }
    }
    if (matches.length > 1) {
      return {
        line,
        address,
        share: shareRaw,
        status: 'ambiguous',
        reason: 'Multiple shops share this address.',
      }
    }

    const campaign = matches[0]
    const rounded = roundShare(share)
    const unchanged = rounded === nextShares.get(campaign.id)
    nextShares.set(campaign.id, rounded)
    return {
      line,
      address,
      share: formatShare(rounded),
      status: unchanged ? 'unchanged' : 'updated',
      reason: unchanged ? 'Share already matches.' : 'Updated.',
      campaignId: campaign.id,
    }
  }

  function finish(rows: ShareImportRow[]): ShareImportPlan {
    const merged = campaigns.map((campaign) => ({
      id: campaign.id,
      share: nextShares.get(campaign.id) ?? 0,
    }))
    const validation = validateShares(merged.map((item) => item.share))
    const shares = rows
      .filter((row) => row.status === 'updated' && row.campaignId)
      .map((row) => ({
        id: row.campaignId as string,
        share: nextShares.get(row.campaignId as string) ?? 0,
      }))
    return {
      rows,
      shares,
      validation,
      changedCount: shares.length,
      canSave: shares.length > 0,
    }
  }

  return { process, finish }
}

export function planShareImport(
  campaigns: Campaign[],
  csvText: string,
  drafts?: Record<string, string>,
): ShareImportPlan {
  const parsed = parseShareCsvRows(csvText)
  if (parsed.parseError) return emptyImportPlan(parsed.parseError)
  const importer = createShareImportState(campaigns, drafts)
  const rows = parsed.records.map((record) => importer.process(record))
  return importer.finish(rows)
}

export function importCounts(rows: ShareImportRow[]): { updated: number; notUpdated: number } {
  const updated = rows.filter((row) => row.status === 'updated').length
  return { updated, notUpdated: rows.length - updated }
}

export function statusLabel(status: ShareImportStatus): string {
  switch (status) {
    case 'updated':
      return 'Updated'
    case 'unchanged':
      return 'Unchanged'
    case 'not_found':
      return 'Not found'
    case 'invalid_share':
      return 'Invalid share'
    case 'duplicate':
      return 'Duplicate'
    case 'empty_address':
      return 'Missing address'
    case 'ambiguous':
      return 'Ambiguous'
    case 'blocked':
      return 'Not saved'
  }
}

export function emptyImportPlan(parseError: string): ShareImportPlan {
  return {
    parseError,
    rows: [],
    shares: [],
    validation: { ok: false, total: 0, error: parseError },
    changedCount: 0,
    canSave: false,
  }
}

function indexCampaigns(campaigns: Campaign[]): Map<string, Campaign[]> {
  const index = new Map<string, Campaign[]>()
  for (const campaign of campaigns) {
    const address = campaign.address?.trim()
    const key = normalizeAddress(address || campaignDisplayName(campaign))
    const list = index.get(key) ?? []
    list.push(campaign)
    index.set(key, list)
  }
  return index
}

function currentShare(campaign: Campaign, drafts?: Record<string, string>): string {
  return formatShare(currentNumericShare(campaign, drafts))
}

function currentNumericShare(campaign: Campaign, drafts?: Record<string, string>): number {
  if (drafts && Object.prototype.hasOwnProperty.call(drafts, campaign.id)) {
    const parsed = parseCsvShare(drafts[campaign.id] ?? '')
    if (parsed != null && parsed >= 0) return roundShare(parsed)
  }
  return roundShare(campaign.share)
}

function parseCsvShare(raw: string): number | null {
  return parseShare(raw.replace(/%/g, ''))
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, ' ')
}

function headerIndex(headers: string[], aliases: string[]): number {
  return aliases.reduce((found, alias) => (found >= 0 ? found : headers.indexOf(alias)), -1)
}
