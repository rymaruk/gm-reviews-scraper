'use client'

import Link from 'next/link'

import { cn } from '@/lib/utils'

export function AppNav({ current }: { current: 'reviews' | 'metrics' }) {
  return (
    <nav className="flex items-center gap-1" aria-label="App">
      <NavLink href="/" active={current === 'reviews'}>
        Reviews
      </NavLink>
      <NavLink href="/metrics" active={current === 'metrics'}>
        Metric
      </NavLink>
    </nav>
  )
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-lg px-2 py-1 text-xs font-medium transition-colors',
        active
          ? 'bg-background text-foreground shadow-sm ring-1 ring-foreground/10'
          : 'text-muted-foreground hover:bg-background/70 hover:text-foreground',
      )}
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </Link>
  )
}
