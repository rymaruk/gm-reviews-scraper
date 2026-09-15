'use client'

import { Loader2Icon } from 'lucide-react'

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
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  importCounts,
  statusLabel,
  type WeightImportPlan,
  type WeightImportStatus,
} from '@/lib/weight-csv'

export function WeightCsvImportDialog({
  open,
  onOpenChange,
  running,
  progress,
  message,
  plan,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  running: boolean
  progress: number
  message: string
  plan: WeightImportPlan | null
}) {
  const counts = plan ? importCounts(plan.rows) : { updated: 0, notUpdated: 0 }
  const error = plan?.parseError

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (running && !nextOpen) return
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent
        className="sm:max-w-3xl"
        showCloseButton={!running}
        onPointerDownOutside={(event) => {
          if (running) event.preventDefault()
        }}
        onEscapeKeyDown={(event) => {
          if (running) event.preventDefault()
        }}
        onInteractOutside={(event) => {
          if (running) event.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>{running ? 'Importing weights' : 'Import results'}</DialogTitle>
          <DialogDescription>
            {running
              ? message
              : error
                ? error
                : `Updated ${counts.updated} address${counts.updated === 1 ? '' : 'es'}. ${counts.notUpdated} not updated.`}
          </DialogDescription>
        </DialogHeader>

        {running ? (
          <div className="grid gap-2 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 shrink-0 animate-spin" />
              <span>{message}</span>
            </div>
            <Progress value={progress} />
          </div>
        ) : plan ? (
          <div className="grid gap-3">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="secondary">Updated: {counts.updated}</Badge>
              <Badge variant="outline">Not updated: {counts.notUpdated}</Badge>
            </div>
            {plan.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No CSV rows to show.</p>
            ) : (
              <ScrollArea className="h-80 rounded-xl ring-1 ring-foreground/10">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/90 text-left text-xs tracking-wide text-muted-foreground uppercase">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Address</th>
                      <th className="w-24 px-3 py-2 font-semibold">Weight</th>
                      <th className="w-32 px-3 py-2 font-semibold">Result</th>
                      <th className="px-3 py-2 font-semibold">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.rows.map((row) => (
                      <tr key={`${row.line}-${row.address}`} className="border-t">
                        <td className="px-3 py-2 break-all">{row.address || '—'}</td>
                        <td className="px-3 py-2 tabular-nums">{row.weight || '—'}</td>
                        <td className="px-3 py-2">
                          <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{row.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            )}
          </div>
        ) : null}

        {!running ? (
          <DialogFooter>
            <Button type="button" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function statusVariant(status: WeightImportStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'updated') return 'default'
  if (status === 'unchanged') return 'secondary'
  if (status === 'blocked' || status === 'invalid_weight' || status === 'not_found') return 'destructive'
  return 'outline'
}
