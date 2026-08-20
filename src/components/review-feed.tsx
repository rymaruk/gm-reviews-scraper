import { MapPinIcon } from 'lucide-react'

import { ReviewCard } from '@/components/review-card'
import { Badge } from '@/components/ui/badge'
import { campaignDisplayName } from '@/lib/place'
import { groupReviewsByCompany, groupReviewsByDay } from '@/lib/reviews'
import type { Campaign, SortOption, StoredReview } from '@/lib/types'
import { cn } from '@/lib/utils'

export function ReviewFeed({
  campaigns,
  reviews,
  activeId,
  sort,
}: {
  campaigns: Campaign[]
  reviews: StoredReview[]
  activeId: string
  sort: SortOption
}) {
  if (campaigns.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
        <MapPinIcon className="size-8 text-muted-foreground" />
        <h2 className="font-heading text-lg font-medium">No companies yet</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Add Google Maps shop links. Reviews are grouped by company, with the company name and
          address above each dated list.
        </p>
      </div>
    )
  }

  const groups = groupReviewsByCompany(campaigns, reviews)

  return (
    <div className="flex flex-col gap-10 p-4 pb-24">
      {groups.map(({ campaign, reviews: companyReviews }) => {
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
            <header className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 rounded-[26px] border-b bg-card px-4 pt-4 pb-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-heading text-xl font-medium">{name}</h2>
                  <p className="mt-1 text-sm break-all whitespace-normal text-muted-foreground">
                    {campaign.address ?? campaign.type ?? 'Address unavailable'}
                  </p>
                </div>
                <Badge variant="secondary">{companyReviews.length}</Badge>
              </div>
            </header>

            {companyReviews.length === 0 ? (
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
    </div>
  )
}
