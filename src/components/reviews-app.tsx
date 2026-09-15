'use client'

import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react'
import { toast } from 'sonner'

import { AddCampaignDialog } from '@/components/add-campaign-dialog'
import { ActiveFiltersPanel } from '@/components/active-filters-panel'
import { CampaignSidebar } from '@/components/campaign-sidebar'
import { FiltersBar } from '@/components/filters-bar'
import { ReviewFeed } from '@/components/review-feed'
import {
  ScrapeProgressDialog,
  type ScrapeDialogState,
} from '@/components/scrape-progress-dialog'
import {
  deleteCampaign as deleteCampaignApi,
  fetchReviewsPage,
  fetchStore,
  patchCampaign,
  resolvePlace,
} from '@/lib/api'
import { campaignCities, campaignDisplayName, campaignMatchesCity, groupCampaignsByCity, placeNameFromMapsUrl, preferName } from '@/lib/place'
import { filterReviews, mergeReviews, reviewsToCsv } from '@/lib/reviews'
import { formatScrapedAt, scrapeLimitMessage, wasScrapedToday } from '@/lib/scrape'
import {
  clearActiveFilter,
  listActiveFilters,
  readFilterParams,
  resetActiveFilters,
  writeFilterParams,
  type ActiveFilterId,
  type FilterParams,
} from '@/lib/search-params'
import type { Campaign, CompanySort, RatingFilter, SortOption, StoredReview, TimeRange } from '@/lib/types'

const MAX_PAGES = 25

export function ReviewsApp({
  initialCampaigns,
  initialReviews,
  initialFilters,
  initialConfigError,
}: {
  initialCampaigns: Campaign[]
  initialReviews: StoredReview[]
  initialFilters: FilterParams
  initialConfigError: string | null
}) {
  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [reviews, setReviews] = useState(initialReviews)
  const [activeId, setActiveId] = useState(initialFilters.company)
  const [query, setQuery] = useState(initialFilters.query)
  const [rating, setRating] = useState<RatingFilter>(initialFilters.rating)
  const [sort, setSort] = useState<SortOption>(initialFilters.sort)
  const [companySort, setCompanySort] = useState<CompanySort>(initialFilters.companySort)
  const [timeRange, setTimeRange] = useState<TimeRange>(initialFilters.timeRange)
  const [fromDate, setFromDate] = useState(initialFilters.fromDate)
  const [toDate, setToDate] = useState(initialFilters.toDate)
  const [city, setCity] = useState(initialFilters.city)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [configError] = useState(initialConfigError)
  const [scrapeDialog, setScrapeDialog] = useState<ScrapeDialogState>({ status: 'idle' })
  const [storeRevision, setStoreRevision] = useState(0)
  const feedRef = useRef<HTMLDivElement>(null)
  const scrolledFromUrl = useRef(false)
  const scrollingToRef = useRef<string | null>(null)

  const reloadStore = useCallback(async () => {
    const store = await fetchStore()
    setCampaigns(store.campaigns)
    setReviews(store.reviews)
    setStoreRevision((current) => current + 1)
    return store
  }, [])

  useEffect(() => {
    writeFilterParams({
      query,
      rating,
      sort,
      companySort,
      timeRange,
      fromDate,
      toDate,
      company: activeId,
      city,
    })
  }, [query, rating, sort, companySort, timeRange, fromDate, toDate, activeId, city])

  useEffect(() => {
    function onPopState() {
      const next = readFilterParams()
      setQuery(next.query)
      setRating(next.rating)
      setSort(next.sort)
      setCompanySort(next.companySort)
      setTimeRange(next.timeRange)
      setFromDate(next.fromDate)
      setToDate(next.toDate)
      setActiveId(next.company)
      setCity(next.city)
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (scrolledFromUrl.current || activeId === 'all' || campaigns.length === 0) return
    scrolledFromUrl.current = true
    scrollingToRef.current = activeId
    window.requestAnimationFrame(() => {
      document.getElementById(`company-${activeId}`)?.scrollIntoView({
        behavior: 'auto',
        block: 'start',
      })
    })
  }, [campaigns, activeId])

  const reviewCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const review of reviews) {
      counts[review.campaignId] = (counts[review.campaignId] ?? 0) + 1
    }
    return counts
  }, [reviews])

  const cities = useMemo(() => campaignCities(campaigns), [campaigns])

  useEffect(() => {
    if (city === 'all') return
    if (!cities.some((name) => name.toLowerCase() === city.toLowerCase())) {
      setCity('all')
    }
  }, [cities, city])

  const visibleCampaigns = useMemo(
    () =>
      groupCampaignsByCity(
        campaigns.filter((campaign) => campaignMatchesCity(campaign, city)),
        companySort,
      ).flatMap((group) => group.campaigns),
    [campaigns, city, companySort],
  )

  useEffect(() => {
    if (activeId === 'all') return
    if (!visibleCampaigns.some((campaign) => campaign.id === activeId)) {
      setActiveId('all')
    }
  }, [visibleCampaigns, activeId])

  const visibleReviews = useMemo(
    () =>
      filterReviews(reviews, visibleCampaigns, {
        query,
        rating,
        sort,
        timeRange,
        fromDate,
        toDate,
      }),
    [reviews, visibleCampaigns, query, rating, sort, timeRange, fromDate, toDate],
  )

  const lastScrapedAt = useMemo(() => {
    const relevant =
      activeId === 'all'
        ? visibleCampaigns
        : visibleCampaigns.filter((campaign) => campaign.id === activeId)
    const timestamps = relevant
      .map((campaign) => campaign.lastScrapedAt)
      .filter((value): value is string => Boolean(value))
      .map((value) => Date.parse(value))
      .filter((value) => !Number.isNaN(value))
    if (timestamps.length === 0) return undefined
    return new Date(Math.max(...timestamps))
  }, [visibleCampaigns, activeId])

  const currentFilters = useMemo<FilterParams>(
    () => ({
      query,
      rating,
      sort,
      companySort,
      timeRange,
      fromDate,
      toDate,
      company: activeId,
      city,
    }),
    [query, rating, sort, companySort, timeRange, fromDate, toDate, activeId, city],
  )

  const activeFilterChips = useMemo(() => {
    const campaign = activeId === 'all' ? undefined : campaigns.find((item) => item.id === activeId)
    return listActiveFilters(currentFilters, {
      company: campaign ? campaignDisplayName(campaign) : undefined,
    })
  }, [activeId, campaigns, currentFilters])

  const applyFilters = useCallback(
    (next: FilterParams) => {
      startTransition(() => {
        setQuery(next.query)
        setRating(next.rating)
        setSort(next.sort)
        setCompanySort(next.companySort)
        setTimeRange(next.timeRange)
        setFromDate(next.fromDate)
        setToDate(next.toDate)
        setActiveId(next.company)
        setCity(next.city)
      })
      if (next.company === 'all') {
        scrollingToRef.current = 'all'
        feedRef.current?.scrollTo({ top: 0, behavior: 'auto' })
      }
    },
    [],
  )

  async function clearActiveFilterChip(id: ActiveFilterId) {
    applyFilters(clearActiveFilter(currentFilters, id))
  }

  async function resetAllFilters() {
    applyFilters(resetActiveFilters())
  }

  useEffect(() => {
    const root = feedRef.current
    if (!root) return

    const scroller = root
    let frame = 0

    function syncActiveFromScroll() {
      if (scrollingToRef.current === 'all') {
        if (scroller.scrollTop > 16) return
        scrollingToRef.current = null
        return
      }

      if (scrollingToRef.current) {
        const target = document.getElementById(`company-${scrollingToRef.current}`)
        if (target) {
          const offset = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top
          if (Math.abs(offset) > 64) return
        }
        scrollingToRef.current = null
      }

      const sections = [...scroller.querySelectorAll<HTMLElement>('[id^="company-"]')]
      if (sections.length === 0) return

      const marker = scroller.getBoundingClientRect().top + 96
      let current = sections[0]
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= marker) current = section
        else break
      }

      const id = current.id.slice('company-'.length)
      setActiveId((prev) => (prev === id ? prev : id))
    }

    function onScroll() {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        syncActiveFromScroll()
      })
    }

    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [visibleCampaigns, visibleReviews])

  useEffect(() => {
    if (activeId === 'all') return
    document
      .querySelector(`[data-campaign-id="${CSS.escape(activeId)}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [activeId])

  const scraping = campaigns.some((campaign) => campaign.scrapeStatus === 'scraping')

  function selectCompany(id: string) {
    scrollingToRef.current = id
    setActiveId(id)
    window.setTimeout(() => {
      if (scrollingToRef.current === id) scrollingToRef.current = null
    }, 200)

    if (id === 'all') {
      feedRef.current?.scrollTo({ top: 0, behavior: 'auto' })
      return
    }

    window.requestAnimationFrame(() => {
      document.getElementById(`company-${id}`)?.scrollIntoView({
        behavior: 'auto',
        block: 'start',
      })
    })
  }

  async function addCampaigns(urls: string[]) {
    setAdding(true)
    const knownIds = new Set(campaigns.map((campaign) => campaign.id))
    const knownUrls = new Set(campaigns.map((campaign) => campaign.mapsUrl))
    const alreadyScraped: string[] = []
    let added = 0

    try {
      for (const url of urls) {
        if (knownUrls.has(url)) {
          alreadyScraped.push(url)
          continue
        }

        try {
          setScrapeDialog({ status: 'running', name: 'Looking up shop…' })
          const result = await resolvePlace(url)
          const campaign = result.campaign
          const id = campaign.id
          const title = campaignDisplayName(campaign)

          if (knownIds.has(id)) {
            alreadyScraped.push(title)
            setScrapeDialog({ status: 'idle' })
            continue
          }

          knownIds.add(id)
          knownUrls.add(campaign.mapsUrl)
          added += 1

          setCampaigns((current) => [campaign, ...current.filter((item) => item.id !== id)])
          setReviews((current) =>
            mergeReviews(
              current,
              result.reviews.map((review) => ({ ...review, campaignId: id })),
            ),
          )
          toast.success(`Added ${title}`)
          selectCompany(id)

          if (result.nextPageToken) {
            const ok = await scrapeCampaign(
              { ...campaign, nextPageToken: result.nextPageToken },
              { closeOnSuccess: false },
            )
            if (!ok) return
          }
          setScrapeDialog({ status: 'idle' })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Could not add campaign.'
          if (/already been scraped/i.test(message)) {
            alreadyScraped.push(url)
            setScrapeDialog({ status: 'idle' })
            continue
          }
          setScrapeDialog({ status: 'error', name: 'this shop', message })
          toast.error(message)
          throw error instanceof Error ? error : new Error(message)
        }
      }

      if (alreadyScraped.length > 0) {
        const message =
          alreadyScraped.length === 1
            ? 'This address has already been scraped.'
            : `${alreadyScraped.length} of these addresses have already been scraped.`
        toast.error(message)
        throw new Error(message)
      }

      if (added > 0) {
        await reloadStore().catch(() => undefined)
        setDialogOpen(false)
      }
    } finally {
      setAdding(false)
    }
  }

  async function scrapeCampaign(
    campaign: Campaign,
    options?: { reset?: boolean; closeOnSuccess?: boolean },
  ): Promise<boolean> {
    if (options?.reset && wasScrapedToday(campaign.lastScrapedAt)) {
      toast.error(scrapeLimitMessage(campaign))
      return false
    }

    const fallbackName = campaignDisplayName(campaign)
    setScrapeDialog({ status: 'running', name: fallbackName })
    setCampaigns((current) =>
      current.map((item) =>
        item.id === campaign.id
          ? { ...item, scrapeStatus: 'scraping', scrapeError: undefined }
          : item,
      ),
    )

    let token = options?.reset ? undefined : campaign.nextPageToken
    let page = options?.reset ? 0 : 1
    let previousToken: string | undefined

    try {
      do {
        if (token && token === previousToken) break
        previousToken = token
        const result = await fetchReviewsPage({
          campaignId: campaign.id,
          dataId: campaign.dataId,
          placeId: campaign.placeId,
          nextPageToken: token,
          sortBy: 'newestFirst',
          scrapeStatus: 'scraping',
        })

        setReviews((current) =>
          mergeReviews(
            options?.reset && page === 0
              ? current.filter((review) => review.campaignId !== campaign.id)
              : current,
            result.reviews.map((review) => ({ ...review, campaignId: campaign.id })),
          ),
        )

        token = result.nextPageToken
        page += 1

        setCampaigns((current) =>
          current.map((item) =>
            item.id === campaign.id
              ? {
                  ...item,
                  title: preferName(
                    result.place.title,
                    item.title,
                    placeNameFromMapsUrl(item.mapsUrl),
                  ),
                  address: result.place.address || item.address,
                  rating: result.place.rating ?? item.rating,
                  reviewsCount: result.place.reviewsCount ?? item.reviewsCount,
                  type: result.place.type ?? item.type,
                  dataId: result.place.dataId ?? item.dataId,
                  placeId: result.place.placeId ?? item.placeId,
                  lastScrapedAt: new Date().toISOString(),
                  nextPageToken: token,
                  scrapeStatus: token && page < MAX_PAGES ? 'scraping' : 'done',
                }
              : item,
          ),
        )
      } while (token && page < MAX_PAGES)

      await patchCampaign(campaign.id, { scrapeStatus: 'done', nextPageToken: token }).catch(() => undefined)
      await reloadStore().catch(() => undefined)
      toast.success(`Finished scraping ${fallbackName}`)
      if (options?.closeOnSuccess !== false) setScrapeDialog({ status: 'idle' })
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Scrape failed.'
      setCampaigns((current) =>
        current.map((item) =>
          item.id === campaign.id
            ? { ...item, scrapeStatus: 'error', scrapeError: message }
            : item,
        ),
      )
      await patchCampaign(campaign.id, { scrapeStatus: 'error', scrapeError: message }).catch(
        () => undefined,
      )
      await reloadStore().catch(() => undefined)
      toast.error(message)
      setScrapeDialog({ status: 'error', name: fallbackName, message })
      return false
    }
  }

  async function scrapeAll() {
    const due = campaigns.filter((campaign) => !wasScrapedToday(campaign.lastScrapedAt))
    const skipped = campaigns.length - due.length
    if (due.length === 0) {
      toast.error('Every shop has already been scraped today. Only one scrape per day is allowed.')
      return
    }
    if (skipped > 0) {
      toast.message(
        `Skipping ${skipped} shop${skipped === 1 ? '' : 's'} already scraped today.`,
      )
    }
    for (const campaign of due) {
      const ok = await scrapeCampaign(campaign, { reset: true, closeOnSuccess: false })
      if (!ok) return
    }
    setScrapeDialog({ status: 'idle' })
  }

  async function removeCampaign(campaign: Campaign) {
    try {
      await deleteCampaignApi(campaign.id)
      await reloadStore().catch(() => undefined)
      if (activeId === campaign.id) setActiveId('all')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete campaign.')
    }
  }

  function exportCsv() {
    const csv = reviewsToCsv(visibleReviews, visibleCampaigns, {
      timeRange,
      fromDate,
      toDate,
    })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'google-maps-reviews.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <CampaignSidebar
        campaigns={visibleCampaigns}
        selectedId={activeId}
        reviewCounts={reviewCounts}
        companySort={companySort}
        onSelect={selectCompany}
        onCompanySortChange={setCompanySort}
        onAdd={() => setDialogOpen(true)}
        onScrape={(campaign) => void scrapeCampaign(campaign, { reset: true })}
        onRemove={removeCampaign}
      />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        {configError ? (
          <div className="shrink-0 border-b bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {configError}
          </div>
        ) : null}
        <div className="shrink-0">
          <FiltersBar
            query={query}
            rating={rating}
            sort={sort}
            timeRange={timeRange}
            fromDate={fromDate}
            toDate={toDate}
            city={city}
            cities={cities}
            scraping={scraping}
            hasCampaigns={campaigns.length > 0}
            onQueryChange={setQuery}
            onRatingChange={setRating}
            onSortChange={setSort}
            onTimeRangeChange={setTimeRange}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
            onCityChange={setCity}
            onScrapeAll={() => void scrapeAll()}
            onExport={exportCsv}
          />
        </div>
        <div ref={feedRef} className="min-h-0 flex-1 overflow-y-auto">
          {activeFilterChips.length > 0 ? (
            <div className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur-sm">
              <ActiveFiltersPanel
                chips={activeFilterChips}
                onClear={clearActiveFilterChip}
                onReset={resetAllFilters}
              />
            </div>
          ) : null}
          {campaigns.length > 0 ? (
            <div className="flex items-baseline justify-between gap-4 px-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {visibleReviews.length} review{visibleReviews.length === 1 ? '' : 's'} grouped
                by company
              </p>
              <p className="shrink-0 text-sm text-muted-foreground">
                Last scraped: {lastScrapedAt ? formatScrapedAt(lastScrapedAt) : '—'}
              </p>
            </div>
          ) : null}
          <ReviewFeed
            key={`${query}|${rating}|${sort}|${companySort}|${timeRange}|${fromDate}|${toDate}|${city}|${storeRevision}`}
            campaigns={visibleCampaigns}
            reviews={visibleReviews}
            activeId={activeId}
            sort={sort}
            emptyMessage={city === 'all' ? undefined : 'Try another city or choose All cities.'}
          />
        </div>
      </main>
      <AddCampaignDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={addCampaigns}
        pending={adding}
      />
      <ScrapeProgressDialog
        state={scrapeDialog}
        onClose={() => setScrapeDialog({ status: 'idle' })}
      />
    </div>
  )
}
