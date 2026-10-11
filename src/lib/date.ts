// Dates are stored as local "YYYY-MM-DD" strings so comparisons are simple and timezone-safe.

const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function realToday(): string {
  return toISO(new Date())
}

export function addDays(s: string, n: number): string {
  const d = parseISO(s)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** Adds months, pinning to `day` (clamped to the month's length) when given. */
export function addMonths(s: string, n: number, day?: number): string {
  const d = parseISO(s)
  const targetDay = day ?? d.getDate()
  const r = new Date(d.getFullYear(), d.getMonth() + n, 1)
  const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate()
  r.setDate(Math.min(targetDay, last))
  return toISO(r)
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseISO(a).getTime() - parseISO(b).getTime()) / 86_400_000)
}

/** Monday-based start of week. */
export function startOfWeek(s: string): string {
  const d = parseISO(s)
  const dow = (d.getDay() + 6) % 7
  return addDays(s, -dow)
}

export function dayOfMonth(s: string): number {
  return parseISO(s).getDate()
}

/** First date on or after `from` that falls on `day` of a month. */
export function nextOnOrAfter(from: string, day: number): string {
  const d = parseISO(from)
  const sameMonth = addMonths(toISO(new Date(d.getFullYear(), d.getMonth(), 1)), 0, day)
  return sameMonth >= from ? sameMonth : addMonths(sameMonth, 1, day)
}

/** First date strictly after `from` that falls on `day` of a month. */
export function nextAfter(from: string, day: number): string {
  return nextOnOrAfter(addDays(from, 1), day)
}

export function minDate(a: string, b: string) {
  return a < b ? a : b
}
export function maxDate(a: string, b: string) {
  return a > b ? a : b
}

export function fmtDate(s: string, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }) {
  return parseISO(s).toLocaleDateString('en-US', opts)
}
export const fmtShort = (s: string) => fmtDate(s, { month: 'short', day: 'numeric' })
export const fmtMonthYear = (s: string) => fmtDate(s, { month: 'long', year: 'numeric' })
export const fmtMonth = (s: string) => fmtDate(s, { month: 'long' })
export const fmtWeekday = (s: string) => fmtDate(s, { weekday: 'short', month: 'short', day: 'numeric' })

export function relativeDays(n: number): string {
  if (n <= 0) return 'Today'
  if (n === 1) return '1 day'
  return `${n} days`
}
