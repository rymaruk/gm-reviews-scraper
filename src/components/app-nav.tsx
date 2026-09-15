'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MenuIcon, RefreshCwIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function AppHeader({
  current,
  onScrapeAll,
  scraping = false,
  hasCampaigns = false,
}: {
  current: 'reviews' | 'metrics'
  onScrapeAll?: () => void
  scraping?: boolean
  hasCampaigns?: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b bg-sidebar px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <div className="relative">
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MenuIcon />
          </Button>
          {menuOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              />
              <div
                role="menu"
                className="absolute top-full left-0 z-50 mt-1 min-w-40 rounded-lg bg-popover p-1 shadow-md ring-1 ring-foreground/10"
              >
                <MenuLink href="/" active={current === 'reviews'} onNavigate={() => setMenuOpen(false)}>
                  Reviews
                </MenuLink>
                <MenuLink
                  href="/metrics"
                  active={current === 'metrics'}
                  onNavigate={() => setMenuOpen(false)}
                >
                  Metrics
                </MenuLink>
              </div>
            </>
          ) : null}
        </div>
        <p className="font-heading truncate text-lg font-medium">GoogleMap Reviews</p>
      </div>
      {onScrapeAll ? (
        <Button type="button" onClick={onScrapeAll} disabled={scraping || !hasCampaigns}>
          <RefreshCwIcon className={scraping ? 'animate-spin' : undefined} />
          Scrape all
        </Button>
      ) : null}
    </header>
  )
}

function MenuLink({
  href,
  active,
  onNavigate,
  children,
}: {
  href: string
  active: boolean
  onNavigate: () => void
  children: string
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center rounded-md px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
        active && 'bg-accent text-accent-foreground',
      )}
      onClick={onNavigate}
    >
      {children}
    </Link>
  )
}
