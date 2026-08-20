import { StarIcon } from 'lucide-react'

import { reviewStarCount } from '@/lib/reviews'
import { cn } from '@/lib/utils'

export function Stars({ rating, className }: { rating: number; className?: string }) {
  const value = reviewStarCount(rating)

  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`${rating} stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <StarIcon
          key={index}
          className={cn(
            'size-3.5',
            index < value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30',
          )}
        />
      ))}
    </span>
  )
}
