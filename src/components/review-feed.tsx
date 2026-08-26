import { useMemo, useState } from 'react'
import { MapPinIcon, MessageSquareTextIcon, StarIcon } from 'lucide-react'

import { ReviewCard } from '@/components/review-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { campaignDisplayName } from '@/lib/place'
import { formatCampaignRating, groupReviewsByCompany, groupReviewsByDay } from '@/lib/reviews'
import type { Campaign, SortOption, StoredReview } from '@/lib/types'
import { cn } from '@/lib/utils'

const INITIAL_VISIBLE_REVIEWS = 5

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
  const groups = useMemo(() => groupReviewsByCompany(campaigns, reviews), [campaigns, reviews])

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
      {groups.map(({ campaign, reviews: companyReviews }) => (
        <CampaignSection
          key={campaign.id}
          campaign={campaign}
          reviews={companyReviews}
          active={activeId === campaign.id}
          sort={sort}
        />
      ))}
    </div>
  )
}

function CampaignSection({
  campaign,
  reviews,
  active,
  sort,
}: {
  campaign: Campaign
  reviews: StoredReview[]
  active: boolean
  sort: SortOption
}) {
  const name = campaignDisplayName(campaign)
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_VISIBLE_REVIEWS)
  const remaining = Math.max(0, reviews.length - visibleLimit)
  const hasMore = remaining > 0
  const days = useMemo(
    () => groupReviewsByDay(reviews.slice(0, visibleLimit), sort),
    [reviews, visibleLimit, sort],
  )
  const reviewsLabel = campaign.reviewsCount ?? reviews.length
  const ratingLabel =
    campaign.rating != null && Number.isFinite(campaign.rating)
      ? formatCampaignRating(campaign.rating)
      : '—'

  return (
    <section
      id={`company-${campaign.id}`}
      className={cn(
        'scroll-mt-4 rounded-2xl border bg-card p-4 shadow-sm',
        active && 'ring-2 ring-ring/60',
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
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
              <h2 className="min-w-0 font-heading text-xl font-medium">{name}</h2>
              <p className="flex shrink-0 flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <MessageSquareTextIcon className="size-3.5" aria-hidden />
                  Reviews: {reviewsLabel}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <StarIcon className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
                  Rating: {ratingLabel}
                </span>
              </p>
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

      {reviews.length === 0 ? (
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
          {hasMore ? (
            <div className="flex justify-center pt-1">
              <Button
                variant="outline"
                onClick={() => setVisibleLimit(reviews.length)}
              >
                Show more {remaining} review{remaining === 1 ? '' : 's'}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
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
