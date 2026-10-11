import { CalendarDays, ChevronRight, CircleAlert, Clock, Flag, Info } from 'lucide-react'
import { GOAL_ICONS, goalGlowStyle, goalTint } from '../data/meta'
import type { Contribution, ContributionStatus, Goal } from '../data/types'
import { projectGoal, type Projection } from '../lib/calc'
import { diffDays, fmtDate, fmtMonth, fmtMonthYear, fmtShort } from '../lib/date'
import { money, pct } from '../lib/format'
import { useStore } from '../state/store'
import { Badge, Card, IconTile, Note, ProgressBar, cx } from './ui'

export function GoalIcon({ goal, size = 44 }: { goal: Goal; size?: number }) {
  const t = goalTint(goal)
  return <IconTile icon={GOAL_ICONS[goal.icon] ?? GOAL_ICONS.piggy} color={t.color} soft={t.soft} size={size} />
}

export function useProjection(goal: Goal) {
  const { state, today } = useStore()
  return projectGoal(goal, state.contributions, today)
}

export function GoalStatusBadge({ goal, p }: { goal: Goal; p: Projection }) {
  switch (p.status) {
    case 'complete': return <Badge tone="mint">Goal reached</Badge>
    case 'on-track': return <Badge tone="mint">On track</Badge>
    case 'delayed': return goal.deadlineType === 'fixed' ? <Badge tone="peach">Behind target</Badge> : <Badge tone="butter">Timeline shifted</Badge>
    case 'no-plan': return <Badge tone="gray">No monthly plan</Badge>
    default: return <Badge tone="lav">Flexible</Badge>
  }
}

/** Actual deposited savings vs. target. Optional `potential` renders as a hatched, clearly hypothetical extension. */
export function SavingsProgress({ goal, p, potential = 0, compact }: { goal: Goal; p: Projection; potential?: number; compact?: boolean }) {
  const t = goalTint(goal)
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="tabular">
          <span className={cx('font-bold', compact ? 'text-lg' : 'text-[26px] tracking-tight')}>{money(p.saved)}</span>
          <span className="text-sm text-muted"> of {money(goal.target)}</span>
        </p>
        <span className="tabular text-sm font-bold" style={{ color: t.color }}>{pct(p.progress)}</span>
      </div>
      <ProgressBar value={p.progress} potential={goal.target ? potential / goal.target : 0} color={t.color} height={compact ? 8 : 12} className="mt-2" />
    </div>
  )
}

/**
 * The goal progress bar used by the Habit Simulator and the Wishlist impact card, so both always look and calculate the same:
 * actual deposited savings, plus an optional hypothetical amount (`extra`) drawn after it.
 */
export function GoalProgressBar({ goal, p, extra = 0, extraColor, className = 'mt-3' }: {
  goal: Goal; p: Projection; extra?: number; extraColor?: string; className?: string
}) {
  return (
    <ProgressBar
      value={p.progress}
      potential={goal.target ? extra / goal.target : 0}
      color={goalTint(goal).color}
      potentialColor={extraColor}
      className={className}
      height={10}
    />
  )
}

export function delayMessage(goal: Goal, estimate: string) {
  if (!goal.targetDate) return ''
  const sameMonth = estimate.slice(0, 7) === goal.targetDate.slice(0, 7)
  if (sameMonth) return `Your savings are now projected to reach your goal around ${fmtDate(estimate)}, shortly after your ${fmtDate(goal.targetDate)} target.`
  const sameYear = estimate.slice(0, 4) === goal.targetDate.slice(0, 4)
  return `Your savings are now projected to reach your goal in ${sameYear ? fmtMonth(estimate) : fmtMonthYear(estimate)} instead of ${sameYear ? fmtMonth(goal.targetDate) : fmtMonthYear(goal.targetDate)}.`
}

export function DateProjection({ goal, p, hideNote }: { goal: Goal; p: Projection; hideNote?: boolean }) {
  const delayed = p.status === 'delayed' && p.estimate
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-cream p-3.5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted"><Flag size={13} /> Target date</p>
          <p className="mt-1 font-bold">{goal.targetDate ? fmtDate(goal.targetDate) : 'No deadline'}</p>
          <p className="mt-0.5 text-xs text-muted">{goal.deadlineType === 'fixed' ? 'Fixed deadline' : 'Flexible'}</p>
        </div>
        <div className={cx('rounded-2xl p-3.5 transition-colors', delayed ? (goal.deadlineType === 'fixed' ? 'bg-warn-50' : 'bg-butter-50') : 'bg-accent-50')}>
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted"><CalendarDays size={13} /> Est. completion</p>
          <p key={p.estimate ?? 'none'} className="mt-1 animate-fade-in font-bold">
            {p.status === 'complete' ? 'Reached 🎉' : p.estimate ? fmtDate(p.estimate) : 'N/A'}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {p.status === 'no-plan' ? 'Add a monthly plan' : p.status === 'complete' ? 'Target met' : 'Based on your plan'}
          </p>
        </div>
      </div>
      {delayed && !hideNote && (
        <div className="mt-3">
          <Note tone={goal.deadlineType === 'fixed' ? 'peach' : 'gray'} icon={<Info size={15} />}>
            {delayMessage(goal, p.estimate!)}{' '}
            {goal.deadlineType === 'fixed'
              ? <>Your target date stays <b>{fmtDate(goal.targetDate!)}</b>.</>
              : <>That's okay. Flexible goals can move with you.</>}
          </Note>
        </div>
      )}
    </div>
  )
}

export function GoalCard({ goal, onClick, isPrimary }: { goal: Goal; onClick?: () => void; isPrimary?: boolean }) {
  const p = useProjection(goal)
  return (
    <Card tone="glow" style={goalGlowStyle(goal)} onClick={onClick}>
      <div className="flex items-start gap-3">
        <GoalIcon goal={goal} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-bold">{goal.name}</p>
            {isPrimary && <Badge tone="lav">Primary</Badge>}
          </div>
          <p className="text-xs text-muted">{money(goal.monthlyContribution)}/month · {goal.deadlineType === 'fixed' ? 'Fixed deadline' : 'Flexible'}</p>
        </div>
        <GoalStatusBadge goal={goal} p={p} />
      </div>
      <div className="mt-4"><SavingsProgress goal={goal} p={p} compact /></div>
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3 text-xs">
        <div>
          <p className="text-muted">Target date</p>
          <p className="mt-0.5 font-semibold">{goal.targetDate ? fmtDate(goal.targetDate) : 'Flexible'}</p>
        </div>
        <div>
          <p className="text-muted">Estimated completion</p>
          <p className={cx('mt-0.5 font-semibold', p.status === 'delayed' && 'text-warn-500')}>
            {p.status === 'complete' ? 'Reached' : p.estimate ? fmtDate(p.estimate) : 'N/A'}
          </p>
        </div>
      </div>
    </Card>
  )
}

const STATUS: Record<ContributionStatus, { label: string; tone: 'lav' | 'mint' | 'peach' | 'rose' | 'gray' | 'sky' | 'butter' }> = {
  scheduled: { label: 'Scheduled', tone: 'sky' },
  pending: { label: 'Pending', tone: 'butter' },
  completed: { label: 'Completed', tone: 'mint' },
  failed: { label: 'Failed', tone: 'rose' },
  skipped: { label: 'Skipped', tone: 'gray' },
  partial: { label: 'Partial', tone: 'peach' },
}
export const ContributionBadge = ({ status }: { status: ContributionStatus }) => <Badge tone={STATUS[status].tone}>{STATUS[status].label}</Badge>

const KIND_LABEL: Record<Contribution['kind'], string> = {
  starting: 'Starting balance', monthly: 'Monthly contribution', extra: 'Extra contribution', catchup: 'Catch-up contribution',
  challenge: 'Challenge reward', transfer: 'Contribution',
}

export function ContributionHistoryRow({ c }: { c: Contribution }) {
  const showPlanned = c.status === 'partial' || c.status === 'skipped' || c.status === 'failed'
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{KIND_LABEL[c.kind]}</p>
        <p className="text-xs text-muted">{fmtDate(c.date)}</p>
      </div>
      <div className="text-right">
        <p className={cx('tabular text-sm font-bold', (c.status === 'skipped' || c.status === 'failed') && 'text-faint line-through')}>
          {c.status === 'skipped' || c.status === 'failed' ? money(c.planned) : `+${money(c.settled)}`}
        </p>
        {showPlanned && c.status === 'partial' && <p className="text-[11px] text-muted">of {money(c.planned)} planned</p>}
      </div>
      <ContributionBadge status={c.status} />
    </div>
  )
}

/** Next scheduled deposit for a goal, with a gentle reminder if the last one fell short. */
export function ContributionCard({ goal, onClick, embedded }: { goal: Goal; onClick?: () => void; embedded?: boolean }) {
  const { state, today } = useStore()
  const last = state.contributions
    .filter((c) => c.goalId === goal.id && c.kind === 'monthly')
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0]
  const overdue = goal.nextContributionDate < today
  const shortfall = last && (last.status === 'skipped' || last.status === 'failed' || last.status === 'partial')
  const days = diffDays(goal.nextContributionDate, today)
  const body = (
    <>
      <div className="flex items-center gap-3">
        {!embedded && <GoalIcon goal={goal} size={40} />}
        <div className="min-w-0 flex-1">
          {embedded && <p className="text-[11px] font-semibold tracking-wide text-faint uppercase">Next contribution</p>}
          <p className="tabular font-bold">{money(goal.monthlyContribution)}{!embedded && <span className="font-medium text-muted"> to {goal.name}</span>}</p>
          <p className="flex items-center gap-1 text-xs text-muted">
            <Clock size={12} /> {fmtShort(goal.nextContributionDate)}
            {!overdue && <> · in {days === 0 ? 'today' : `${days} day${days === 1 ? '' : 's'}`}</>}
            {' · '}{goal.transferMode === 'automatic' ? 'Auto-transfer' : 'Needs approval'}
          </p>
        </div>
        {onClick && <ChevronRight size={18} className="text-faint" />}
      </div>
      {(overdue || shortfall) && (
        <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-warn-50 px-3 py-2 text-xs text-[#4c1d95]">
          <CircleAlert size={14} className="mt-px shrink-0" />
          {overdue
            ? `This contribution was due ${fmtShort(goal.nextContributionDate)} and hasn't been made yet.`
            : last.status === 'partial'
              ? `Last month's contribution was partial (${money(last.settled)} of ${money(last.planned)}).`
              : `Last month's contribution was ${last.status === 'failed' ? 'unsuccessful' : 'skipped'}. You can add money anytime.`}
        </p>
      )}
    </>
  )
  return embedded ? <div className="rounded-2xl bg-white/70 p-3.5">{body}</div> : <Card onClick={onClick}>{body}</Card>
}
