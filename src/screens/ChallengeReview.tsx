import { Check, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { TransactionEditSheet } from '../components/transactions'
import { Button, Card, ConfirmationModal, Note, ScreenHeader, cx } from '../components/ui'
import type { HabitId } from '../data/types'
import { challengeSummary, fmtMetric } from '../lib/calc'
import { fmtDate, fmtWeekday } from '../lib/date'
import { money } from '../lib/format'
import { useStore } from '../state/store'

export const HABIT_WORD: Record<HabitId, string> = { coffee: 'coffee', dining: 'dining out', shopping: 'shopping' }

export function ChallengeReview({ id }: { id: string }) {
  const { state, today, back, update, replace } = useStore()
  const c = state.challenges.find((x) => x.id === id)
  const [editing, setEditing] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)
  if (!c) return <ScreenHeader onBack={back} title="Challenge not found" />
  const s = challengeSummary(state, c, today)
  const word = HABIT_WORD[c.habitId]
  const noun = c.metric === 'visits' ? 'visits' : 'spending'
  const success = s.total <= s.allowed + 1e-9
  const usual = s.baselineWeeklySpend * c.durationWeeks

  /** Include / exclude a transaction. The imported bank record is never touched, only the adjustment. */
  function toggleIncluded(txId: string, excluded: boolean) {
    update((st) => {
      const adj = { ...(st.adjustments[txId] ?? {}) }
      if (excluded) adj.excluded = true
      else delete adj.excluded
      const next = { ...st.adjustments }
      if (Object.values(adj).some((v) => v !== undefined && v !== false)) next[txId] = adj
      else delete next[txId]
      return { ...st, adjustments: next }
    })
  }

  function finalize() {
    update((st) => ({
      ...st,
      challenges: st.challenges.map((x) =>
        x.id === c!.id
          ? { ...x, status: success ? 'completed' : 'not_completed', finalizedAt: today, result: { total: s.total, allowed: s.allowed, usualSpend: usual, actualSpend: s.actualToDate } }
          : x,
      ),
    }))
    replace({ name: 'result', id: c!.id })
  }

  if (!s.ended) {
    return (
      <div>
        <ScreenHeader onBack={back} title="Review Your Challenge" />
        <Note tone="peach">This challenge runs until {fmtDate(s.end)}. You can review and complete it after that.</Note>
      </div>
    )
  }

  return (
    <div>
      <ScreenHeader onBack={back} title="Review Your Challenge" />
      <p className="text-sm text-muted">Review your {word} transactions before confirming your final result.</p>

      <Card className="mt-4 space-y-3">
        <Row label="Your weekly target" value={fmtMetric(c.metric, c.target)} />
        {c.durationWeeks > 1 && <Row label={`Allowed over ${c.durationWeeks} weeks`} value={fmtMetric(c.metric, s.allowed)} />}
        <Row label={c.metric === 'visits' ? 'Recorded visits' : 'Recorded spending'} value={fmtMetric(c.metric, s.total)} />
        <Row label="Personal spending" value={money(s.actualToDate)} />
      </Card>

      <div className="mt-7 mb-2 flex items-baseline justify-between">
        <h2 className="text-[15px] font-bold tracking-tight">Review transactions</h2>
        <span className="text-xs text-muted">Edit below</span>
      </div>

      {s.entries.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line p-5 text-center text-sm text-muted">No {word} transactions during this challenge.</p>
      ) : (
        <div className="space-y-2.5">
          {s.entries.map((e) => (
            <div key={e.tx.id} className={cx('flex items-center gap-3 rounded-2xl border bg-paper p-3 pl-4 shadow-soft transition', e.excluded ? 'border-line opacity-70' : 'border-line')}>
              <button onClick={() => setEditing(e.tx.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-label={`Edit ${e.tx.merchant}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{fmtWeekday(e.tx.date)} · {e.tx.merchant}</p>
                  <p className="tabular text-xs text-muted">
                    {money(e.personal, true)} · {e.excluded ? 'Excluded from challenge' : 'Included in challenge'}
                    {e.adj?.shared && ' · Shared'}
                  </p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-faint" />
              </button>
              <button
                role="switch"
                aria-checked={!e.excluded}
                aria-label={e.excluded ? `Include ${e.tx.merchant}` : `Exclude ${e.tx.merchant}`}
                onClick={() => toggleIncluded(e.tx.id, !e.excluded)}
                className={cx('grid size-8 shrink-0 place-items-center rounded-full border-2 transition active:scale-90', e.excluded ? 'border-line text-transparent' : 'border-accent-600 bg-accent-600 text-white')}
              >
                <Check size={16} strokeWidth={3} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 px-1">
        <p className={cx('text-sm font-semibold', success ? 'text-mint-500' : 'text-warn-500')}>
          {success ? `Your recorded ${noun} are within your target.` : `Your recorded ${noun} are above your target.`}
        </p>
        <p className="mt-0.5 text-xs text-muted">This is a preview. Your final result is confirmed when you complete the review.</p>
      </div>

      <Button full size="lg" className="mt-6" onClick={() => setConfirm(true)}>Confirm & Complete Challenge</Button>

      <TransactionEditSheet txId={editing} onClose={() => setEditing(null)} />
      <ConfirmationModal
        open={confirm}
        title="Complete this challenge?"
        message="We'll compare your results across the full challenge period with the target you set at the start. Transactions can't be edited for this challenge afterward."
        confirmLabel="Complete"
        onConfirm={finalize}
        onCancel={() => setConfirm(false)}
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="tabular font-semibold">{value}</span>
    </div>
  )
}
