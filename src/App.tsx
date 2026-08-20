import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { AddCampaignDialog } from '@/components/add-campaign-dialog'
import { CampaignSidebar } from '@/components/campaign-sidebar'
import { FiltersBar } from '@/components/filters-bar'
import { ReviewFeed } from '@/components/review-feed'
import { fetchReviewsPage, getHealth, resolvePlace } from '@/lib/api'
import { campaignDisplayName, placeNameFromMapsUrl, preferName } from '@/lib/place'
import { campaignIdentity, filterReviews, mergeReviews, reviewsToCsv } from '@/lib/reviews'
import { loadCampaigns, loadReviews, saveCampaigns, saveReviews } from '@/lib/storage'
import type { Campaign, RatingFilter, SortOption, StoredReview, TimeRange } from '@/lib/types'

const MAX_PAGES = 25

export default function App() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(loadCampaigns)
  const [reviews, setReviews] = useState<StoredReview[]>(loadReviews)
  const [activeId, setActiveId] = useState('all')
  const [query, setQuery] = useState('')
  const [rating, setRating] = useState<RatingFilter>('all')
  const [sort, setSort] = useState<SortOption>('newest')
  const [timeRange, setTimeRange] = useState<TimeRange>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [configured, setConfigured] = useState(true)
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    saveCampaigns(campaigns)
  }, [campaigns])

  useEffect(() => {
    saveReviews(reviews)
  }, [reviews])

  useEffect(() => {
    void getHealth()
      .then((health) => setConfigured(health.configured))
      .catch(() => setConfigured(false))
  }, [])

  const reviewCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const review of reviews) {
      counts[review.campaignId] = (counts[review.campaignId] ?? 0) + 1
    }
    return counts
  }, [reviews])

  const visibleReviews = useMemo(
    () =>
      filterReviews(reviews, campaigns, {
        query,
        rating,
        sort,
        timeRange,
        fromDate,
        toDate,
      }),
    [reviews, campaigns, query, rating, sort, timeRange, fromDate, toDate],
  )

  const scraping = campaigns.some((campaign) => campaign.scrapeStatus === 'scraping')

  function selectCompany(id: string) {
    setActiveId(id)
    if (id === 'all') {
      feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    window.requestAnimationFrame(() => {
      document.getElementById(`company-${id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  async function addCampaigns(urls: string[]) {
    setAdding(true)
    const knownIds = new Set(campaigns.map((campaign) => campaign.id))

    try {
      for (const url of urls) {
        const result = await resolvePlace(url)
        const id = campaignIdentity(result.place)
        const title = preferName(
          result.place.title,
          placeNameFromMapsUrl(result.resolvedUrl),
          placeNameFromMapsUrl(result.url),
        )

        if (knownIds.has(id)) {
          toast.message(`${title} is already in the list. Scraping latest reviews.`)
          const existing = campaigns.find((campaign) => campaign.id === id)
          if (existing) await scrapeCampaign(existing, { reset: true })
          selectCompany(id)
          continue
        }

        knownIds.add(id)

        const campaign: Campaign = {
          id,
          mapsUrl: result.resolvedUrl || result.url,
          title,
          address: result.place.address,
          rating: result.place.rating,
          reviewsCount: result.place.reviewsCount,
          type: result.place.type,
          thumbnail: result.place.thumbnail,
          dataId: result.place.dataId,
          placeId: result.place.placeId,
          createdAt: new Date().toISOString(),
          lastScrapedAt: new Date().toISOString(),
          scrapeStatus: result.nextPageToken ? 'scraping' : 'done',
          nextPageToken: result.nextPageToken,
        }

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
          await scrapeCampaign({ ...campaign, nextPageToken: result.nextPageToken })
        }
      }
      setDialogOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add campaign.')
    } finally {
      setAdding(false)
    }
  }

  async function scrapeCampaign(campaign: Campaign, options?: { reset?: boolean }) {
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
    const fallbackName = campaignDisplayName(campaign)

    try {
      do {
        if (token && token === previousToken) break
        previousToken = token
        const result = await fetchReviewsPage({
          dataId: campaign.dataId,
          placeId: campaign.placeId,
          nextPageToken: token,
          sortBy: 'newestFirst',
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

      toast.success(`Finished scraping ${fallbackName}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Scrape failed.'
      setCampaigns((current) =>
        current.map((item) =>
          item.id === campaign.id
            ? { ...item, scrapeStatus: 'error', scrapeError: message }
            : item,
        ),
      )
      toast.error(message)
    }
  }

  async function scrapeAll() {
    for (const campaign of campaigns) {
      await scrapeCampaign(campaign, { reset: true })
    }
  }

  function removeCampaign(campaign: Campaign) {
    setCampaigns((current) => current.filter((item) => item.id !== campaign.id))
    setReviews((current) => current.filter((review) => review.campaignId !== campaign.id))
    if (activeId === campaign.id) setActiveId('all')
  }

  function exportCsv() {
    const csv = reviewsToCsv(visibleReviews, campaigns)
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
        campaigns={campaigns}
        selectedId={activeId}
        reviewCounts={reviewCounts}
        onSelect={selectCompany}
        onAdd={() => setDialogOpen(true)}
        onScrape={(campaign) => void scrapeCampaign(campaign, { reset: true })}
        onRemove={removeCampaign}
      />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        {!configured ? (
          <div className="shrink-0 border-b bg-destructive/10 px-4 py-2 text-sm text-destructive">
            SerpAPI is not configured. Add SERPAPI_KEY to a local .env file and restart the server.
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
            scraping={scraping}
            hasCampaigns={campaigns.length > 0}
            onQueryChange={setQuery}
            onRatingChange={setRating}
            onSortChange={setSort}
            onTimeRangeChange={setTimeRange}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
            onScrapeAll={() => void scrapeAll()}
            onExport={exportCsv}
          />
        </div>
        <div ref={feedRef} className="min-h-0 flex-1 overflow-y-auto">
          {campaigns.length > 0 ? (
            <p className="px-4 pt-4 text-sm text-muted-foreground">
              Showing {visibleReviews.length} review{visibleReviews.length === 1 ? '' : 's'} grouped
              by company
            </p>
          ) : null}
          <ReviewFeed
            campaigns={campaigns}
            reviews={visibleReviews}
            activeId={activeId}
            sort={sort}
          />
        </div>
      </main>
      <AddCampaignDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={addCampaigns}
        pending={adding}
      />
    </div>
  )
}
