'use client'

import { AppHeader } from '@/components/app-nav'
import { MetricsBreadcrumb } from '@/components/metrics-breadcrumb'
import { Skeleton } from '@/components/ui/skeleton'

export function ReviewsRouteSkeleton() {
  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background" aria-busy="true">
      <span className="sr-only">Loading reviews</span>
      <AppHeader current="reviews" />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex h-full w-80 shrink-0 flex-col border-r bg-sidebar">
          <div className="flex items-center gap-1 px-3 py-3">
            <Skeleton className="size-7 rounded-lg" />
            <Skeleton className="size-7 rounded-lg" />
            <Skeleton className="ml-auto size-7 rounded-lg" />
          </div>
          <div className="px-3 pb-3">
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-2 px-3 pb-3">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-[58px] rounded-xl" />
            ))}
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-3 pb-4">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="flex min-w-full items-start gap-3 rounded-xl px-3 py-3">
                <Skeleton className="size-8 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-36 max-w-full" />
                  <Skeleton className="h-3 w-52 max-w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </aside>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 flex-col gap-3 border-b bg-background px-4 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <Skeleton className="h-8 min-w-0 flex-1 rounded-lg" />
              <Skeleton className="h-8 w-full rounded-lg sm:w-44" />
              <Skeleton className="h-8 w-full rounded-lg sm:w-36" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <div className="flex flex-col gap-10 p-4 pb-24">
              {Array.from({ length: 3 }, (_, index) => (
                <section key={index} className="rounded-2xl border bg-card p-4 shadow-sm">
                  <div className="mb-4 flex items-start gap-3">
                    <Skeleton className="size-12 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-4 w-72 max-w-full" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                  </div>
                </section>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export function MetricsRouteSkeleton() {
  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background" aria-busy="true">
      <span className="sr-only">Loading metrics</span>
      <AppHeader current="metrics" />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
          <div>
            <MetricsBreadcrumb />
            <Skeleton className="h-9 w-40" />
            <Skeleton className="mt-2 h-4 w-full max-w-xl" />
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Skeleton className="h-8 min-w-0 flex-1 rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg sm:w-48" />
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
          <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <div className="flex items-center justify-between bg-muted/90 px-4 py-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            {Array.from({ length: 2 }, (_, group) => (
              <div key={group}>
                <div className="border-t bg-muted/50 px-4 py-2">
                  <Skeleton className="h-3 w-32" />
                </div>
                {Array.from({ length: 3 }, (_, row) => (
                  <div key={row} className="flex items-start justify-between gap-4 border-t px-4 py-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-48 max-w-full" />
                      <Skeleton className="h-3 w-64 max-w-full" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-8 w-24 shrink-0" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </main>
      <div className="flex shrink-0 items-center gap-3 border-t bg-sidebar px-4 py-3">
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  )
}
