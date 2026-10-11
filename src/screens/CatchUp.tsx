import { CalendarClock, CircleCheck, LoaderCircle, Lock, Wallet } from 'lucide-react'
import { useState } from 'react'
import { GoalIcon } from '../components/goals'
import { Button, Card, ConfirmationModal, MoneyInput, Note, ScreenHeader, Segmented, cx } from '../components/ui'
import { catchUpPlan, isSettled, projectGoal, transferAccounts } from '../lib/calc'
import { fmtDate } from '../lib/date'
import { money } from '../lib/format'
import { useStore } from '../state/store'

export function CatchUp({ id }: { id: string }) {
  const { state, today, back, update, startTransfer, toast } = useStore()
  const goal = state.goals.find((g) => g.id === id)
  const [option, setOption] = useState<'once' | 'monthly'>('once')
  const plan = goal ? catchUpPlan(goal, state.contributions, today) : null
  const [once, setOnce] = useState(plan ? String(plan.oneTimeNeeded) : '')
  const [monthly, setMonthly] = useState(plan?.monthlyNeeded ?? goal?.monthlyContribution ?? 0)
  const [transferId, setTransferId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)
  if (!goal || !plan) return <ScreenHeader onBack={back} title="Goal not found" />

  const base = projectGoal(goal, state.contributions, today)
  const onceNum = Number(once) || 0
  const rows = transferId ? state.contributions.filter((c) => c.transferId === transferId) : []
  const settled = rows.length > 0 && rows.every(isSettled)
  const withOnce = projectGoal(goal, state.contributions, today, { extraNow: settled ? 0 : onceNum })
  const withMonthly = projectGoal(goal, state.contributions, today, { monthly })
  const sliderMax = Math.max(goal.monthlyContribution * 2, (plan.monthlyNeeded ?? 0) * 1.5, 100)

  function dismiss() {
    update((s) => ({ ...s, goals: s.goals.map((g) => (g.id === goal!.id ? { ...g, catchUpDismissedFor: base.estimate ?? undefined } : g)) }))
    toast(`Keeping your current plan. New estimate ${base.estimate ? fmtDate(base.estimate) : 'N/A'}`)
    back()
  }

  function applyMonthly() {
    update((s) => ({ ...s, goals: s.goals.map((g) => (g.id === goal!.id ? { ...g, monthlyContribution: monthly } : g)) }))
    setConfirm(false)
    toast('Contribution plan updated')
    back()
  }

  return (
    <div>
      <ScreenHeader onBack={back} title="Catch-up options" subtitle={goal.name} />

      <Card tone="lav">
        <div className="flex items-center gap-3">
          <GoalIcon goal={goal} size={44} />
          <div className="text-sm">
            <p>Target date <b>{fmtDate(goal.targetDate!)}</b></p>
            <p className="text-muted">Currently estimated <b className="text-ink">{base.estimate ? fmtDate(base.estimate) : 'N/A'}</b></p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">
          {money(base.remaining)} to go · {plan.periods} scheduled contribution{plan.periods === 1 ? '' : 's'} left before your target date.
        </p>
      </Card>

      <Segmented
        className="mt-5"
        value={option}
        onChange={setOption}
        options={[{ value: 'once', label: 'One-time contribution' }, { value: 'monthly', label: 'Adjust monthly' }]}
      />

      {option === 'once' ? (
        <div key="once" className="mt-4 animate-fade-in space-y-4">
          <Card>
            <p className="flex items-center gap-2 font-bold"><Wallet size={17} className="text-accent-600" /> Add a one-time amount</p>
            <p className="mt-1 text-sm text-muted">
              {plan.oneTimeNeeded > 0
                ? <>Adding <b className="text-ink">{money(plan.oneTimeNeeded)}</b> now keeps your current {money(goal.monthlyContribution)}/month plan on schedule.</>
                : 'Your current plan already reaches the target in time.'}
            </p>
            <div className="mt-4">
              <MoneyInput value={once} onChange={setOnce} ariaLabel="One-time amount" />
            </div>
            <Outcome est={withOnce.estimate} target={goal.targetDate!} complete={withOnce.status === 'complete'} />
          </Card>
          {transferId ? (
            <TransferStatus settled={settled} amount={onceNum} onDone={back} />
          ) : (
            <Button full size="lg" disabled={onceNum <= 0} onClick={() => setTransferId(startTransfer([{ goalId: goal.id, amount: onceNum }], 'catchup', transferAccounts(state)[0]?.id))}>
              <Lock size={16} /> Add Money Now
            </Button>
          )}
          <p className="text-center text-xs text-faint">Money moves from your checking account, and your balance updates once the transfer completes.</p>
        </div>
      ) : (
        <div key="monthly" className="mt-4 animate-fade-in space-y-4">
          {plan.monthlyNeeded === null ? (
            <Note tone="peach">
              There are no scheduled contributions left before {fmtDate(goal.targetDate!)}, so a new monthly amount can't restore this timeline.
              A one-time contribution of {money(base.remaining)} would.
            </Note>
          ) : (
            <Card>
              <p className="flex items-center gap-2 font-bold"><CalendarClock size={17} className="text-accent-600" /> Adjust future contributions</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Mini label="Current" value={money(goal.monthlyContribution)} />
                <Mini label="Recommended" value={money(plan.monthlyNeeded)} accent />
                <Mini label="Difference" value={`+${money(plan.monthlyNeeded - goal.monthlyContribution)}`} />
              </div>
              <p className="mt-3 text-xs text-muted">Over {plan.periods} remaining contribution{plan.periods === 1 ? '' : 's'} before your target date.</p>
              <div className="mt-5">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold">New monthly amount</span>
                  <span className="tabular text-xl font-bold text-accent-700">{money(monthly)}</span>
                </div>
                <input
                  type="range"
                  className="slider mt-3"
                  min={goal.monthlyContribution}
                  max={Math.ceil(sliderMax / 5) * 5}
                  step={5}
                  value={monthly}
                  aria-label="New monthly amount"
                  style={{ ['--fill' as string]: `${((monthly - goal.monthlyContribution) / (Math.ceil(sliderMax / 5) * 5 - goal.monthlyContribution)) * 100}%` }}
                  onChange={(e) => setMonthly(Number(e.target.value))}
                />
                <div className="mt-1 flex justify-between text-[11px] text-faint">
                  <span>{money(goal.monthlyContribution)}</span>
                  <button className="font-semibold text-accent-600" onClick={() => setMonthly(plan.monthlyNeeded!)}>Use recommended</button>
                </div>
              </div>
              <Outcome est={withMonthly.estimate} target={goal.targetDate!} complete={withMonthly.status === 'complete'} />
            </Card>
          )}
          {plan.monthlyNeeded !== null && (
            <Button full size="lg" disabled={monthly === goal.monthlyContribution} onClick={() => setConfirm(true)}>Update Contribution Plan</Button>
          )}
          <p className="text-center text-xs text-faint">Your recurring schedule won't change until you confirm.</p>
        </div>
      )}

      {!transferId && (
        <button onClick={dismiss} className="mx-auto mt-6 block rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:text-ink">
          Keep my current plan and accept the later date
        </button>
      )}

      <ConfirmationModal
        open={confirm}
        title="Update your plan?"
        message={<>Your {goal.name} contribution will change from <b>{money(goal.monthlyContribution)}</b> to <b>{money(monthly)}</b> per month, starting {fmtDate(goal.nextContributionDate)}.</>}
        confirmLabel="Update plan"
        onConfirm={applyMonthly}
        onCancel={() => setConfirm(false)}
      />
    </div>
  )
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cx('rounded-2xl px-2 py-3', accent ? 'bg-accent-100' : 'bg-cream')}>
      <p className="text-[11px] text-muted">{label}</p>
      <p className={cx('tabular mt-0.5 font-bold', accent && 'text-accent-700')}>{value}</p>
    </div>
  )
}

function Outcome({ est, target, complete }: { est: string | null; target: string; complete: boolean }) {
  const ok = complete || (est !== null && est <= target)
  return (
    <div className={cx('mt-4 rounded-2xl px-4 py-3 transition-colors', ok ? 'bg-mint-50' : 'bg-warn-50')}>
      <p className="text-xs text-muted">Updated estimated completion</p>
      <p key={est ?? '-'} className="animate-fade-in font-bold">{complete ? 'Goal reached right away' : est ? fmtDate(est) : 'N/A'}</p>
      <p className={cx('mt-0.5 text-xs', ok ? 'text-mint-500' : 'text-[#4c1d95]')}>
        {ok ? 'Back on track for your target date.' : `Still after your ${fmtDate(target)} target. You can increase the amount or accept the later date.`}
      </p>
    </div>
  )
}

function TransferStatus({ settled, amount, onDone }: { settled: boolean; amount: number; onDone: () => void }) {
  return (
    <Card className="text-center">
      <div className={cx('mx-auto grid size-12 place-items-center rounded-full', settled ? 'animate-pop bg-mint-50 text-mint-500' : 'bg-accent-50 text-accent-600')}>
        {settled ? <CircleCheck size={26} /> : <LoaderCircle size={24} className="animate-spin" />}
      </div>
      <p className="mt-2 font-bold">{settled ? `${money(amount)} added` : 'Transfer pending…'}</p>
      <p className="text-xs text-muted">{settled ? 'Your goal balance and timeline have been updated.' : 'Moving money from your checking account into this goal.'}</p>
      {settled && <Button full className="mt-4" onClick={onDone}>Back to goal</Button>}
    </Card>
  )
}
