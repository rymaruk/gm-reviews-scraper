import type { RatingFilter, SortOption, TimeRange } from '@/lib/types'

const RATINGS = new Set<RatingFilter>(['all', '5', '4', '3', '2', '1'])
const SORTS = new Set<SortOption>(['newest', 'oldest'])
const RANGES = new Set<TimeRange>(['all', '7d', '30d', '90d', '365d', 'custom'])

export type FilterParams = {
  query: string
  rating: RatingFilter
  sort: SortOption
  timeRange: TimeRange
  fromDate: string
  toDate: string
  company: string
  city: string
}

export const defaultFilterParams: FilterParams = {
  query: '',
  rating: 'all',
  sort: 'newest',
  timeRange: 'all',
  fromDate: '',
  toDate: '',
  company: 'all',
  city: 'all',
}

export function readFilterParams(search = window.location.search): FilterParams {
  const params = new URLSearchParams(search)
  const rating = params.get('rating')
  const sort = params.get('sort')
  const range = params.get('range')
  const company = params.get('company')?.trim()
  const city = params.get('city')?.trim()

  return {
    query: params.get('q')?.trim() ?? '',
    rating: isRating(rating) ? rating : 'all',
    sort: isSort(sort) ? sort : 'newest',
    timeRange: isRange(range) ? range : 'all',
    fromDate: params.get('from')?.trim() ?? '',
    toDate: params.get('to')?.trim() ?? '',
    company: company && company.length > 0 ? company : 'all',
    city: city && city.length > 0 ? city : 'all',
  }
}

export function writeFilterParams(filters: FilterParams): void {
  const params = new URLSearchParams()

  if (filters.query) params.set('q', filters.query)
  if (filters.rating !== 'all') params.set('rating', filters.rating)
  if (filters.sort !== 'newest') params.set('sort', filters.sort)
  if (filters.timeRange !== 'all') params.set('range', filters.timeRange)
  if (filters.timeRange === 'custom' && filters.fromDate) params.set('from', filters.fromDate)
  if (filters.timeRange === 'custom' && filters.toDate) params.set('to', filters.toDate)
  if (filters.company !== 'all') params.set('company', filters.company)
  if (filters.city !== 'all') params.set('city', filters.city)

  const query = params.toString()
  const next = query ? `${window.location.pathname}?${query}` : window.location.pathname
  const current = `${window.location.pathname}${window.location.search}`
  if (next !== current) {
    window.history.replaceState(null, '', next)
  }
}

function isRating(value: string | null): value is RatingFilter {
  return value != null && RATINGS.has(value as RatingFilter)
}

function isSort(value: string | null): value is SortOption {
  return value != null && SORTS.has(value as SortOption)
}

function isRange(value: string | null): value is TimeRange {
  return value != null && RANGES.has(value as TimeRange)
}
