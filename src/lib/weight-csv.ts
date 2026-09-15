import { parseCsv, stringifyCsv } from '@/lib/csv'
import { campaignDisplayName, groupCampaignsByCity, normalizeAddress } from '@/lib/place'
import type { Campaign } from '@/lib/types'
import { formatWeight, parseWeight, roundWeight, validateWeights } from '@/lib/weights'

const ADDRESS_HEADERS = ['address', 'campaign address']
const WEIGHT_HEADERS = ['weight', 'current weights', 'current weight', 'weights']

export type WeightImportStatus =
  | 'updated'
  | 'unchanged'
  | 'not_found'
  | 'invalid_weight'
  | 'duplicate'
  | 'empty_address'
  | 'ambiguous'
  | 'blocked'

export type WeightImportRow = {
  line: number
  address: string
  weight: string
  status: WeightImportStatus
  reason: string
  campaignId?: string
}

export type WeightImportPlan = {
  parseError?: string
  rows: WeightImportRow[]
  weights: Array<{ id: string; weight: number }>
  validation: ReturnType<typeof validateWeights>
  changedCount: number
  canSave: boolean
}

export function campaignExportAddress(campaign: Pick<Campaign, 'address' | 'title' | 'mapsUrl'>): string {
  const address = campaign.address?.trim()
  if (address) return address
  return campaignDisplayName(campaign)
}

export function weightsCsvFilename(now = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}-cc_shops_weights.csv`
}

export function exportWeightsCsv(
  campaigns: Campaign[],
  drafts?: Record<string, string>,
): string {
  const rows: Array<Array<string | number>> = [['Address', 'Weight']]
  for (const group of groupCampaignsByCity(campaigns)) {
    for (const campaign of group.campaigns) {
      rows.push([campaignExportAddress(campaign), currentWeight(campaign, drafts)])
    }
  }
  return stringifyCsv(rows)
}

export type WeightCsvRecord = {
  line: number
  address: string
  weight: string
}

export function parseWeightCsvRows(csvText: string): {
  parseError?: string
  records: WeightCsvRecord[]
} {
  const table = parseCsv(csvText)
  if (table.length === 0) {
    return { parseError: 'CSV is empty.', records: [] }
  }

  const headers = table[0].map((cell) => normalizeHeader(cell))
  const addressIndex = headerIndex(headers, ADDRESS_HEADERS)
  const weightIndex = headerIndex(headers, WEIGHT_HEADERS)
  if (addressIndex < 0 || weightIndex < 0) {
    return { parseError: 'CSV must include Address and Weight columns.', records: [] }
  }

  return {
    records: table.slice(1).map((cells, offset) => ({
      line: offset + 2,
      address: (cells[addressIndex] ?? '').trim(),
      weight: (cells[weightIndex] ?? '').trim(),
    })),
  }
}

export function createWeightImportState(
  campaigns: Campaign[],
  drafts?: Record<string, string>,
) {
  const index = indexCampaigns(campaigns)
  const seen = new Map<string, number>()
  const nextWeights = new Map(
    campaigns.map((campaign) => [campaign.id, currentNumericWeight(campaign, drafts)]),
  )

  function process(record: WeightCsvRecord): WeightImportRow {
    const { line, address, weight: weightRaw } = record
    if (!address) {
      return {
        line,
        address,
        weight: weightRaw,
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
        weight: weightRaw,
        status: 'duplicate',
        reason: `Duplicate address (already seen on row ${previousLine}).`,
      }
    }
    seen.set(key, line)

    const weight = parseCsvWeight(weightRaw)
    if (weight == null || weight < 0) {
      return {
        line,
        address,
        weight: weightRaw,
        status: 'invalid_weight',
        reason: 'Weight must be 0 or greater.',
      }
    }

    const matches = index.get(key) ?? []
    if (matches.length === 0) {
      return {
        line,
        address,
        weight: weightRaw,
        status: 'not_found',
        reason: 'Address was not found.',
      }
    }
    if (matches.length > 1) {
      return {
        line,
        address,
        weight: weightRaw,
        status: 'ambiguous',
        reason: 'Multiple shops share this address.',
      }
    }

    const campaign = matches[0]
    const rounded = roundWeight(weight)
    const unchanged = rounded === nextWeights.get(campaign.id)
    nextWeights.set(campaign.id, rounded)
    return {
      line,
      address,
      weight: formatWeight(rounded),
      status: unchanged ? 'unchanged' : 'updated',
      reason: unchanged ? 'Weight already matches.' : 'Updated.',
      campaignId: campaign.id,
    }
  }

  function finish(rows: WeightImportRow[]): WeightImportPlan {
    const merged = campaigns.map((campaign) => ({
      id: campaign.id,
      weight: nextWeights.get(campaign.id) ?? 0,
    }))
    const validation = validateWeights(merged.map((item) => item.weight))
    const weights = rows
      .filter((row) => row.status === 'updated' && row.campaignId)
      .map((row) => ({
        id: row.campaignId as string,
        weight: nextWeights.get(row.campaignId as string) ?? 0,
      }))
    return {
      rows,
      weights,
      validation,
      changedCount: weights.length,
      canSave: weights.length > 0,
    }
  }

  return { process, finish }
}

export function planWeightImport(
  campaigns: Campaign[],
  csvText: string,
  drafts?: Record<string, string>,
): WeightImportPlan {
  const parsed = parseWeightCsvRows(csvText)
  if (parsed.parseError) return emptyImportPlan(parsed.parseError)
  const importer = createWeightImportState(campaigns, drafts)
  const rows = parsed.records.map((record) => importer.process(record))
  return importer.finish(rows)
}

export function importCounts(rows: WeightImportRow[]): { updated: number; notUpdated: number } {
  const updated = rows.filter((row) => row.status === 'updated').length
  return { updated, notUpdated: rows.length - updated }
}

export function statusLabel(status: WeightImportStatus): string {
  switch (status) {
    case 'updated':
      return 'Updated'
    case 'unchanged':
      return 'Unchanged'
    case 'not_found':
      return 'Not found'
    case 'invalid_weight':
      return 'Invalid weight'
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

export function emptyImportPlan(parseError: string): WeightImportPlan {
  return {
    parseError,
    rows: [],
    weights: [],
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

function currentWeight(campaign: Campaign, drafts?: Record<string, string>): string {
  return formatWeight(currentNumericWeight(campaign, drafts))
}

function currentNumericWeight(campaign: Campaign, drafts?: Record<string, string>): number {
  if (drafts && Object.prototype.hasOwnProperty.call(drafts, campaign.id)) {
    const parsed = parseCsvWeight(drafts[campaign.id] ?? '')
    if (parsed != null && parsed >= 0) return roundWeight(parsed)
  }
  return roundWeight(campaign.weight)
}

function parseCsvWeight(raw: string): number | null {
  return parseWeight(raw.replace(/%/g, ''))
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, ' ')
}

function headerIndex(headers: string[], aliases: string[]): number {
  return aliases.reduce((found, alias) => (found >= 0 ? found : headers.indexOf(alias)), -1)
}
