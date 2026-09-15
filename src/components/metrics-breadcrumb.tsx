import Link from 'next/link'

export function MetricsBreadcrumb() {
  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <li>
          <Link href="/" className="transition-colors hover:text-foreground">
            GoogleMap Reviews
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <span aria-current="page" className="font-medium text-foreground">
            Metrics
          </span>
        </li>
      </ol>
    </nav>
  )
}
