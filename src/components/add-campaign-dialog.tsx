import { useState, type FormEvent } from 'react'
import { Loader2Icon, MapPinIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export function AddCampaignDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (urls: string[]) => Promise<void>
  pending: boolean
}) {
  const [value, setValue] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const urls = value
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)

    if (urls.length === 0) return
    await onSubmit(urls)
    setValue('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add campaign shops</DialogTitle>
            <DialogDescription>
              Paste one or more Google Maps place links. Each marker is treated as a campaign
              shop, and the scraper pulls every available review for it.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 py-4">
            <Label htmlFor="maps-urls">Google Maps links</Label>
            <Textarea
              id="maps-urls"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="https://maps.app.goo.gl/...&#10;https://www.google.com/maps/place/..."
              className="min-h-36 font-mono text-xs"
              required
            />
            <p className="text-xs text-muted-foreground">
              Open the shop in Google Maps, copy the link, then paste it here. One URL per line.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !value.trim()}>
              {pending ? <Loader2Icon className="animate-spin" /> : <MapPinIcon />}
              Add and scrape
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
