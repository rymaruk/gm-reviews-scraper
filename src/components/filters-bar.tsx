import { DownloadIcon, RefreshCwIcon, SearchIcon, StarIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { RatingFilter, SortOption, TimeRange } from '@/lib/types'
import { cn } from '@/lib/utils'

const STAR_FILTERS: RatingFilter[] = ['5', '4', '3', '2', '1']

export function FiltersBar({
  query,
  rating,
  sort,
  timeRange,
  fromDate,
  toDate,
  scraping,
  hasCampaigns,
  onQueryChange,
  onRatingChange,
  onSortChange,
  onTimeRangeChange,
  onFromDateChange,
  onToDateChange,
  onScrapeAll,
  onExport,
}: {
  query: string
  rating: RatingFilter
  sort: SortOption
  timeRange: TimeRange
  fromDate: string
  toDate: string
  scraping: boolean
  hasCampaigns: boolean
  onQueryChange: (value: string) => void
  onRatingChange: (value: RatingFilter) => void
  onSortChange: (value: SortOption) => void
  onTimeRangeChange: (value: TimeRange) => void
  onFromDateChange: (value: string) => void
  onToDateChange: (value: string) => void
  onScrapeAll: () => void
  onExport: () => void
}) {
  return (
    <div className="flex shrink-0 flex-col gap-3 border-b bg-background px-4 py-4">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search reviews from all companies…"
              className="pl-8"
            />
          </div>
          <Select value={timeRange} onValueChange={(value) => onTimeRangeChange(value as TimeRange)}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Filter by time range">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 3 months</SelectItem>
              <SelectItem value="365d">Last year</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
          <div
            className="flex shrink-0 items-center gap-1 rounded-lg border p-0.5"
            role="group"
            aria-label="Filter by stars"
          >
            <Button
              type="button"
              size="sm"
              variant={rating === 'all' ? 'default' : 'ghost'}
              onClick={() => onRatingChange('all')}
            >
              All
            </Button>
            {STAR_FILTERS.map((stars) => (
              <Button
                key={stars}
                type="button"
                size="sm"
                variant={rating === stars ? 'default' : 'ghost'}
                className="gap-1 px-2"
                onClick={() => onRatingChange(stars)}
                aria-pressed={rating === stars}
                aria-label={`${stars} stars`}
              >
                {stars}
                <StarIcon
                  className={cn(
                    'size-3.5',
                    rating === stars ? 'fill-current' : 'fill-amber-400 text-amber-400',
                  )}
                />
              </Button>
            ))}
          </div>
          <Select value={sort} onValueChange={(value) => onSortChange(value as SortOption)}>
            <SelectTrigger className="w-full sm:w-40" aria-label="Sort reviews">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onExport} disabled={!hasCampaigns}>
            <DownloadIcon />
            Export CSV
          </Button>
          <Button onClick={onScrapeAll} disabled={scraping || !hasCampaigns}>
            <RefreshCwIcon className={scraping ? 'animate-spin' : undefined} />
            Scrape all
          </Button>
        </div>
      </div>
      {timeRange === 'custom' ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1">
            <Label htmlFor="from-date" className="text-xs">
              From
            </Label>
            <Input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={(event) => onFromDateChange(event.target.value)}
              className="w-40"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="to-date" className="text-xs">
              To
            </Label>
            <Input
              id="to-date"
              type="date"
              value={toDate}
              onChange={(event) => onToDateChange(event.target.value)}
              className="w-40"
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
