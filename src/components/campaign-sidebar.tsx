import { MapPinIcon, PlusIcon, RefreshCwIcon, Trash2Icon } from 'lucide-react'

import { Stars } from '@/components/stars'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { campaignDisplayName } from '@/lib/place'
import type { Campaign } from '@/lib/types'
import { cn } from '@/lib/utils'

export function CampaignSidebar({
  campaigns,
  selectedId,
  reviewCounts,
  onSelect,
  onAdd,
  onScrape,
  onRemove,
}: {
  campaigns: Campaign[]
  selectedId: string
  reviewCounts: Record<string, number>
  onSelect: (id: string) => void
  onAdd: () => void
  onScrape: (campaign: Campaign) => void
  onRemove: (campaign: Campaign) => void
}) {
  const totalReviews = Object.values(reviewCounts).reduce((sum, count) => sum + count, 0)

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r bg-sidebar">
      <div className="flex items-center justify-between gap-2 px-4 py-4">
        <h1 className="font-heading text-lg font-medium">GoogleMap Review</h1>
        <Button size="sm" onClick={onAdd}>
          <PlusIcon />
          Add
        </Button>
      </div>

      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={() => onSelect('all')}
          className={cn(
            'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
            selectedId === 'all' ? 'bg-background shadow-sm ring-1 ring-foreground/10' : 'hover:bg-background/70',
          )}
        >
          <span className="font-medium">All reviews</span>
          <Badge variant="secondary">{totalReviews}</Badge>
        </button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-1 px-3 pb-4">
          {campaigns.length === 0 ? (
            <div className="rounded-xl border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
              Add a Google Maps shop link to start collecting reviews.
            </div>
          ) : (
            campaigns.map((campaign) => {
              const active = selectedId === campaign.id
              const name = campaignDisplayName(campaign)
              return (
                <div
                  key={campaign.id}
                  className={cn(
                    'flex min-w-full flex-col rounded-xl px-3 py-3 transition-colors',
                    active ? 'bg-background shadow-sm ring-1 ring-foreground/10' : 'hover:bg-background/70',
                  )}
                >
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 text-left"
                    onClick={() => onSelect(campaign.id)}
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <MapPinIcon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium break-all whitespace-normal">{name}</span>
                      <span className="mt-0.5 block text-xs break-all whitespace-normal text-muted-foreground">
                        {campaign.address ?? campaign.type ?? 'Google Maps place'}
                      </span>
                      <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        {campaign.rating != null && <Stars rating={campaign.rating} />}
                        <span>{reviewCounts[campaign.id] ?? 0} reviews</span>
                      </span>
                    </span>
                  </button>
                  <div className="mt-2 flex items-center justify-end gap-1">
                    {campaign.scrapeStatus === 'scraping' && (
                      <Badge variant="outline">Scraping…</Badge>
                    )}
                    {campaign.scrapeStatus === 'error' && (
                      <Badge variant="destructive">Failed</Badge>
                    )}
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => onScrape(campaign)}
                      disabled={campaign.scrapeStatus === 'scraping'}
                      aria-label={`Scrape reviews for ${name}`}
                    >
                      <RefreshCwIcon />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => onRemove(campaign)}
                      aria-label={`Remove ${name}`}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}
