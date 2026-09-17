export const SHARE_TOTAL = 100
export const SHARE_EPSILON = 0.005

export function roundShare(value: number): number {
  return Math.round(value * 100) / 100
}

export function parseShare(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.')
  if (trimmed === '') return 0
  const value = Number(trimmed)
  if (!Number.isFinite(value)) return null
  return value
}

export function sharesTotal(shares: number[]): number {
  const sum = shares.reduce((total, value) => total + value, 0)
  return roundShare(sum)
}

export function formatShare(value: number): string {
  if (!Number.isFinite(value)) return '0'
  const rounded = roundShare(value)
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

export function validateShares(shares: number[]): { ok: boolean; total: number; error?: string } {
  if (shares.some((value) => !Number.isFinite(value) || value < 0)) {
    return {
      ok: false,
      total: sharesTotal(shares.filter((value) => Number.isFinite(value))),
      error: 'Each share must be 0 or greater.',
    }
  }

  const total = sharesTotal(shares)
  if (Math.abs(total - SHARE_TOTAL) > SHARE_EPSILON) {
    return {
      ok: false,
      total,
      error: `Shares must add up to ${SHARE_TOTAL}%. Current total: ${total}%.`,
    }
  }

  return { ok: true, total: SHARE_TOTAL }
}

export function formatWeightedAverage(value: number): string {
  if (!Number.isFinite(value)) return ''
  const rounded = Math.round(value * 100) / 100
  if (Number.isInteger(rounded)) return String(rounded)
  return rounded.toFixed(2).replace(/0$/, '')
}

export function shareWeightedAverage(items: Array<{ share: number; value: number }>): number | null {
  const valid = items.filter(
    (item) => Number.isFinite(item.share) && item.share > 0 && Number.isFinite(item.value),
  )
  if (valid.length === 0) return null

  const shareSum = valid.reduce((total, item) => total + item.share, 0)
  if (shareSum <= 0) return null

  const product = valid.reduce((total, item) => total + item.share * item.value, 0)
  return product / shareSum
}
