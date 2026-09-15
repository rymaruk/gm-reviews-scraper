'use client'

import { XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { ActiveFilterChip, ActiveFilterId } from '@/lib/search-params'

export function ActiveFiltersPanel({
  chips,
  onClear,
  onReset,
}: {
  chips: ActiveFilterChip[]
  onClear: (id: ActiveFilterId) => void | Promise<void>
  onReset: () => void | Promise<void>
}) {
  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Active Filters:</span>
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          className="inline-flex h-7 max-w-full items-center gap-1 rounded-full border bg-muted/70 px-2.5 text-sm transition-colors hover:bg-muted"
          onClick={() => void onClear(chip.id)}
          aria-label={`Clear ${chip.id} filter ${chip.label}`}
          data-filter-id={chip.id}
        >
          <span className="min-w-0 truncate">{chip.label}</span>
          <XIcon className="size-3.5 shrink-0" />
        </button>
      ))}
      <Button type="button" size="sm" variant="ghost" onClick={() => void onReset()}>
        <XIcon />
        Reset all
      </Button>
    </div>
  )
}
