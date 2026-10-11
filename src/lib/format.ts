const whole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const cents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Whole dollars unless the value has meaningful cents (or `exact` is set). */
export function money(n: number, exact = false): string {
  const v = Math.round(n * 100) / 100
  if (exact || Math.abs(v % 1) > 0.001) return cents.format(v)
  return whole.format(v)
}

export const money0 = (n: number) => whole.format(Math.round(n))

export function pct(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)}%`
}

export const round2 = (n: number) => Math.round(n * 100) / 100

export const uid = (prefix = 'id') => `${prefix}-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
