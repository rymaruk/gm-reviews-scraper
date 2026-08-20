import { BadgeCheckIcon, ExternalLinkIcon, ThumbsUpIcon } from 'lucide-react'

import { Stars } from '@/components/stars'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { StoredReview } from '@/lib/types'

export function ReviewCard({ review }: { review: StoredReview }) {
  const initials = review.user.name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return (
    <Card size="sm">
      <CardContent className="flex gap-3">
        <Avatar size="sm">
          {review.user.thumbnail ? <AvatarImage src={review.user.thumbnail} alt="" /> : null}
          <AvatarFallback>{initials || '?'}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{review.user.name}</p>
            {review.user.localGuide ? (
              <Badge variant="secondary">
                <BadgeCheckIcon />
                Local Guide
              </Badge>
            ) : null}
            <Stars rating={review.rating} />
            {review.date ? (
              <span className="text-xs text-muted-foreground">{review.date}</span>
            ) : null}
          </div>
          {review.snippet ? (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{review.snippet}</p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No written comment.</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {review.likes ? (
              <span className="inline-flex items-center gap-1">
                <ThumbsUpIcon className="size-3.5" />
                {review.likes}
              </span>
            ) : null}
            {review.source ? <span>{review.source}</span> : null}
            {review.link ? (
              <a
                href={review.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                Open review
                <ExternalLinkIcon className="size-3.5" />
              </a>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
