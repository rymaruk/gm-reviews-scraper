'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type SVGProps } from 'react'
import Link from 'next/link'
import {
  CalendarDaysIcon,
  DownloadIcon,
  InfoIcon,
  Loader2Icon,
  MessageSquareIcon,
  PercentIcon,
  SearchIcon,
  StarIcon,
  UploadIcon,
} from 'lucide-react'
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
import { ShareCsvImportDialog } from '@/components/share-csv-import-dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { updateCampaignShares } from '@/lib/api'
import { downloadCsv } from '@/lib/csv'
import {
  campaignCities,
  campaignDisplayName,
  campaignMatchesCity,
  groupCampaignsByCity,
} from '@/lib/place'
import {
  daysSinceLastReview,
  formatCampaignRating,
  formatDaysSinceLastReview,
  formatLastReviewDate,
} from '@/lib/reviews'
import {
  clearActiveFilter,
  defaultFilterParams,
  listActiveFilters,
  resetActiveFilters,
  reviewsPageHref,
  type ActiveFilterId,
  type FilterParams,
} from '@/lib/search-params'
import { exportSharesCsv, sharesCsvFilename } from '@/lib/share-csv'
import {
  SHARE_EPSILON,
  SHARE_TOTAL,
  formatShare,
  formatWeightedAverage,
  parseShare,
  roundShare,
  shareWeightedAverage,
  sharesTotal,
} from '@/lib/shares'
import type { Campaign, CampaignReviewStats } from '@/lib/types'
import { cn } from '@/lib/utils'

const AUTOSAVE_MS = 1000

export function MetricsGrid({
  initialCampaigns,
  initialReviewStats,
  initialError,
}: {
  initialCampaigns: Campaign[]
  initialReviewStats: Record<string, CampaignReviewStats>
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

  const parsedShares = campaigns.map((campaign) => parseShare(drafts[campaign.id] ?? ''))
  const numericShares = parsedShares.filter((value): value is number => value != null)
  const invalidRow = parsedShares.some((value) => value == null || value < 0)
  const total = sharesTotal(numericShares)
  const totalOk = !invalidRow && Math.abs(total - SHARE_TOTAL) <= SHARE_EPSILON
  const remaining = roundShare(SHARE_TOTAL - total)
  const dirty = campaigns.some(
    (campaign) => parseShare(drafts[campaign.id] ?? '') !== roundShare(campaign.share),
  )
  const filtersActive = Boolean(filter.trim()) || city !== 'all'
  const weightedRating = shareWeightedAverage(
    campaigns.flatMap((campaign) => {
      const share = parseShare(drafts[campaign.id] ?? '')
      if (share == null || share <= 0 || campaign.rating == null || !Number.isFinite(campaign.rating)) {
        return []
      }
      return [{ share, value: campaign.rating }]
    }),
  )
  const lastReviews = useMemo(
    () =>
      campaigns
        .flatMap((campaign) => {
          const stats = initialReviewStats[campaign.id]
          if (!stats?.lastReviewAt) return []
          return [
            {
              campaignId: campaign.id,
              name: campaignDisplayName(campaign),
              lastReviewAt: stats.lastReviewAt,
              daysAgo: daysSinceLastReview(stats.lastReviewAt),
              snippet: stats.lastSnippet,
              rating: stats.lastRating,
            },
          ]
        })
        .sort((left, right) => right.lastReviewAt.localeCompare(left.lastReviewAt)),
    [campaigns, initialReviewStats],
  )
  const lastReview = lastReviews[0] ?? null
  const totalReviews = campaigns.reduce(
    (sum, campaign) => sum + (initialReviewStats[campaign.id]?.count ?? 0),
    0,
  )

  const persistShares = useCallback(async (nextDrafts: Record<string, string>) => {
    const parsed = campaigns.map((campaign) => ({
      id: campaign.id,
      value: parseShare(nextDrafts[campaign.id] ?? ''),
    }))
    const invalid = parsed.filter((item) => item.value == null || item.value < 0)
    const shares = parsed.flatMap((item) => {
      if (item.value == null || item.value < 0) return []
      const campaign = campaigns.find((row) => row.id === item.id)
      const share = roundShare(item.value)
      if (!campaign || roundShare(campaign.share) === share) return []
      return [{ id: item.id, share }]
    })

    if (shares.length === 0) {
      if (invalid.length > 0) toast.error('Each share must be 0 or greater.')
      return
    }

    setSaving(true)
    try {
      await updateCampaignShares(shares)
      setCampaigns((current) =>
        current.map((campaign) => {
          const next = shares.find((item) => item.id === campaign.id)
          return next ? { ...campaign, share: next.share } : campaign
        }),
      )
      setDrafts((current) => {
        const next = { ...current }
        for (const item of shares) {
          if (current[item.id] === nextDrafts[item.id]) {
            next[item.id] = formatShare(item.share)
          }
        }
        return next
      })
      toast.success('Shares updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save shares.')
    } finally {
      setSaving(false)
    }
  }, [campaigns])

  const persistRef = useRef(persistShares)
  persistRef.current = persistShares

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
    const parsed = parseShare(drafts[id] ?? '')
    if (parsed == null || parsed < 0) return
    const formatted = formatShare(parsed)
    if (formatted === (drafts[id] ?? '')) return
    setDraft(id, formatted)
  }

  function exportCsv() {
    downloadCsv(sharesCsvFilename(), exportSharesCsv(campaigns, drafts))
  }

  function applyImportedShares(shares: Array<{ id: string; share: number }>) {
    setCampaigns((current) =>
      current.map((campaign) => {
        const next = shares.find((item) => item.id === campaign.id)
        return next ? { ...campaign, share: next.share } : campaign
      }),
    )
    setDrafts((current) => {
      const next = { ...current }
      for (const item of shares) {
        next[item.id] = formatShare(item.share)
      }
      return next
    })
  }

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      <AppHeader current="metrics" />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
          <div>
            <MetricsBreadcrumb />
            <h1 className="flex items-center gap-2 font-heading text-3xl font-medium">
              Metrics
              <InfoTip label="Metrics">
                Assign each shop a share of the chain. Weighted rating uses those shares
                (SUMPRODUCT of share and Google Maps rating). Days since last review is today minus
                the newest last-review date.
              </InfoTip>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Assign a share to each shop. Values can be 0 or greater, and the total should be {SHARE_TOTAL}%.
              Each shop saves automatically after you stop typing.
            </p>
          </div>

          {initialError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {initialError}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              Add a shop on the reviews page before setting shares.
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
                  <InfoTip label="Filters">
                    Search and city only hide rows in the list. Share total, weighted rating, days
                    since last review, and review count still include every shop.
                  </InfoTip>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button type="button" variant="outline" onClick={exportCsv}>
                      <DownloadIcon />
                      Export CSV
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setImportOpen(true)}>
                      <UploadIcon />
                      Import CSV
                    </Button>
                    <InfoTip label="CSV">
                      Export downloads Address and Share for every shop. Import matches shops by
                      address and still accepts older Weight column headers.
                    </InfoTip>
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
                <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-muted/90 text-left text-xs tracking-wide text-muted-foreground uppercase backdrop-blur-sm">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Address</th>
                        <th className="w-40 px-4 py-3 font-semibold">Last review</th>
                        <th className="w-36 px-4 py-3 text-right font-semibold">Reviews</th>
                        <th className="sticky top-0 right-0 z-20 w-44 bg-muted/90 px-4 py-3 text-right font-semibold shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.35)]">
                          Share
                        </th>
                      </tr>
                    </thead>
                    {grouped.map((group) => (
                      <tbody key={group.city}>
                        <tr>
                          <th
                            colSpan={4}
                            scope="colgroup"
                            className="border-t bg-muted/50 px-4 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground"
                          >
                            {group.city} ({group.campaigns.length})
                          </th>
                        </tr>
                        {group.campaigns.map((campaign) => {
                          const raw = drafts[campaign.id] ?? ''
                          const parsed = parseShare(raw)
                          const rowInvalid = parsed == null || parsed < 0
                          const name = campaignDisplayName(campaign)
                          const stats = initialReviewStats[campaign.id]
                          const reviewsCount = stats?.count ?? 0
                          const lastReviewAt = stats?.lastReviewAt
                          const daysAgo = lastReviewAt ? daysSinceLastReview(lastReviewAt) : null
                          const rowSaving = saving && lastEditedId === campaign.id
                          return (
                            <tr key={campaign.id} className="border-t">
                              <td className="px-4 py-3 align-top">
                                <p className="font-medium break-all">{name}</p>
                                <p className="mt-0.5 text-xs break-all text-muted-foreground">
                                  {campaign.address ?? campaign.type ?? 'Google Maps place'}
                                </p>
                                {campaign.rating != null ? (
                                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <Stars rating={campaign.rating} />
                                    <span className="tabular-nums text-amber-400">
                                      {formatCampaignRating(campaign.rating)}
                                    </span>
                                  </p>
                                ) : null}
                              </td>
                              <td className="px-4 py-3 align-top">
                                {lastReviewAt ? (
                                  <Link
                                    href={reviewsPageHref(campaign.id)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary underline-offset-4 hover:underline"
                                  >
                                    <p className="tabular-nums">{formatLastReviewDate(lastReviewAt)}</p>
                                    {daysAgo != null ? (
                                      <p className="mt-0.5 text-xs text-muted-foreground">
                                        {formatDaysSinceLastReview(daysAgo)}
                                      </p>
                                    ) : null}
                                    {stats?.lastSnippet ? (
                                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                        {stats.lastSnippet}
                                      </p>
                                    ) : null}
                                  </Link>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 align-top text-right">
                                {reviewsCount > 0 ? (
                                  <Link
                                    href={reviewsPageHref(campaign.id)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-primary tabular-nums underline-offset-4 hover:underline"
                                  >
                                    {reviewsCount} review{reviewsCount === 1 ? '' : 's'}
                                  </Link>
                                ) : (
                                  <span className="text-muted-foreground tabular-nums">0 reviews</span>
                                )}
                              </td>
                              <td className="sticky right-0 bg-background px-4 py-3 align-top shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.25)]">
                                <div className="flex items-center justify-end gap-1.5">
                                  {rowSaving ? (
                                    <Loader2Icon
                                      className="size-4 shrink-0 animate-spin text-muted-foreground"
                                      aria-label="Saving share"
                                    />
                                  ) : null}
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    value={raw}
                                    aria-label={`Share for ${name}`}
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
        <MetricsTotalsPanel
          saving={saving}
          dirty={dirty}
          invalidRow={invalidRow}
          total={total}
          totalOk={totalOk}
          remaining={remaining}
          shops={campaigns.length}
          visibleShops={visible.length}
          filtersActive={filtersActive}
          totalReviews={totalReviews}
          weightedRating={weightedRating}
          lastReview={lastReview}
        />
      ) : null}
      </div>
      <ShareCsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        campaigns={campaigns}
        drafts={drafts}
        onImported={applyImportedShares}
      />
    </div>
  )
}

function draftsFromCampaigns(campaigns: Campaign[]): Record<string, string> {
  return Object.fromEntries(campaigns.map((campaign) => [campaign.id, formatShare(campaign.share)]))
}

type LastReviewItem = {
  campaignId: string
  name: string
  lastReviewAt: string
  daysAgo: number | null
  snippet?: string
  rating?: number
}

function MetricsTotalsPanel({
  saving,
  dirty,
  invalidRow,
  total,
  totalOk,
  remaining,
  shops,
  visibleShops,
  filtersActive,
  totalReviews,
  weightedRating,
  lastReview,
}: {
  saving: boolean
  dirty: boolean
  invalidRow: boolean
  total: number
  totalOk: boolean
  remaining: number
  shops: number
  visibleShops: number
  filtersActive: boolean
  totalReviews: number
  weightedRating: number | null
  lastReview: LastReviewItem | null
}) {
  const shareHint = invalidRow
    ? 'Each share must be 0 or greater.'
    : totalOk
      ? `Target ${SHARE_TOTAL}%`
      : remaining > 0
        ? `${formatShare(remaining)}% remaining`
        : `${formatShare(Math.abs(remaining))}% over`

  return (
    <aside
      className="flex max-h-[42svh] shrink-0 flex-col overflow-hidden border-t bg-sidebar lg:max-h-none lg:h-full lg:w-96 lg:border-t-0 lg:border-l"
      aria-label="Share totals and weighted calculations"
    >
      <div className="flex shrink-0 items-start justify-between gap-2 border-b px-4 py-3">
        <div>
          <h2 className="flex items-center gap-1.5 font-heading text-sm font-medium">
            Totals
            <InfoTip label="Totals" side="left">
              Live results for every shop. Weighted rating is SUMPRODUCT(share, rating) / SUM(share).
              Days since last review is whole days from the newest last review to today.
            </InfoTip>
          </h2>
          <p className="text-[11px] text-muted-foreground">
            SUMPRODUCT(share, value) / Σ share
          </p>
        </div>
        {saving ? (
          <Loader2Icon className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" aria-label="Saving shares" />
        ) : dirty ? (
          <p className="text-[11px] text-muted-foreground">Saving shortly</p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="grid grid-cols-2 gap-2 p-3 lg:grid-cols-1" aria-live="polite">
        <SummaryTile
          icon={PercentIcon}
          label="Share total"
          value={`${formatShare(total)}%`}
          hint={shareHint}
          tone={totalOk || saving ? 'default' : 'danger'}
        />
        <SummaryTile
          icon={MapPinIcon}
          label="Shops"
          value={String(shops)}
          hint={filtersActive ? `Showing ${visibleShops}` : 'All shops'}
        />
        <SummaryTile
          icon={StarIcon}
          iconClassName="fill-amber-400 text-amber-400"
          label="Weighted rating"
          value={weightedRating != null ? formatWeightedAverage(weightedRating) : '—'}
          hint="Google Maps, by share"
          formula="SUMPRODUCT(share, rating) / SUM(share)"
          info="Each shop’s Google Maps rating is multiplied by its share, then those products are added up and divided by the sum of shares. A shop with 40% share counts four times as much as a shop with 10%. Shops with 0% share are skipped."
          highlight
        />
        <WeightedDaysTile lastReview={lastReview} />
        <SummaryTile
          icon={MessageSquareIcon}
          label="Reviews"
          value={String(totalReviews)}
          hint="Scraped reviews"
          className="col-span-2 lg:col-span-1"
        />
      </div>
      </div>
    </aside>
  )
}

function WeightedDaysTile({ lastReview }: { lastReview: LastReviewItem | null }) {
  const days = lastReview?.daysAgo
  const daysLabel = days == null ? '—' : String(Math.max(0, days))
  const todayLabel = formatLastReviewDate(todayIsoDay())

  return (
    <div className="col-span-2 rounded-xl bg-amber-400/15 px-3 py-2 ring-1 ring-amber-400/35 lg:col-span-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <CalendarDaysIcon className="size-3.5 shrink-0" aria-hidden />
        <p className="min-w-0 flex-1 text-[11px] tracking-wide uppercase">Days since last review</p>
        <InfoTip label="Days since last review" side="left">
          Whole calendar days: today minus the date of the newest last review among all shops.
          Today is shown on the right. That last review is shown below.
        </InfoTip>
      </div>
      <div className="mt-0.5 flex items-start justify-between gap-3">
        <div>
          <p className="font-heading text-lg font-medium tabular-nums">{daysLabel}</p>
          <p className="text-[11px] text-muted-foreground">Today − last review</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Today</p>
          <p className="text-sm tabular-nums">{todayLabel}</p>
        </div>
      </div>

      {lastReview ? (
        <Link
          href={reviewsPageHref(lastReview.campaignId)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block min-w-0 border-t border-amber-400/25 pt-2 hover:bg-background/40"
        >
          <p className="truncate text-sm font-medium">{lastReview.name}</p>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {formatLastReviewDate(lastReview.lastReviewAt)}
            {lastReview.daysAgo != null ? ` · ${formatDaysSinceLastReview(lastReview.daysAgo)}` : ''}
            {lastReview.rating != null ? ` · ${formatCampaignRating(lastReview.rating)}★` : ''}
          </p>
          {lastReview.snippet ? (
            <p className="mt-0.5 line-clamp-3 text-[11px] text-muted-foreground">{lastReview.snippet}</p>
          ) : (
            <p className="mt-0.5 text-[11px] text-muted-foreground">No review text.</p>
          )}
        </Link>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">No last review stored yet.</p>
      )}
    </div>
  )
}

function SummaryTile({
  label,
  value,
  hint,
  formula,
  info,
  icon: Icon,
  iconClassName,
  highlight = false,
  tone = 'default',
  className,
}: {
  label: string
  value: string
  hint?: string
  formula?: string
  info?: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  iconClassName?: string
  highlight?: boolean
  tone?: 'default' | 'danger'
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl px-3 py-2 ring-1',
        highlight ? 'bg-amber-400/15 ring-amber-400/35' : 'bg-background/70 ring-foreground/5',
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className={cn('size-3.5 shrink-0', iconClassName)} aria-hidden />
        <p className="min-w-0 flex-1 text-[11px] tracking-wide uppercase">{label}</p>
        {info ? (
          <InfoTip label={label} side="left">
            {info}
          </InfoTip>
        ) : null}
      </div>
      <p
        className={cn(
          'mt-0.5 font-heading text-lg font-medium tabular-nums',
          tone === 'danger' && 'text-destructive',
        )}
      >
        {value}
      </p>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      {formula ? <p className="text-[11px] text-muted-foreground">{formula}</p> : null}
    </div>
  )
}

function todayIsoDay(now = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function InfoTip({
  label,
  children,
  side = 'bottom',
}: {
  label: string
  children: string
  side?: 'top' | 'right' | 'bottom' | 'left'
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground normal-case hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          aria-label={`About ${label}`}
        >
          <InfoIcon className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        align="start"
        className="max-w-64 text-left leading-relaxed whitespace-normal"
      >
        {children}
      </TooltipContent>
    </Tooltip>
  )
}
