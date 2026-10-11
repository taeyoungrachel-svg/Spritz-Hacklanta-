import { cx } from './ui'

/** Months and weeks entry on one row: [ n ] months  [ n ] weeks. Either may be 0, but not both. */
export function DurationFields({ months, weeks, onMonths, onWeeks, invalid }: {
  months: string; weeks: string; onMonths: (v: string) => void; onWeeks: (v: string) => void; invalid?: boolean
}) {
  const box = (label: string, value: string, set: (v: string) => void) => (
    <>
      <input
        inputMode="numeric"
        aria-label={label}
        value={value}
        onChange={(e) => set(e.target.value.replace(/\D/g, '').slice(0, 2))}
        onBlur={() => set(String(Number(value) || 0))}
        onFocus={(e) => e.target.select()}
        className={cx(
          'tabular h-12 w-[68px] shrink-0 rounded-2xl border bg-paper px-2 text-center text-[15px] font-semibold outline-none transition focus:border-accent-400 focus:ring-4 focus:ring-accent-100',
          invalid ? 'border-rose-500/60' : 'border-line',
        )}
      />
      <span className="text-sm font-medium text-muted">{label.toLowerCase()}</span>
    </>
  )
  return (
    <div className="flex items-center gap-2.5">
      {box('Months', months, onMonths)}
      <span className="w-1.5" />
      {box('Weeks', weeks, onWeeks)}
    </div>
  )
}

/** Whole challenge weeks for a months + weeks entry (a month counts as 52/12 weeks), or an error message. */
export function challengeWeeks(monthsText: string, weeksText: string): { weeks: number; error?: string } {
  const months = Number(monthsText) || 0
  const weeks = Number(weeksText) || 0
  if (months + weeks <= 0) return { weeks: 0, error: 'Enter at least 1 week or 1 month.' }
  const total = Math.max(1, Math.round((months * 52) / 12 + weeks))
  if (total > 52) return { weeks: total, error: 'Challenges can run up to 52 weeks.' }
  return { weeks: total }
}
