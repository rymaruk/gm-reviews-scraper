'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { AppNav } from '@/components/app-nav'
import { Stars } from '@/components/stars'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateCampaignWeights } from '@/lib/api'
import { campaignDisplayName } from '@/lib/place'
import { formatCampaignRating } from '@/lib/reviews'
import type { Campaign } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  WEIGHT_EPSILON,
  WEIGHT_TOTAL,
  formatWeight,
  parseWeight,
  roundWeight,
  validateWeights,
  weightsTotal,
} from '@/lib/weights'

export function MetricsGrid({
  initialCampaigns,
  initialError,
}: {
  initialCampaigns: Campaign[]
  initialError: string | null
}) {
  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [drafts, setDrafts] = useState<Record<string, string>>(() => draftsFromCampaigns(initialCampaigns))
  const [saving, setSaving] = useState(false)
  const sorted = useMemo(
    () =>
      [...campaigns].sort((left, right) =>
        campaignDisplayName(left).localeCompare(campaignDisplayName(right), 'en', {
          sensitivity: 'base',
        }) || left.id.localeCompare(right.id),
      ),
    [campaigns],
  )

  const parsedWeights = sorted.map((campaign) => parseWeight(drafts[campaign.id] ?? ''))
  const numericWeights = parsedWeights.filter((value): value is number => value != null)
  const invalidRow = parsedWeights.some((value) => value == null || value < 0)
  const total = weightsTotal(numericWeights)
  const validation = validateWeights(numericWeights)
  const canSave =
    campaigns.length > 0 && !invalidRow && parsedWeights.length === campaigns.length && validation.ok
  const remaining = roundWeight(WEIGHT_TOTAL - total)
  const dirty = sorted.some(
    (campaign) => parseWeight(drafts[campaign.id] ?? '') !== roundWeight(campaign.weight),
  )

  function setDraft(id: string, value: string) {
    setDrafts((current) => ({ ...current, [id]: value }))
  }

  function commitDraft(id: string) {
    const parsed = parseWeight(drafts[id] ?? '')
    if (parsed == null || parsed < 0) return
    setDraft(id, formatWeight(parsed))
  }

  async function save() {
    if (!canSave) return
    setSaving(true)
    try {
      const weights = sorted.map((campaign) => ({
        id: campaign.id,
        weight: roundWeight(parseWeight(drafts[campaign.id] ?? '') ?? 0),
      }))
      await updateCampaignWeights(weights)
      setCampaigns((current) =>
        current.map((campaign) => {
          const next = weights.find((item) => item.id === campaign.id)
          return next ? { ...campaign, weight: next.weight } : campaign
        }),
      )
      setDrafts(Object.fromEntries(weights.map((item) => [item.id, formatWeight(item.weight)])))
      toast.success('Shop weights saved.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save weights.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex items-center justify-between gap-3 border-b bg-sidebar px-4 py-3">
        <div>
          <p className="font-heading text-lg font-medium">GoogleMap Reviews</p>
          <AppNav current="metrics" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
        <div>
          <h1 className="font-heading text-3xl font-medium">Metric</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign a weight to each shop. Values can be 0 or greater, and the total must be {WEIGHT_TOTAL}%.
          </p>
        </div>

        {initialError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {initialError}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
            Add a shop on the reviews page before setting weights.
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Address</th>
                    <th className="w-40 px-4 py-3 text-right font-semibold">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((campaign) => {
                    const raw = drafts[campaign.id] ?? ''
                    const parsed = parseWeight(raw)
                    const rowInvalid = parsed == null || parsed < 0
                    const name = campaignDisplayName(campaign)
                    const reviewsCount = campaign.reviewsCount ?? 0
                    return (
                      <tr key={campaign.id} className="border-t">
                        <td className="px-4 py-3 align-top">
                          <p className="font-medium break-all">{name}</p>
                          <p className="mt-0.5 text-xs break-all text-muted-foreground">
                            {campaign.address ?? campaign.type ?? 'Google Maps place'}
                          </p>
                          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {campaign.rating != null ? (
                              <>
                                <Stars rating={campaign.rating} />
                                <span className="tabular-nums text-amber-400">
                                  {formatCampaignRating(campaign.rating)}
                                </span>
                                <span className="h-3 w-px shrink-0 bg-border" aria-hidden="true" />
                              </>
                            ) : null}
                            <span>
                              {reviewsCount} review{reviewsCount === 1 ? '' : 's'}
                            </span>
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-center justify-end gap-1.5">
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={raw}
                              aria-label={`Weight for ${name}`}
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
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p
                className={cn(
                  'text-sm tabular-nums',
                  canSave ? 'text-muted-foreground' : 'text-destructive',
                )}
                aria-live="polite"
              >
                {invalidRow
                  ? 'Each weight must be 0 or greater.'
                  : Math.abs(total - WEIGHT_TOTAL) <= WEIGHT_EPSILON
                    ? `Total: ${WEIGHT_TOTAL}%`
                    : remaining > 0
                      ? `Total: ${formatWeight(total)}% (${formatWeight(remaining)}% remaining)`
                      : `Total: ${formatWeight(total)}% (${formatWeight(Math.abs(remaining))}% over)`}
              </p>
              <Button type="button" onClick={() => void save()} disabled={!canSave || saving || !dirty}>
                {saving ? 'Saving…' : 'Save weights'}
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function draftsFromCampaigns(campaigns: Campaign[]): Record<string, string> {
  return Object.fromEntries(campaigns.map((campaign) => [campaign.id, formatWeight(campaign.weight)]))
}
