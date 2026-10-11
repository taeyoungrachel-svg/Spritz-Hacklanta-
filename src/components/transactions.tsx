import { ChevronRight, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { CATEGORIES, HABIT_CATEGORY, categoryMeta, habitDef } from '../data/meta'
import type { CategoryId, TransactionAdjustment } from '../data/types'
import { effectiveTx, linkedAccountsOf, type EffectiveTx } from '../lib/calc'
import { fmtDate, fmtWeekday } from '../lib/date'
import { money, round2 } from '../lib/format'
import { useStore } from '../state/store'
import { Badge, Button, Field, IconTile, MoneyInput, Note, Sheet, Toggle, cx } from './ui'

export function TransactionRow({ e, onClick, showCategory = true, habitView }: {
  e: EffectiveTx; onClick?: () => void; showCategory?: boolean; habitView?: boolean
}) {
  const { state } = useStore()
  const account = linkedAccountsOf(state).find((a) => a.id === e.tx.accountId)
  const m = categoryMeta(e.category)
  const changed = Math.abs(e.personal - e.tx.amount) > 0.004
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cx('flex w-full items-center gap-3 rounded-2xl px-1 py-2.5 text-left transition', onClick && 'hover:bg-accent-50/60', e.excluded && habitView && 'opacity-55')}
    >
      <IconTile icon={m.icon} color={m.color} soft={m.soft} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{e.tx.merchant}</p>
        <p className="truncate text-xs text-muted">
          {fmtWeekday(e.tx.date)}
          {showCategory && <> · {m.label}</>}
        </p>
        {showCategory && account && <p className="truncate text-[11px] text-faint">{account.nickname} ••{account.last4}</p>}
        {(e.adj?.shared || (habitView && e.excluded) || (habitView && e.visits > 1) || e.adj?.category) && (
          <div className="mt-1 flex flex-wrap gap-1">
            {e.adj?.shared && <Badge tone="sky">Shared</Badge>}
            {habitView && e.excluded && <Badge tone="gray">Excluded</Badge>}
            {habitView && !e.excluded && e.visits > 1 && <Badge tone="lav">{e.visits} visits</Badge>}
            {e.adj?.category && <Badge tone="gray">Recategorized</Badge>}
          </div>
        )}
      </div>
      <div className="text-right">
        <p className="tabular text-sm font-bold">{money(e.personal, true)}</p>
        {changed && <p className="tabular text-[11px] text-faint line-through">{money(e.tx.amount, true)}</p>}
      </div>
      {onClick && <ChevronRight size={16} className="text-faint" />}
    </button>
  )
}

/** Blends a hex colour towards white, for the soft light end of each slice's gradient. */
const lighten = (hex: string, amount: number) => {
  const n = parseInt(hex.slice(1), 16)
  const mix = (c: number) => Math.round(c + (255 - c) * amount)
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`
}

/**
 * The spending donut: each slice is a soft pastel gradient, the ring sits on a warm glowing halo with a gentle shadow,
 * and the total is set in the serif heading face.
 */
export function SpendingDonutChart({ data, total, label }: {
  data: { id: CategoryId; amount: number }[]; total: number; label: string
}) {
  const chartData = data.filter((d) => d.amount > 0)
  const slices = chartData.length ? chartData : [{ id: 'other' as CategoryId, amount: 1 }]
  return (
    <div className="relative mx-auto h-[224px] w-[224px]">
      {/* halo glow behind the ring */}
      <div aria-hidden="true" className="absolute inset-3 rounded-full bg-[radial-gradient(circle,rgb(167_139_250/0.65),rgb(167_139_250/0)_70%)] blur-xl" />
      <div aria-hidden="true" className="absolute -top-2 -right-3 size-16 rounded-full bg-[radial-gradient(circle,rgb(196_181_253/0.8),rgb(196_181_253/0)_70%)] blur-lg" />
      <div className="relative h-full w-full drop-shadow-[0_10px_16px_rgb(124_58_237/0.22)]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {slices.map((d) => {
                const c = chartData.length ? categoryMeta(d.id).color : '#d9d6e0'
                return (
                  <linearGradient key={d.id} id={`slice-${d.id}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={lighten(c, 0.5)} />
                    <stop offset="100%" stopColor={c} />
                  </linearGradient>
                )
              })}
            </defs>
            <Pie
              data={slices}
              dataKey="amount"
              nameKey="id"
              innerRadius={78}
              outerRadius={106}
              paddingAngle={slices.length > 1 ? 3 : 0}
              cornerRadius={12}
              minAngle={16}
              stroke="none"
              startAngle={90}
              endAngle={-270}
              animationDuration={750}
              isAnimationActive
            >
              {slices.map((d) => <Cell key={d.id} fill={`url(#slice-${d.id})`} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className="tabular text-[32px] leading-tight font-bold tracking-tight">{money(Math.round(total))}</p>
      </div>
    </div>
  )
}

/**
 * Lets the user correct a bank transaction. The imported record is never modified;
 * corrections are saved as an adjustment that habit tracking and insights read from.
 */
/**
 * Restaurants, groceries and shopping open the full review layout (shared purchases and reimbursements, plus habit options
 * where they apply). Every other category shows simple transaction details.
 */
const REVIEW_CATEGORIES: CategoryId[] = ['restaurants', 'groceries', 'shopping']
const sheetTitle = (c: CategoryId) => (REVIEW_CATEGORIES.includes(c) ? 'Review transaction' : 'Transaction details')

export function TransactionEditSheet({ txId, onClose }: { txId: string | null; onClose: () => void }) {
  const { state, update, toast } = useStore()
  const tx = state.transactions.find((t) => t.id === txId)
  // The title follows the category currently selected in the sheet.
  const [live, setLive] = useState<{ id: string; category: CategoryId } | null>(null)
  const category = live && live.id === txId ? live.category : tx ? (state.adjustments[tx.id]?.category ?? tx.category) : 'other'
  return (
    <Sheet open={!!tx} onClose={onClose} title={sheetTitle(category)}>
      {tx && (
        <EditBody
          key={tx.id}
          txId={tx.id}
          onCategory={(c) => setLive({ id: tx.id, category: c })}
          onDone={(msg) => { if (msg) toast(msg); onClose() }}
          update={update}
        />
      )}
    </Sheet>
  )
}

function EditBody({ txId, onDone, onCategory, update }: {
  txId: string; onDone: (msg?: string) => void; onCategory: (c: CategoryId) => void; update: ReturnType<typeof useStore>['update']
}) {
  const { state } = useStore()
  const tx = state.transactions.find((t) => t.id === txId)!
  const existing = state.adjustments[txId] ?? {}
  const [category, setCategory] = useState<CategoryId>(existing.category ?? tx.category)
  const [shared, setShared] = useState(!!existing.shared)
  const [reimb, setReimb] = useState(existing.reimbursement ? String(existing.reimbursement) : '')
  const [personal, setPersonal] = useState(existing.personalAmount !== undefined ? String(existing.personalAmount) : '')
  const [excluded, setExcluded] = useState(!!existing.excluded)
  // Habit options only apply while the transaction stays in its habit's category.
  const habit = tx.habit && category === HABIT_CATEGORY[tx.habit] ? habitDef(tx.habit) : null

  const review = REVIEW_CATEGORIES.includes(category)
  const reimbNum = review && shared ? Number(reimb) || 0 : 0
  const computedPersonal = Math.max(0, round2(tx.amount - reimbNum))
  const personalNum = personal === '' ? computedPersonal : Number(personal)
  const reimbError = reimbNum > tx.amount ? 'Reimbursement can’t exceed the transaction amount.' : undefined
  const personalError = review && personal !== '' && (isNaN(personalNum) || personalNum > tx.amount) ? `Must be between $0 and ${money(tx.amount, true)}.` : undefined

  const preview = effectiveTx(tx, buildAdj())
  function buildAdj(): TransactionAdjustment | undefined {
    const a: TransactionAdjustment = {}
    if (category !== tx.category) a.category = category
    if (habit && excluded) a.excluded = true
    if (review) {
      if (shared) {
        a.shared = true
        if (reimbNum > 0) a.reimbursement = round2(reimbNum)
      }
      if (personal !== '' && !isNaN(personalNum) && Math.abs(personalNum - computedPersonal) > 0.004) a.personalAmount = round2(personalNum)
    }
    return Object.keys(a).length ? a : undefined
  }

  function save() {
    if (reimbError || personalError) return
    const adj = buildAdj()
    update((s) => {
      const next = { ...s.adjustments }
      if (adj) next[txId] = adj
      else delete next[txId]
      return { ...s, adjustments: next }
    })
    onDone('Changes saved. The original bank record is kept')
  }

  function reset() {
    update((s) => {
      const next = { ...s.adjustments }
      delete next[txId]
      return { ...s, adjustments: next }
    })
    onDone('Restored to the original bank record')
  }

  return (
    <div className="space-y-5 pt-2">
      <div className="rounded-2xl border border-line bg-paper p-4">
        <p className="text-xs font-semibold tracking-wide text-faint uppercase">Original bank record</p>
        <div className="mt-2 flex items-baseline justify-between">
          <p className="font-bold">{tx.merchant}</p>
          <p className="tabular font-bold">{money(tx.amount, true)}</p>
        </div>
        <p className="text-xs text-muted">{fmtDate(tx.date)} · {categoryMeta(tx.category).label}{tx.memo ? ` · ${tx.memo}` : ''}</p>
      </div>

      <Field label="Category">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => { setCategory(c.id); onCategory(c.id) }}
              className={cx('rounded-full border px-3 py-1.5 text-xs font-semibold transition', category === c.id ? 'border-transparent text-white' : 'border-line bg-paper text-ink')}
              style={category === c.id ? { background: c.color } : undefined}
            >
              {c.label}
            </button>
          ))}
        </div>
      </Field>

      {review && (
        <div className="animate-fade-in space-y-4">
          <p className="text-xs font-semibold tracking-wide text-faint uppercase">
            {habit ? `For your ${habit.name.toLowerCase()} tracking` : 'Your share of this purchase'}
          </p>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Shared purchase</p>
              <p className="text-xs text-muted">You paid for others too</p>
            </div>
            <Toggle checked={shared} onChange={setShared} label="Shared purchase" />
          </div>
          {shared && (
            <div className="animate-fade-in">
              <Field label="Reimbursed to you" error={reimbError} hint="e.g. friends paid you back by Venmo">
                <MoneyInput value={reimb} onChange={setReimb} error={!!reimbError} ariaLabel="Reimbursement amount" />
              </Field>
            </div>
          )}
          <Field label="Your personal spending" error={personalError} hint={`Defaults to ${money(computedPersonal, true)} (amount minus reimbursements).`}>
            <MoneyInput value={personal} onChange={setPersonal} placeholder={computedPersonal.toFixed(2)} error={!!personalError} ariaLabel="Personal amount" />
          </Field>
          {habit && (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Exclude from habit</p>
                <p className="text-xs text-muted">Unrelated or miscategorized</p>
              </div>
              <Toggle checked={excluded} onChange={setExcluded} label="Exclude from habit" />
            </div>
          )}
          <Note tone="gray">
            {habit ? (
              <>Counts toward your challenge as <b>{excluded ? 'nothing (excluded)' : `${habit.metric === 'visits' ? `${preview.visits} visit${preview.visits === 1 ? '' : 's'}, ` : ''}${money(preview.personal, true)} personal spending`}</b>.</>
            ) : (
              <>Counts toward your spending as <b>{money(preview.personal, true)}</b>.</>
            )}
          </Note>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {state.adjustments[txId] && (
          <Button variant="outline" onClick={reset} aria-label="Reset to original">
            <RotateCcw size={16} />
          </Button>
        )}
        <Button full onClick={save} disabled={!!reimbError || !!personalError}>Save changes</Button>
      </div>
    </div>
  )
}
