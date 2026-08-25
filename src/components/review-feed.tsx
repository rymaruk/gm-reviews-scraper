import { useEffect, useMemo, useRef, useState } from 'react'
import { MapPinIcon } from 'lucide-react'

import { ReviewCard } from '@/components/review-card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { campaignDisplayName } from '@/lib/place'
import { groupReviewsByCompany, groupReviewsByDay } from '@/lib/reviews'
import type { Campaign, SortOption, StoredReview } from '@/lib/types'
import { cn } from '@/lib/utils'

const INITIAL_VISIBLE_REVIEWS = 40
const LOAD_MORE_REVIEWS = 40

export function ReviewFeed({
  campaigns,
  reviews,
  activeId,
  sort,
  loading = false,
  emptyMessage,
}: {
  campaigns: Campaign[]
  reviews: StoredReview[]
  activeId: string
  sort: SortOption
  loading?: boolean
  emptyMessage?: string
}) {
  const [loadedLimit, setLoadedLimit] = useState(INITIAL_VISIBLE_REVIEWS)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const groups = useMemo(() => groupReviewsByCompany(campaigns, reviews), [campaigns, reviews])
  const totalReviews = reviews.length

  const activeNeeded = useMemo(() => {
    if (activeId === 'all') return 0
    let needed = 0
    for (const group of groups) {
      needed += group.reviews.length
      if (group.campaign.id === activeId) return needed
    }
    return 0
  }, [activeId, groups])

  if (activeNeeded > loadedLimit) {
    setLoadedLimit(activeNeeded)
  }

  const visibleLimit = Math.max(loadedLimit, activeNeeded, INITIAL_VISIBLE_REVIEWS)

  const { visibleGroups, hasMore } = useMemo(
    () => sliceGroupsByReviewLimit(groups, visibleLimit),
    [groups, visibleLimit],
  )

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return

    const root = findScrollParent(sentinel)
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        setLoadedLimit((current) =>
          Math.min(current + LOAD_MORE_REVIEWS, Math.max(totalReviews, current)),
        )
      },
      { root, rootMargin: '320px 0px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, totalReviews, visibleGroups.length])

  if (loading) {
    return <ReviewFeedSkeleton />
  }

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
        <MapPinIcon className="size-8 text-muted-foreground" />
        <h2 className="font-heading text-lg font-medium">
          {emptyMessage ? 'No companies in this city' : 'No companies yet'}
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {emptyMessage ??
            'Add Google Maps shop links. Reviews are grouped by company, with the company name and address above each dated list.'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10 p-4 pb-24">
      {visibleGroups.map(({ campaign, reviews: companyReviews, totalCount }) => {
        const name = campaignDisplayName(campaign)
        const days = groupReviewsByDay(companyReviews, sort)

        return (
          <section
            key={campaign.id}
            id={`company-${campaign.id}`}
            className={cn(
              'scroll-mt-4 rounded-2xl border bg-card p-4 shadow-sm',
              activeId === campaign.id && 'ring-2 ring-ring/60',
            )}
          >
            <header className="-mx-4 -mt-4 mb-4 rounded-[26px] border-b px-4 pt-4 pb-4">
              <div className="flex items-start gap-3">
                {campaign.thumbnail ? (
                  <img
                    src={campaign.thumbnail}
                    alt=""
                    className="size-12 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <MapPinIcon className="size-5 text-muted-foreground" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="font-heading text-xl font-medium">{name}</h2>
                    <Badge variant="secondary">{totalCount}</Badge>
                  </div>
                  {campaign.mapsUrl ? (
                    <a
                      href={campaign.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block text-sm break-all whitespace-normal text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    >
                      {campaign.address ?? campaign.type ?? 'Open in Google Maps'}
                    </a>
                  ) : (
                    <p className="mt-1 text-sm break-all whitespace-normal text-muted-foreground">
                      {campaign.address ?? campaign.type ?? 'Address unavailable'}
                    </p>
                  )}
                </div>
              </div>
            </header>

            {totalCount === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews in this time range.</p>
            ) : (
              <div className="flex flex-col gap-6">
                {days.map((day) => (
                  <div key={`${campaign.id}-${day.key}`} className="flex flex-col gap-3">
                    <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {day.label}
                    </h3>
                    {day.reviews.map((review) => (
                      <ReviewCard key={`${review.campaignId}:${review.id}`} review={review} />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}

      {hasMore ? (
        <div ref={sentinelRef} className="flex flex-col gap-3" aria-hidden>
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : null}
    </div>
  )
}

function sliceGroupsByReviewLimit(
  groups: Array<{ campaign: Campaign; reviews: StoredReview[] }>,
  limit: number,
): {
  visibleGroups: Array<{ campaign: Campaign; reviews: StoredReview[]; totalCount: number }>
  hasMore: boolean
} {
  let remaining = limit
  const visibleGroups: Array<{ campaign: Campaign; reviews: StoredReview[]; totalCount: number }> =
    []

  for (const group of groups) {
    const totalCount = group.reviews.length

    if (totalCount === 0) {
      visibleGroups.push({ ...group, totalCount })
      continue
    }

    if (remaining <= 0) {
      return { visibleGroups, hasMore: true }
    }

    if (totalCount <= remaining) {
      visibleGroups.push({ ...group, totalCount })
      remaining -= totalCount
      continue
    }

    visibleGroups.push({
      campaign: group.campaign,
      reviews: group.reviews.slice(0, remaining),
      totalCount,
    })
    return { visibleGroups, hasMore: true }
  }

  return { visibleGroups, hasMore: false }
}

function findScrollParent(node: HTMLElement): Element | null {
  let current: HTMLElement | null = node.parentElement
  while (current) {
    const { overflowY } = window.getComputedStyle(current)
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
      return current
    }
    current = current.parentElement
  }
  return null
}

function ReviewFeedSkeleton() {
  return (
    <div className="flex flex-col gap-10 p-4 pb-24">
      {Array.from({ length: 3 }, (_, index) => (
        <section key={index} className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-start gap-3">
            <Skeleton className="size-12 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </section>
      ))}
    </div>
  )
}
