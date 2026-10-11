import { ChevronDown, FlaskConical, Lock } from 'lucide-react'
import { useState } from 'react'
import { TransactionEditSheet, TransactionRow } from '../components/transactions'
import { Badge, Button, Card, ProgressBar, ScreenHeader, cx } from '../components/ui'
import { habitDef } from '../data/meta'
import type { Challenge } from '../data/types'
import { challengeSummary, fmtMetric, type ChallengeSummary } from '../lib/calc'
import { addDays, fmtShort } from '../lib/date'
import { money } from '../lib/format'
import { useStore } from '../state/store'

export function challengeDescription(c: Challenge) {
  const h = habitDef(c.habitId)
  return c.metric === 'visits'
    ? `Your goal is to reduce ${h.name.toLowerCase()} from ${c.baseline} to ${c.target} per week.`
    : `Your goal is to keep shopping under ${money(c.target)} per week (usually about ${money(c.baseline)}).`
}

export function HabitTracker({ id }: { id: string }) {
  const { state, today, back, push } = useStore()
  const c = state.challenges.find((x) => x.id === id)
  const [editMode, setEditMode] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  if (!c) return <ScreenHeader onBack={back} title="Challenge not found" />
  const h = habitDef(c.habitId)
  const s = challengeSummary(state, c, today)
  const week = s.weeks[s.currentWeek]
  const left = c.target - week.total
  const over = week.total > c.target + 1e-9
  const finalized = c.status !== 'active'

  return (
    <div>
      <ScreenHeader
        onBack={back}
        title={h.challengeName}
        right={<Badge tone="lav">{s.ended ? 'Ended' : `Week ${s.currentWeek + 1} of ${c.durationWeeks}`}</Badge>}
      />
      <p className="text-sm text-muted">{challengeDescription(c)}</p>

      <Card className="mt-4">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>{c.metric === 'visits' ? 'Visits this week' : 'Spent this week'}</span>
          <span>Based on transactions</span>
        </div>
        <p className="tabular mt-2 flex items-baseline gap-1.5">
          <span className="text-[34px] leading-none font-bold tracking-tight">{c.metric === 'visits' ? week.total : money(week.total)}</span>
          <span className="text-sm text-muted">/ {c.metric === 'visits' ? `${c.target} planned visits` : `${money(c.target)} planned`}</span>
        </p>
        <ProgressBar
          className="mt-4"
          value={c.target > 0 ? Math.min(1, week.total / c.target) : week.total > 0 ? 1 : 0}
          color={over ? 'var(--color-warn-500)' : h.color}
          height={10}
        />
        <p className="mt-3 text-xs text-muted">{progressText(c, left, s)}</p>
        {c.durationWeeks > 1 && (
          <div className="mt-4 flex gap-2">
            {s.weeks.map((w) => {
              const started = today >= w.start
              const wOver = w.total > c.target + 1e-9
              return (
                <div key={w.index} className={cx('flex-1 rounded-2xl px-2 py-2 text-center', w.index === s.currentWeek && !s.ended ? 'bg-accent-100' : 'bg-cream')}>
                  <p className="text-[11px] text-muted">Week {w.index + 1}</p>
                  <p className={cx('tabular text-sm font-bold', !started ? 'text-faint' : wOver ? 'text-warn-500' : 'text-ink')}>
                    {started ? fmtMetric(c.metric, w.total).replace(' visits', '').replace(' visit', '') : 'Not yet'}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs text-muted">Usual weekly spending</p>
          <p className="tabular mt-1 text-xl font-bold">{money(s.baselineWeeklySpend)}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">{s.ended ? 'Final week’s spending' : 'This week’s spending'}</p>
          <p className="tabular mt-1 text-xl font-bold">{money(week.spend)}</p>
        </Card>
      </div>

      <Card className="mt-3" tone="lav">
        <p className="text-xs font-semibold text-accent-700">Observed spending reduction</p>
        <p className={cx('tabular mt-1 text-2xl font-bold', s.reduction >= 0 ? 'text-mint-500' : 'text-warn-500')}>
          {s.reduction >= 0 ? money(s.reduction) : `−${money(-s.reduction)}`}
        </p>
        <p className="mt-0.5 text-xs text-muted">Compared with your usual weekly spending. This isn't counted as actual savings.</p>
      </Card>

      <div className="mt-7 mb-2 flex items-center justify-between">
        <h2 className="text-[15px] font-bold tracking-tight">Recent activity</h2>
        <button
          onClick={() => setEditMode((e) => !e)}
          className={cx('rounded-full px-3 py-1 text-xs font-semibold transition', editMode ? 'bg-accent-300 text-ink' : 'bg-accent-100 text-accent-700')}
        >
          {editMode ? 'Done' : 'Edit'}
        </button>
      </div>
      {editMode && <p className="-mt-1 mb-2 text-xs text-muted">Tap a transaction to mark it shared, add a reimbursement, or exclude it.</p>}
      <Card className="px-3 py-1">
        {s.entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No {h.describe} since {fmtShort(c.startDate)}.</p>
        ) : (
          s.entries.map((e) => <TransactionRow key={e.tx.id} e={e} habitView showCategory={false} onClick={editMode ? () => setEditing(e.tx.id) : undefined} />)
        )}
      </Card>

      <div className="mt-6">
        {finalized ? (
          <Button full size="lg" variant="secondary" onClick={() => push({ name: 'result', id: c.id })}>View result</Button>
        ) : (
          <>
            <Button full size="lg" disabled={!s.ended} onClick={() => push({ name: 'review', id: c.id })}>
              {!s.ended && <Lock size={16} />} Review & Complete Challenge
            </Button>
            {!s.ended && <p className="mt-2 text-center text-xs text-muted">Available after your challenge period ends</p>}
          </>
        )}
      </div>

      {!s.ended && !finalized && <DemoWeek c={c} s={s} />}

      <TransactionEditSheet txId={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function progressText(c: Challenge, left: number, s: ChallengeSummary) {
  const fmt = (v: number) => fmtMetric(c.metric, v)
  if (s.ended) return `Over the whole challenge: ${fmt(s.total)} of ${fmt(s.allowed)} allowed.`
  if (left > 1e-9) return `${fmt(left)} left this week to stay within your target.`
  if (Math.abs(left) <= 1e-9) return `You're right at your weekly target.`
  return `${fmt(-left)} above your weekly target. The challenge looks at all ${c.durationWeeks} week${c.durationWeeks > 1 ? 's' : ''} together.`
}

function DemoWeek({ c, s }: { c: Challenge; s: ChallengeSummary }) {
  const { simulateChallengeWeek, toast } = useStore()
  const [open, setOpen] = useState(false)
  const week = s.weeks[s.currentWeek]
  const isLast = s.currentWeek === c.durationWeeks - 1
  const run = (onTarget: boolean) => {
    simulateChallengeWeek(c.id, onTarget)
    toast(isLast ? 'Challenge period ended. Ready to review' : `Moved to week ${s.currentWeek + 2}`)
  }
  return (
    <div className="mt-5 rounded-3xl border border-dashed border-line">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] font-semibold text-muted" aria-expanded={open}>
        <FlaskConical size={15} /> Demo controls
        <span className="ml-1 text-xs font-normal text-faint">fast-forward time</span>
        <ChevronDown size={16} className={cx('ml-auto transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="animate-fade-in space-y-2 px-4 pb-4">
          <p className="text-xs text-muted">Simulate the rest of week {s.currentWeek + 1} (through {fmtShort(week.end)}) with new bank transactions, then jump to {fmtShort(addDays(week.end, 1))}.</p>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="secondary" onClick={() => run(true)}>Stay on target</Button>
            <Button size="sm" variant="outline" onClick={() => run(false)}>Usual routine</Button>
          </div>
        </div>
      )}
    </div>
  )
}

