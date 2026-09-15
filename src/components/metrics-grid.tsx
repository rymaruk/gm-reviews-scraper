'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DownloadIcon, Loader2Icon, SearchIcon, UploadIcon } from 'lucide-react'
import { toast } from 'sonner'

import { ActiveFiltersPanel } from '@/components/active-filters-panel'
import { AppHeader } from '@/components/app-nav'
import { MetricsBreadcrumb } from '@/components/metrics-breadcrumb'
import { Stars } from '@/components/stars'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { WeightCsvImportDialog } from '@/components/weight-csv-import-dialog'
import { updateCampaignWeights } from '@/lib/api'
import { downloadCsv } from '@/lib/csv'
import {
  campaignCities,
  campaignDisplayName,
  campaignMatchesCity,
  groupCampaignsByCity,
} from '@/lib/place'
import { formatCampaignRating } from '@/lib/reviews'
import {
  clearActiveFilter,
  defaultFilterParams,
  listActiveFilters,
  resetActiveFilters,
  type ActiveFilterId,
  type FilterParams,
} from '@/lib/search-params'
import type { Campaign } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  WEIGHT_EPSILON,
  WEIGHT_TOTAL,
  formatWeight,
  parseWeight,
  roundWeight,
  weightsTotal,
} from '@/lib/weights'
import { exportWeightsCsv, weightsCsvFilename } from '@/lib/weight-csv'

const AUTOSAVE_MS = 1000

export function MetricsGrid({
  initialCampaigns,
  initialError,
}: {
  initialCampaigns: Campaign[]
  initialError: string | null
}) {
  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [drafts, setDrafts] = useState<Record<string, string>>(() => draftsFromCampaigns(initialCampaigns))
  const [filter, setFilter] = useState('')
  const [city, setCity] = useState('all')
  const [saving, setSaving] = useState(false)
  const [lastEditedId, setLastEditedId] = useState<string | null>(null)
  const [editVersion, setEditVersion] = useState(0)
  const draftsRef = useRef(drafts)
  draftsRef.current = drafts
  const [importOpen, setImportOpen] = useState(false)
  const cities = useMemo(() => campaignCities(campaigns), [campaigns])
  const visible = useMemo(() => {
    const query = filter.trim().toLowerCase()
    return campaigns.filter((campaign) => {
      if (!campaignMatchesCity(campaign, city)) return false
      if (!query) return true
      const name = campaignDisplayName(campaign).toLowerCase()
      const address = (campaign.address ?? '').toLowerCase()
      return name.includes(query) || address.includes(query)
    })
  }, [campaigns, city, filter])
  const grouped = useMemo(() => groupCampaignsByCity(visible), [visible])
  const currentFilters = useMemo(
    () => ({ ...defaultFilterParams, query: filter, city }),
    [filter, city],
  )
  const activeFilterChips = useMemo(() => listActiveFilters(currentFilters), [currentFilters])

  function applyMetricFilters(next: FilterParams) {
    setFilter(next.query)
    setCity(next.city)
  }

  function clearActiveFilterChip(id: ActiveFilterId) {
    applyMetricFilters(clearActiveFilter(currentFilters, id))
  }

  function resetAllFilters() {
    applyMetricFilters(resetActiveFilters())
  }

  const parsedWeights = campaigns.map((campaign) => parseWeight(drafts[campaign.id] ?? ''))
  const numericWeights = parsedWeights.filter((value): value is number => value != null)
  const invalidRow = parsedWeights.some((value) => value == null || value < 0)
  const total = weightsTotal(numericWeights)
  const totalOk = !invalidRow && Math.abs(total - WEIGHT_TOTAL) <= WEIGHT_EPSILON
  const remaining = roundWeight(WEIGHT_TOTAL - total)
  const dirty = campaigns.some(
    (campaign) => parseWeight(drafts[campaign.id] ?? '') !== roundWeight(campaign.weight),
  )
  const filtersActive = Boolean(filter.trim()) || city !== 'all'

  const persistWeights = useCallback(async (nextDrafts: Record<string, string>) => {
    const parsed = campaigns.map((campaign) => ({
      id: campaign.id,
      value: parseWeight(nextDrafts[campaign.id] ?? ''),
    }))
    const invalid = parsed.filter((item) => item.value == null || item.value < 0)
    const weights = parsed.flatMap((item) => {
      if (item.value == null || item.value < 0) return []
      const campaign = campaigns.find((row) => row.id === item.id)
      const weight = roundWeight(item.value)
      if (!campaign || roundWeight(campaign.weight) === weight) return []
      return [{ id: item.id, weight }]
    })

    if (weights.length === 0) {
      if (invalid.length > 0) toast.error('Each weight must be 0 or greater.')
      return
    }

    setSaving(true)
    try {
      await updateCampaignWeights(weights)
      setCampaigns((current) =>
        current.map((campaign) => {
          const next = weights.find((item) => item.id === campaign.id)
          return next ? { ...campaign, weight: next.weight } : campaign
        }),
      )
      setDrafts((current) => {
        const next = { ...current }
        for (const item of weights) {
          if (current[item.id] === nextDrafts[item.id]) {
            next[item.id] = formatWeight(item.weight)
          }
        }
        return next
      })
      toast.success('Weights updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save weights.')
    } finally {
      setSaving(false)
    }
  }, [campaigns])

  const persistRef = useRef(persistWeights)
  persistRef.current = persistWeights

  useEffect(() => {
    if (editVersion === 0) return

    const timer = window.setTimeout(() => {
      void persistRef.current(draftsRef.current)
    }, AUTOSAVE_MS)

    return () => window.clearTimeout(timer)
  }, [editVersion])

  function setDraft(id: string, value: string) {
    setLastEditedId(id)
    setDrafts((current) => ({ ...current, [id]: value }))
    setEditVersion((current) => current + 1)
  }

  function commitDraft(id: string) {
    const parsed = parseWeight(drafts[id] ?? '')
    if (parsed == null || parsed < 0) return
    const formatted = formatWeight(parsed)
    if (formatted === (drafts[id] ?? '')) return
    setDraft(id, formatted)
  }

  function exportCsv() {
    downloadCsv(weightsCsvFilename(), exportWeightsCsv(campaigns, drafts))
  }

  function applyImportedWeights(weights: Array<{ id: string; weight: number }>) {
    setCampaigns((current) =>
      current.map((campaign) => {
        const next = weights.find((item) => item.id === campaign.id)
        return next ? { ...campaign, weight: next.weight } : campaign
      }),
    )
    setDrafts((current) => {
      const next = { ...current }
      for (const item of weights) {
        next[item.id] = formatWeight(item.weight)
      }
      return next
    })
  }

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      <AppHeader current="metrics" />

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
          <div>
            <MetricsBreadcrumb />
            <h1 className="font-heading text-3xl font-medium">Metrics</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Assign a weight to each shop. Values can be 0 or greater, and the total should be {WEIGHT_TOTAL}%.
              Each shop saves automatically after you stop typing.
            </p>
          </div>

          {initialError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {initialError}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              Add a shop on the reviews page before setting weights.
            </div>
          ) : (
            <>
              <div className="sticky top-0 z-20 flex flex-col gap-3 bg-background/95 py-3 backdrop-blur-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="relative min-w-0 flex-1">
                    <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={filter}
                      onChange={(event) => setFilter(event.target.value)}
                      placeholder="Filter by name or address"
                      className="pl-8"
                      aria-label="Filter shops by name or address"
                    />
                  </div>
                  <Select value={city} onValueChange={setCity} disabled={cities.length === 0}>
                    <SelectTrigger className="w-full sm:w-48" aria-label="Filter by city">
                      <SelectValue placeholder="All cities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All cities</SelectItem>
                      {cities.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button type="button" variant="outline" onClick={exportCsv}>
                      <DownloadIcon />
                      Export CSV
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setImportOpen(true)}>
                      <UploadIcon />
                      Import CSV
                    </Button>
                  </div>
                </div>
                <ActiveFiltersPanel
                  chips={activeFilterChips}
                  onClear={clearActiveFilterChip}
                  onReset={resetAllFilters}
                />
              </div>

              {visible.length === 0 ? (
                <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                  No shops match that name, address, or city.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-muted/90 text-left text-xs tracking-wide text-muted-foreground uppercase backdrop-blur-sm">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Address</th>
                        <th className="w-44 px-4 py-3 text-right font-semibold">Weight</th>
                      </tr>
                    </thead>
                    {grouped.map((group) => (
                      <tbody key={group.city}>
                        <tr>
                          <th
                            colSpan={2}
                            scope="colgroup"
                            className="border-t bg-muted/50 px-4 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground"
                          >
                            {group.city} ({group.campaigns.length})
                          </th>
                        </tr>
                        {group.campaigns.map((campaign) => {
                          const raw = drafts[campaign.id] ?? ''
                          const parsed = parseWeight(raw)
                          const rowInvalid = parsed == null || parsed < 0
                          const name = campaignDisplayName(campaign)
                          const reviewsCount = campaign.reviewsCount ?? 0
                          const rowSaving = saving && lastEditedId === campaign.id
                          return (
                            <tr key={campaign.id} className="border-t">
                              <td className="px-4 py-3 align-top">
                                <p className="font-medium break-all">{name}</p>
                                <p className="mt-0.5 text-xs break-all text-muted-foreground">
                                  {campaign.address ?? campaign.type ?? 'Google Maps place'}
                                </p>
                                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  {campaign.rating != null ? (
                                    <>
                                      <Stars rating={campaign.rating} />
                                      <span className="tabular-nums text-amber-400">
                                        {formatCampaignRating(campaign.rating)}
                                      </span>
                                      <span className="h-3 w-px shrink-0 bg-border" aria-hidden="true" />
                                    </>
                                  ) : null}
                                  <span>
                                    {reviewsCount} review{reviewsCount === 1 ? '' : 's'}
                                  </span>
                                </p>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="flex items-center justify-end gap-1.5">
                                  {rowSaving ? (
                                    <Loader2Icon
                                      className="size-4 shrink-0 animate-spin text-muted-foreground"
                                      aria-label="Saving weight"
                                    />
                                  ) : null}
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    value={raw}
                                    aria-label={`Weight for ${name}`}
                                    aria-invalid={rowInvalid}
                                    className="w-24 text-right tabular-nums"
                                    onChange={(event) => setDraft(campaign.id, event.target.value)}
                                    onBlur={() => commitDraft(campaign.id)}
                                  />
                                  <span className="w-4 text-xs text-muted-foreground">%</span>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    ))}
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {campaigns.length > 0 && !initialError ? (
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-t bg-sidebar px-4 py-3">
          {saving ? (
            <Loader2Icon className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
          ) : null}
          <p
            className={cn(
              'text-sm tabular-nums',
              totalOk || saving ? 'text-muted-foreground' : 'text-destructive',
            )}
            aria-live="polite"
          >
            {saving
              ? 'Saving weights…'
              : invalidRow
                ? 'Each weight must be 0 or greater.'
                : `${
                    totalOk
                      ? `Total: ${WEIGHT_TOTAL}%`
                      : remaining > 0
                        ? `Total: ${formatWeight(total)}% (${formatWeight(remaining)}% remaining)`
                        : `Total: ${formatWeight(total)}% (${formatWeight(Math.abs(remaining))}% over)`
                  }${dirty ? ' · Saving shortly' : ''}`}
            {filtersActive ? ` · Showing ${visible.length} of ${campaigns.length}` : null}
          </p>
        </div>
      ) : null}
      <WeightCsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        campaigns={campaigns}
        drafts={drafts}
        onImported={applyImportedWeights}
      />
    </div>
  )
}

function draftsFromCampaigns(campaigns: Campaign[]): Record<string, string> {
  return Object.fromEntries(campaigns.map((campaign) => [campaign.id, formatWeight(campaign.weight)]))
}
