export const WEIGHT_TOTAL = 100
export const WEIGHT_EPSILON = 0.005

export function roundWeight(value: number): number {
  return Math.round(value * 100) / 100
}

export function parseWeight(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.')
  if (trimmed === '') return 0
  const value = Number(trimmed)
  if (!Number.isFinite(value)) return null
  return value
}

export function weightsTotal(weights: number[]): number {
  const sum = weights.reduce((total, value) => total + value, 0)
  return roundWeight(sum)
}

export function formatWeight(value: number): string {
  if (!Number.isFinite(value)) return '0'
  const rounded = roundWeight(value)
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

export function validateWeights(weights: number[]): { ok: boolean; total: number; error?: string } {
  if (weights.some((value) => !Number.isFinite(value) || value < 0)) {
    return {
      ok: false,
      total: weightsTotal(weights.filter((value) => Number.isFinite(value))),
      error: 'Each weight must be 0 or greater.',
    }
  }

  const total = weightsTotal(weights)
  if (Math.abs(total - WEIGHT_TOTAL) > WEIGHT_EPSILON) {
    return {
      ok: false,
      total,
      error: `Weights must add up to ${WEIGHT_TOTAL}%. Current total: ${total}%.`,
    }
  }

  return { ok: true, total: WEIGHT_TOTAL }
}
