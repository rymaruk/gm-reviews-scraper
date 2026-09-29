'use client'

import { Loader2Icon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export type ScrapeDialogState =
  | { status: 'idle' }
  | { status: 'running'; name: string }
  | { status: 'error'; name: string; message: string }
  | { status: 'incomplete'; addresses: string[] }

export function ScrapeProgressDialog({
  state,
  onClose,
}: {
  state: ScrapeDialogState
  onClose: () => void
}) {
  const running = state.status === 'running'
  const errored = state.status === 'error'
  const incomplete = state.status === 'incomplete'

  return (
    <Dialog
      open={state.status !== 'idle'}
      onOpenChange={(open) => {
        if (!open && !running) onClose()
      }}
    >
      <DialogContent
        showCloseButton={errored || incomplete}
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
          <DialogTitle>
            {errored
              ? 'Scraping failed'
              : incomplete
                ? 'Some addresses were not updated'
                : 'Scraping reviews'}
          </DialogTitle>
          <DialogDescription asChild>
            {running ? (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Loader2Icon className="mt-0.5 size-4 shrink-0 animate-spin" />
                <span>Scraping the reviews by {state.name}…</span>
              </div>
            ) : errored ? (
              <p>
                Could not finish scraping {state.name}. {state.message}
              </p>
            ) : incomplete ? (
              <div className="text-sm text-muted-foreground">
                <p>Scraping finished. These addresses were not updated:</p>
                <ul className="mt-3 max-h-60 list-disc space-y-1 overflow-y-auto pl-5 text-foreground">
                  {state.addresses.map((address, index) => (
                    <li key={`${address}-${index}`}>{address}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        {errored || incomplete ? (
          <DialogFooter>
            <Button type="button" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
