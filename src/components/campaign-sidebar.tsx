import { useMemo, useState } from 'react'
import { MapPinIcon, PlusIcon, RefreshCwIcon, SearchIcon, Trash2Icon } from 'lucide-react'

import { Stars } from '@/components/stars'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { campaignDisplayName } from '@/lib/place'
import type { Campaign } from '@/lib/types'
import { cn } from '@/lib/utils'

export function CampaignSidebar({
  campaigns,
  selectedId,
  reviewCounts,
  loading = false,
  onSelect,
  onAdd,
  onScrape,
  onRemove,
}: {
  campaigns: Campaign[]
  selectedId: string
  reviewCounts: Record<string, number>
  loading?: boolean
  onSelect: (id: string) => void
  onAdd: () => void
  onScrape: (campaign: Campaign) => void
  onRemove: (campaign: Campaign) => void | Promise<void>
}) {
  const [search, setSearch] = useState('')
  const [pendingRemoval, setPendingRemoval] = useState<Campaign | null>(null)
  const [removing, setRemoving] = useState(false)
  const totalReviews = Object.values(reviewCounts).reduce((sum, count) => sum + count, 0)
  const visibleCampaigns = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return campaigns
    return campaigns.filter((campaign) => {
      const name = campaignDisplayName(campaign).toLowerCase()
      const address = (campaign.address ?? '').toLowerCase()
      return name.includes(query) || address.includes(query)
    })
  }, [campaigns, search])

  async function confirmRemove() {
    if (!pendingRemoval) return
    setRemoving(true)
    try {
      await onRemove(pendingRemoval)
      setPendingRemoval(null)
    } finally {
      setRemoving(false)
    }
  }

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
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or address"
            className="pl-8"
            aria-label="Search companies by name or address"
          />
        </div>
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
          {loading ? (
            <SidebarListSkeleton />
          ) : campaigns.length === 0 ? (
            <div className="rounded-xl border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
              Add a Google Maps shop link to start collecting reviews.
            </div>
          ) : visibleCampaigns.length === 0 ? (
            <div className="rounded-xl border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
              No companies match that search.
            </div>
          ) : (
            visibleCampaigns.map((campaign) => {
              const active = selectedId === campaign.id
              const name = campaignDisplayName(campaign)
              return (
                <div
                  key={campaign.id}
                  data-campaign-id={campaign.id}
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
                      onClick={() => setPendingRemoval(campaign)}
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

      <Dialog open={pendingRemoval != null} onOpenChange={(open) => !open && !removing && setPendingRemoval(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove this shop?</DialogTitle>
            <DialogDescription>
              {pendingRemoval
                ? `Remove ${campaignDisplayName(pendingRemoval)} and all of its reviews from the database? This cannot be undone.`
                : 'This cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingRemoval(null)}
              disabled={removing}
            >
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={() => void confirmRemove()} disabled={removing}>
              {removing ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  )
}

function SidebarListSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="flex min-w-full flex-col rounded-xl px-3 py-3">
          <div className="flex w-full items-start gap-3">
            <Skeleton className="size-8 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-36 max-w-full" />
              <Skeleton className="h-3 w-52 max-w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      ))}
    </>
  )
}
