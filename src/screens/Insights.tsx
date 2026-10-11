import { X } from 'lucide-react'
import { useState } from 'react'
import { ExploreHabitCard } from '../components/habits'
import { SpendingDonutChart, TransactionEditSheet, TransactionRow } from '../components/transactions'
import { Card, SectionTitle, Segmented, cx } from '../components/ui'
import { CATEGORIES, HABITS, categoryMeta } from '../data/meta'
import type { CategoryId } from '../data/types'
import { apportion, habitEntries, spendingByCategory, txInRange } from '../lib/calc'
import { addDays, fmtShort } from '../lib/date'
import { money } from '../lib/format'
import { useStore } from '../state/store'

export function Insights() {
  const { state, today, push } = useStore()
  const [range, setRange] = useState<'week' | 'month'>('week')
  const [filter, setFilter] = useState<CategoryId | null>(null)
  const [limit, setLimit] = useState(15)
  const [editing, setEditing] = useState<string | null>(null)

  const from = addDays(today, range === 'week' ? -6 : -29)
  const items = txInRange(state, from, today)
  const { total, totals } = spendingByCategory(items)
  const data = CATEGORIES.map((c) => ({ id: c.id, amount: totals.get(c.id) ?? 0 }))
  // Whole-dollar amounts and whole percentages are rounded together so they add up to the total and to 100%.
  const shownAmounts = total > 0 ? apportion(Math.round(total), data.map((d) => d.amount)) : data.map(() => 0)
  const shownPcts = total > 0 ? apportion(100, data.map((d) => d.amount)) : data.map(() => 0)
  const list = items.filter((e) => !filter || e.category === filter).sort((a, b) => (a.tx.date < b.tx.date ? 1 : -1))

  return (
    <div className="pt-4">
      <h1 className="text-[26px] font-extrabold tracking-tight">Insights</h1>
      <p className="text-sm text-muted">{fmtShort(from)} – {fmtShort(today)}</p>

      <Segmented
        className="mt-4"
        value={range}
        onChange={(r) => { setRange(r); setLimit(15) }}
        options={[{ value: 'week', label: 'Weekly' }, { value: 'month', label: 'Monthly' }]}
      />

      <Card className="mt-4">
        <SpendingDonutChart key={range} data={data} total={total} label={range === 'week' ? 'Last 7 days' : 'Last 30 days'} />
        <div className="mt-4 space-y-1">
          {data.map((d, i) => {
            const m = categoryMeta(d.id)
            const on = filter === d.id
            return (
              <button
                key={d.id}
                onClick={() => setFilter(on ? null : d.id)}
                aria-pressed={on}
                className={cx('flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition', on ? 'bg-accent-50 ring-1 ring-accent-200' : 'hover:bg-cream', filter && !on && 'opacity-50')}
              >
                <span className="size-3 rounded-full" style={{ background: m.color }} />
                <span className="flex-1 text-sm font-medium">{m.label}</span>
                <span className="tabular text-sm font-bold">{money(shownAmounts[i])}</span>
                <span className="tabular w-11 text-right text-xs text-muted">{shownPcts[i]}%</span>
              </button>
            )
          })}
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-[15px] font-bold tracking-tight">Transactions</h2>
            {filter && (
              <button onClick={() => setFilter(null)} className="flex items-center gap-1 rounded-full bg-accent-100 py-1 pr-2 pl-3 text-xs font-semibold text-accent-700">
                {categoryMeta(filter).label} <X size={13} />
              </button>
            )}
          </div>
          {list.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No transactions in this category for this period.</p>
          ) : (
            <div className="-mx-1">
              {list.slice(0, limit).map((e) => <TransactionRow key={e.tx.id} e={e} onClick={() => setEditing(e.tx.id)} />)}
            </div>
          )}
          {list.length > limit && (
            <button onClick={() => setLimit((l) => l + 20)} className="mt-1 w-full border-t border-line pt-3 text-sm font-semibold text-accent-600">
              Show more ({list.length - limit})
            </button>
          )}
        </div>
      </Card>

      <SectionTitle>Explore your habits</SectionTitle>
      <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6">
        {HABITS.map((h) => {
          const week = habitEntries(state, h.id, addDays(today, -6), today).filter((e) => !e.excluded)
          return (
            <ExploreHabitCard
              key={h.id}
              h={h}
              visits={week.reduce((n, e) => n + e.visits, 0)}
              spent={week.reduce((n, e) => n + e.personal, 0)}
              onClick={() => push({ name: 'habit', habitId: h.id })}
            />
          )
        })}
      </div>


      <TransactionEditSheet txId={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
