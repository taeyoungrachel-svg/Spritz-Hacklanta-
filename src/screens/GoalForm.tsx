import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ConfirmationModal, Button, Field, MoneyInput, ScreenHeader, Segmented, TextInput, Toggle, Note, cx, inputCls } from '../components/ui'
import { GOAL_ICONS, MAX_GOALS, nextColorIdx } from '../data/meta'
import type { DeadlineType, Goal, TransferMode } from '../data/types'
import { countPeriods, goalSaved, projectGoal } from '../lib/calc'
import { addMonths, fmtDate, nextAfter, nextOnOrAfter } from '../lib/date'
import { money, uid } from '../lib/format'
import { useStore } from '../state/store'

export interface GoalDraft {
  name: string
  icon: string
  target: string
  targetDate: string
  deadlineType: DeadlineType
  starting: string
  monthly: string
  day: number
  transferMode: TransferMode
}

export function suggestMonthly(target: number, saved: number, targetDate: string | undefined, day: number, today: string) {
  if (!targetDate || target <= saved) return null
  const first = nextAfter(today, day)
  const periods = countPeriods(first, targetDate, day)
  if (periods <= 0) return null
  return { amount: Math.ceil((target - saved) / periods), periods }
}

/** Builds a temporary goal from a draft so the projection logic can run live while editing. */
export function draftProjection(d: GoalDraft, today: string, existing?: Goal, contributions = [] as Parameters<typeof projectGoal>[1]) {
  const target = Number(d.target) || 0
  const monthly = Number(d.monthly) || 0
  const tmp: Goal = {
    id: existing?.id ?? 'draft', name: d.name, icon: d.icon, target, monthlyContribution: monthly, contributionDay: d.day,
    nextContributionDate: existing && existing.contributionDay === d.day ? existing.nextContributionDate : nextAfter(today, d.day),
    targetDate: d.targetDate || undefined, deadlineType: d.deadlineType, transferMode: d.transferMode, createdAt: today,
  }
  const contribs = existing ? contributions : [{ id: 'x', goalId: 'draft', transferId: 'x', date: today, planned: Number(d.starting) || 0, settled: Number(d.starting) || 0, status: 'completed' as const, kind: 'starting' as const }]
  return projectGoal(tmp, contribs, today)
}

export function GoalFormFields({ d, set, errors, existingSaved, today, hideStarting }: {
  d: GoalDraft; set: (p: Partial<GoalDraft>) => void; errors: Record<string, string>; existingSaved?: number; today: string; hideStarting?: boolean
}) {
  const saved = existingSaved ?? (Number(d.starting) || 0)
  const suggestion = suggestMonthly(Number(d.target) || 0, saved, d.targetDate || undefined, d.day, today)
  return (
    <div className="space-y-5">
      <Field label="Goal name" error={errors.name}>
        <TextInput value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Japan Trip" error={!!errors.name} maxLength={40} />
      </Field>
      <Field label="Icon" optional>
        <div className="grid grid-cols-7 gap-2">
          {Object.entries(GOAL_ICONS).map(([k, Icon]) => (
            <button
              key={k}
              type="button"
              aria-label={k}
              aria-pressed={d.icon === k}
              onClick={() => set({ icon: k })}
              className={cx('grid size-11 place-items-center rounded-2xl border transition', d.icon === k ? 'border-accent-500 bg-accent-100 text-accent-700' : 'border-line bg-paper text-muted hover:border-accent-300')}
            >
              <Icon size={20} />
            </button>
          ))}
        </div>
      </Field>
      <Field label="Target amount" error={errors.target}>
        <MoneyInput value={d.target} onChange={(v) => set({ target: v })} error={!!errors.target} placeholder="3,000" ariaLabel="Target amount" />
      </Field>
      <Field label="Deadline type">
        <Segmented value={d.deadlineType} onChange={(v) => set({ deadlineType: v })} options={[{ value: 'fixed', label: 'Fixed deadline' }, { value: 'flexible', label: 'Flexible' }]} />
      </Field>
      <Field label="Target date" optional={d.deadlineType === 'flexible'} error={errors.targetDate} hint={d.deadlineType === 'fixed' ? 'A fixed date, like a trip or event.' : 'Your estimate can shift without pressure.'}>
        <input type="date" value={d.targetDate} min={today} onChange={(e) => set({ targetDate: e.target.value })} className={inputCls(!!errors.targetDate)} />
      </Field>
      {!hideStarting && (
        existingSaved === undefined ? (
          <Field label="Current starting savings" optional error={errors.starting} hint="Money already set aside for this goal.">
            <MoneyInput value={d.starting} onChange={(v) => set({ starting: v })} error={!!errors.starting} ariaLabel="Starting savings" />
          </Field>
        ) : (
          <div className="rounded-2xl bg-cream px-4 py-3 text-sm">
            <span className="text-muted">Current deposited savings</span> <b className="tabular float-right">{money(existingSaved)}</b>
          </div>
        )
      )}
      <Field
        label="Monthly contribution"
        error={errors.monthly}
        hint={suggestion ? <>Suggested: <button type="button" className="font-semibold text-accent-600 underline-offset-2 hover:underline" onClick={() => set({ monthly: String(suggestion.amount) })}>{money(suggestion.amount)}/month</button> over {suggestion.periods} contributions to reach your target date.</> : undefined}
      >
        <MoneyInput value={d.monthly} onChange={(v) => set({ monthly: v })} error={!!errors.monthly} ariaLabel="Monthly contribution" />
      </Field>
      <Field label="Scheduled deposit date" hint={`Next deposit: ${fmtDate(nextAfter(today, d.day))}`}>
        <select value={d.day} onChange={(e) => set({ day: Number(e.target.value) })} className={inputCls()}>
          {Array.from({ length: 28 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Day {n} of each month</option>)}
        </select>
      </Field>
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-paper p-4">
        <div>
          <p className="text-sm font-semibold">Automatic monthly transfer</p>
          <p className="text-xs text-muted">{d.transferMode === 'automatic' ? 'Moves on schedule' : 'You’ll approve each transfer'}</p>
        </div>
        <Toggle checked={d.transferMode === 'automatic'} onChange={(v) => set({ transferMode: v ? 'automatic' : 'manual' })} label="Automatic monthly transfer" />
      </div>
    </div>
  )
}

export function validateDraft(d: GoalDraft, today: string, existingSaved?: number) {
  const e: Record<string, string> = {}
  const target = Number(d.target)
  if (!d.name.trim()) e.name = 'Give your goal a name.'
  if (!(target > 0)) e.target = 'Enter a target amount.'
  if (d.deadlineType === 'fixed' && !d.targetDate) e.targetDate = 'Fixed goals need a target date.'
  if (d.targetDate && d.targetDate <= today) e.targetDate = 'Choose a future date.'
  if (existingSaved === undefined && Number(d.starting) > target) e.starting = 'Starting savings can’t exceed the target.'
  if (d.monthly !== '' && !(Number(d.monthly) >= 0)) e.monthly = 'Enter a valid amount.'
  return e
}

export function GoalForm({ id }: { id?: string }) {
  const { state, back, update, replace, toast, today } = useStore()
  const existing = state.goals.find((g) => g.id === id)
  const existingSaved = existing ? goalSaved(existing.id, state.contributions) : undefined
  const [d, setD] = useState<GoalDraft>(() =>
    existing
      ? { name: existing.name, icon: existing.icon, target: String(existing.target), targetDate: existing.targetDate ?? '', deadlineType: existing.deadlineType, starting: '', monthly: String(existing.monthlyContribution), day: existing.contributionDay, transferMode: existing.transferMode }
      : { name: '', icon: 'piggy', target: '', targetDate: addMonths(today, 12), deadlineType: 'flexible', starting: '', monthly: '', day: 15, transferMode: 'automatic' },
  )
  const [tried, setTried] = useState(false)
  const [primary, setPrimary] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const set = (p: Partial<GoalDraft>) => setD((x) => ({ ...x, ...p }))
  const errors = tried ? validateDraft(d, today, existingSaved) : {}
  const p = draftProjection(d, today, existing, state.contributions)

  function save() {
    if (!existing && state.goals.length >= MAX_GOALS) return
    setTried(true)
    if (Object.keys(validateDraft(d, today, existingSaved)).length) return
    const fields = {
      name: d.name.trim(), icon: d.icon, target: Number(d.target), targetDate: d.targetDate || undefined, deadlineType: d.deadlineType,
      monthlyContribution: Number(d.monthly) || 0, contributionDay: d.day, transferMode: d.transferMode,
    }
    if (existing) {
      update((s) => ({
        ...s,
        goals: s.goals.map((g) => g.id === existing.id
          ? { ...g, ...fields, nextContributionDate: g.contributionDay === d.day ? g.nextContributionDate : nextOnOrAfter(today, d.day) }
          : g),
      }))
      toast('Goal plan updated')
      back()
    } else {
      const gid = uid('g')
      const goal: Goal = { id: gid, ...fields, nextContributionDate: nextAfter(today, d.day), createdAt: today, colorIdx: nextColorIdx(state.goals) }
      const starting = Number(d.starting) || 0
      update((s) => ({
        ...s,
        goals: [...s.goals, goal],
        primaryGoalId: primary ? gid : s.primaryGoalId,
        contributions: starting > 0
          ? [...s.contributions, { id: uid('c'), goalId: gid, transferId: uid('tr'), date: today, planned: starting, settled: starting, status: 'completed', kind: 'starting' }]
          : s.contributions,
      }))
      toast(`${goal.name} created`)
      replace({ name: 'goal', id: gid })
    }
  }

  function remove() {
    if (!existing) return
    update((s) => {
      const goals = s.goals.filter((g) => g.id !== existing.id)
      return {
        ...s,
        goals,
        contributions: s.contributions.filter((c) => c.goalId !== existing.id),
        primaryGoalId: s.primaryGoalId === existing.id ? (goals[0]?.id ?? '') : s.primaryGoalId,
      }
    })
    toast('Goal removed')
    back()
    back()
  }

  if (!existing && state.goals.length >= MAX_GOALS) {
    return (
      <div>
        <ScreenHeader onBack={back} title="Create a goal" />
        <Note tone="peach">You can have up to {MAX_GOALS} goals. Remove or finish a goal to add a new one.</Note>
      </div>
    )
  }

  return (
    <div>
      <ScreenHeader onBack={back} title={existing ? 'Edit goal' : 'Create a goal'} />
      <GoalFormFields d={d} set={set} errors={errors} existingSaved={existingSaved} today={today} />

      {!existing && (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-line bg-paper p-4">
          <p className="text-sm font-semibold">Make this my primary goal</p>
          <Toggle checked={primary} onChange={setPrimary} label="Make primary goal" />
        </div>
      )}

      <div className="mt-5 rounded-3xl bg-accent-50 p-4">
        <p className="text-xs font-semibold tracking-wide text-accent-700 uppercase">Estimated completion</p>
        <p key={p.estimate ?? '-'} className="mt-1 animate-fade-in text-xl font-bold">
          {p.status === 'complete' ? 'Already reached' : p.estimate ? fmtDate(p.estimate) : 'Add a monthly contribution'}
        </p>
        {p.status === 'delayed' && d.targetDate && (
          <p className="mt-1 text-xs text-[#4c1d95]">That's after your target date of {fmtDate(d.targetDate)}. Try the suggested amount to stay on time.</p>
        )}
        {p.status === 'on-track' && <p className="mt-1 text-xs text-mint-500">On track for your target date.</p>}
      </div>

      {existing && (
        <div className="mt-4">
          <Note tone="gray">Plan changes apply to future scheduled transfers. Past deposits aren't affected.</Note>
        </div>
      )}

      <Button full size="lg" className="mt-6" onClick={save}>{existing ? 'Save changes' : 'Create goal'}</Button>
      {existing && state.goals.length > 1 && (
        <Button full variant="danger" className="mt-3" onClick={() => setConfirmDelete(true)}><Trash2 size={16} /> Delete goal</Button>
      )}
      <ConfirmationModal
        open={confirmDelete}
        tone="danger"
        title={`Delete ${existing?.name}?`}
        message="This removes the goal and its contribution history."
        confirmLabel="Delete"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
