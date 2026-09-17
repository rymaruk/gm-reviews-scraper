'use client'

import { useEffect, useRef, useState } from 'react'
import { FileSpreadsheetIcon, Loader2Icon, UploadIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
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
import { updateCampaignShares } from '@/lib/api'
import type { Campaign } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  createShareImportState,
  emptyImportPlan,
  importCounts,
  parseShareCsvRows,
  statusLabel,
  type ShareImportPlan,
  type ShareImportRow,
  type ShareImportStatus,
} from '@/lib/share-csv'

const ROW_CHUNK = 6
const FILE_INPUT_ID = 'metrics-share-csv-file'

export function ShareCsvImportDialog({
  open,
  onOpenChange,
  campaigns,
  drafts,
  onImported,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaigns: Campaign[]
  drafts: Record<string, string>
  onImported: (shares: Array<{ id: string; share: number }>) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const openRef = useRef(open)
  const wasOpenRef = useRef(false)
  const [file, setFile] = useState<File | null>(null)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [plan, setPlan] = useState<ShareImportPlan | null>(null)
  const [previewRows, setPreviewRows] = useState<ShareImportRow[]>([])

  openRef.current = open

  const counts = plan ? importCounts(plan.rows) : importCounts(previewRows)
  const rows = plan?.rows ?? previewRows
  const error = plan?.parseError
  const choosing = !running && !plan

  useEffect(() => {
    if (wasOpenRef.current && !open) {
      setFile(null)
      setRunning(false)
      setProgress(0)
      setMessage('')
      setPlan(null)
      setPreviewRows([])
      if (fileRef.current) fileRef.current.value = ''
    }
    wasOpenRef.current = open
  }, [open])

  function handleOpenChange(nextOpen: boolean) {
    if (running && !nextOpen) return
    if (nextOpen === open) return
    onOpenChange(nextOpen)
  }

  function applyPickedFile(nextFile: File | null) {
    if (!openRef.current) return
    setFile(nextFile)
    setPlan(null)
    setPreviewRows([])
  }

  async function startImport() {
    if (!file || running) return
    setPlan(null)
    setPreviewRows([])
    setRunning(true)
    setProgress(4)
    setMessage('Reading file…')
    try {
      const text = await file.text()
      if (!openRef.current) return
      await yieldUi()
      if (!openRef.current) return
      const parsed = parseShareCsvRows(text)
      if (parsed.parseError) {
        setPlan(emptyImportPlan(parsed.parseError))
        return
      }

      const importer = createShareImportState(campaigns, drafts)
      const nextRows: ShareImportRow[] = []
      setMessage(
        parsed.records.length === 0 ? 'No data rows in the CSV.' : 'Validating shops…',
      )

      for (let index = 0; index < parsed.records.length; index += ROW_CHUNK) {
        if (!openRef.current) return
        const chunk = parsed.records.slice(index, index + ROW_CHUNK)
        for (const record of chunk) {
          nextRows.push(importer.process(record))
        }
        const done = Math.min(index + ROW_CHUNK, parsed.records.length)
        setPreviewRows([...nextRows])
        setProgress(Math.round((done / Math.max(parsed.records.length, 1)) * 85))
        setMessage(`Validating ${done} of ${parsed.records.length} shops…`)
        await yieldUi()
      }

      if (!openRef.current) return
      const nextPlan = importer.finish(nextRows)
      if (nextPlan.canSave) {
        setProgress(90)
        setMessage(`Saving ${nextPlan.changedCount} share${nextPlan.changedCount === 1 ? '' : 's'}…`)
        await yieldUi()
        if (!openRef.current) return
        await updateCampaignShares(nextPlan.shares)
        if (!openRef.current) return
        onImported(nextPlan.shares)
        toast.success('Shares updated')
      }
      setProgress(100)
      setPlan(nextPlan)
    } catch (cause) {
      if (!openRef.current) return
      const messageText = cause instanceof Error ? cause.message : 'Could not import CSV.'
      toast.error(messageText)
      setPlan(emptyImportPlan(messageText))
    } finally {
      if (openRef.current) setRunning(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={false}>
      <DialogContent
        className="pointer-events-auto sm:max-w-3xl"
        overlay={
          <div
            data-slot="dialog-overlay"
            className="fixed inset-0 z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs"
          />
        }
        showCloseButton={!running}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
        }}
        onPointerDownOutside={(event) => {
          event.preventDefault()
        }}
        onFocusOutside={(event) => {
          event.preventDefault()
        }}
        onInteractOutside={(event) => {
          event.preventDefault()
        }}
        onEscapeKeyDown={(event) => {
          if (running) event.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>Import shares</DialogTitle>
          <DialogDescription>
            {running
              ? message
              : error
                ? error
                : plan
                  ? `Updated ${counts.updated} address${counts.updated === 1 ? '' : 'es'}. ${counts.notUpdated} not updated.`
                  : 'Choose a CSV with Address and Share columns, then import.'}
          </DialogDescription>
        </DialogHeader>

        {choosing ? (
          <div className="flex flex-wrap items-center gap-3 py-1">
            <label
              htmlFor={FILE_INPUT_ID}
              className={cn(buttonVariants({ variant: 'outline' }), 'relative w-fit cursor-pointer')}
            >
              <UploadIcon />
              Choose CSV
              <input
                id={FILE_INPUT_ID}
                ref={fileRef}
                type="file"
                name="metrics-share-csv"
                accept=".csv,text/csv,text/plain"
                className="sr-only"
                onChange={(event) => {
                  applyPickedFile(event.target.files?.[0] ?? null)
                }}
              />
            </label>
            {file ? (
              <p className="flex min-w-0 items-center gap-1.5 text-sm">
                <FileSpreadsheetIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{file.name}</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No file selected.</p>
            )}
          </div>
        ) : null}

        {running || rows.length > 0 || error ? (
          <div className="grid gap-3">
            {running ? (
              <div className="grid gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2Icon className="size-4 shrink-0 animate-spin" />
                  <span>{message}</span>
                </div>
                <Progress value={progress} />
              </div>
            ) : null}
            {!running && plan ? (
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="secondary">Updated: {counts.updated}</Badge>
                <Badge variant="outline">Not updated: {counts.notUpdated}</Badge>
              </div>
            ) : null}
            {rows.length === 0 && !running ? (
              error ? null : (
                <p className="text-sm text-muted-foreground">No CSV rows to show.</p>
              )
            ) : rows.length > 0 ? (
              <ScrollArea className="h-80 rounded-xl ring-1 ring-foreground/10">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/90 text-left text-xs tracking-wide text-muted-foreground uppercase">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Address</th>
                      <th className="w-24 px-3 py-2 font-semibold">Share</th>
                      <th className="w-32 px-3 py-2 font-semibold">Result</th>
                      <th className="px-3 py-2 font-semibold">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={`${row.line}-${row.address}`} className="border-t">
                        <td className="px-3 py-2 break-all">{row.address || '—'}</td>
                        <td className="px-3 py-2 tabular-nums">{row.share || '—'}</td>
                        <td className="px-3 py-2">
                          <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{row.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          {choosing ? (
            <>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void startImport()} disabled={!file}>
                Import
              </Button>
            </>
          ) : running ? null : (
            <Button type="button" onClick={() => handleOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function statusVariant(status: ShareImportStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'updated') return 'default'
  if (status === 'unchanged') return 'secondary'
  if (status === 'blocked' || status === 'invalid_share' || status === 'not_found') return 'destructive'
  return 'outline'
}

function yieldUi() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0)
  })
}
