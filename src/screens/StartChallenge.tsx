import { ArrowRight, Landmark, Minus, Plus, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, IconTile, Note, ScreenHeader, SectionTitle } from '../components/ui'
import { DurationFields, challengeWeeks } from '../components/DurationFields'
import { HABIT_WORD } from './ChallengeReview'
import { habitDef, habitMonthlyCost, toWeeklyUnit } from '../data/meta'
import type { Challenge, HabitId } from '../data/types'
import { fmtMetric, habitFromHistory } from '../lib/calc'
import { addDays, fmtDate } from '../lib/date'
import { money, uid } from '../lib/format'
import { useStore } from '../state/store'

function NewChallenge({ habitId, value, retryOf }: { habitId: HabitId; value?: number; retryOf?: string }) {
  const { state, today, back, update, replace, push, toast } = useStore()
  const h = habitFromHistory(state, habitId, today)
  const previous = retryOf ? state.challenges.find((c) => c.id === retryOf) : undefined
  const [target, setTarget] = useState(value ?? (h.period === 'week' ? Math.max(0, h.baseline - 2) : h.baseline - 30))
  const [monthsText, setMonthsText] = useState('0')
  const [weeksText, setWeeksText] = useState(String(previous?.durationWeeks ?? 2))
  const dur = challengeWeeks(monthsText, weeksText)
  const weeks = dur.weeks
  const existing = state.challenges.find((c) => c.status === 'active' && c.habitId === habitId)

  const weeklyTarget = previous ? previous.target : Math.round(toWeeklyUnit(h, target) * 100) / 100
  const weeklyBaseline = previous ? previous.baseline : Math.round(toWeeklyUnit(h, h.baseline) * 100) / 100
  const metric = previous?.metric ?? h.metric
  const monthlyDiff = habitMonthlyCost(h, h.baseline) - habitMonthlyCost(h, target)

  function start() {
    const c: Challenge = {
      id: uid('ch'), seriesId: previous?.seriesId ?? uid('cs'), attempt: (previous?.attempt ?? 0) + 1,
      habitId, metric, baseline: weeklyBaseline, avgCost: previous?.avgCost ?? (metric === 'visits' ? h.avgCost : undefined), target: weeklyTarget, durationWeeks: weeks, startDate: today, status: 'active',
    }
    update((s) => ({ ...s, challenges: [...s.challenges, c] }))
    toast(previous ? 'New attempt started' : 'Challenge started')
    replace({ name: 'tracker', id: c.id })
  }

  return (
    <div>
      <ScreenHeader onBack={back} title={previous ? 'Retry challenge' : 'Start a challenge'} />

      <Card>
        <div className="flex items-center gap-3">
          <IconTile icon={h.icon} color={h.color} soft={h.soft} />
          <div>
            <p className="font-bold">{h.challengeName}</p>
            <p className="text-xs text-muted">{previous ? `Attempt ${previous.attempt + 1} · same target` : 'Confirm your challenge details'}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-cream p-3.5">
            <p className="text-xs text-muted">Original baseline</p>
            <p className="tabular mt-0.5 font-bold">{metric === 'visits' ? `${weeklyBaseline} visits/week` : `${money(h.baseline)}/month`}</p>
          </div>
          <div className="rounded-2xl bg-accent-100 p-3.5">
            <p className="text-xs text-accent-700">New target</p>
            <p className="tabular mt-0.5 font-bold text-accent-700">{metric === 'visits' ? `${weeklyTarget} visits/week` : previous ? `${fmtMetric('spend', weeklyTarget)}/week` : `${money(target)}/month`}</p>
          </div>
        </div>
      </Card>

      {!previous && (
        <>
          <SectionTitle>Target</SectionTitle>
          <Card className="flex items-center justify-between">
            <button aria-label="Lower target" disabled={target <= h.min} onClick={() => setTarget((t) => Math.max(h.min, t - h.step))} className="grid size-11 place-items-center rounded-full border border-line bg-paper disabled:opacity-40"><Minus size={18} /></button>
            <div className="text-center">
              <p className="tabular text-2xl font-bold">{h.period === 'week' ? target : money(target)}</p>
              <p className="text-xs text-muted">{h.period === 'week' ? `${h.describe} per week` : 'shopping per month'}</p>
            </div>
            <button aria-label="Raise target" disabled={target >= h.baseline - h.step} onClick={() => setTarget((t) => Math.min(h.baseline - h.step, t + h.step))} className="grid size-11 place-items-center rounded-full border border-line bg-paper disabled:opacity-40"><Plus size={18} /></button>
          </Card>
          {monthlyDiff > 0 && <p className="mt-2 text-xs text-muted">That's about {money(Math.round(monthlyDiff))}/month less than your usual routine.</p>}
        </>
      )}

      <SectionTitle>Challenge duration</SectionTitle>
      <DurationFields months={monthsText} weeks={weeksText} onMonths={setMonthsText} onWeeks={setWeeksText} invalid={!!dur.error} />
      {dur.error ? (
        <p className="mt-2 text-xs font-medium text-rose-500">{dur.error}</p>
      ) : (
        <p className="mt-2 text-xs text-muted">{weeks} week{weeks > 1 ? 's' : ''} · {fmtDate(today)} – {fmtDate(addDays(today, weeks * 7 - 1))}</p>
      )}

      <div className="mt-5 space-y-3">
        <Note icon={<Landmark size={15} />}>Progress is tracked automatically from your connected bank transactions. You can review and correct anything that's off.</Note>
        {previous && <Note tone="gray" icon={<RotateCcw size={15} />}>Your previous attempt stays in your challenge history.</Note>}
        {existing && !previous && (
          <Note tone="peach">
            You already have an active {h.challengeName.toLowerCase()}.{' '}
            <button className="font-semibold underline" onClick={() => push({ name: 'tracker', id: existing.id })}>View it</button>
          </Note>
        )}
      </div>

      <Button full size="lg" className="mt-6" onClick={start} disabled={(!!existing && !previous) || !!dur.error}>Start Challenge</Button>
    </div>
  )
}

export function StartChallenge(props: { habitId: HabitId; value?: number; retryOf?: string }) {
  const { state } = useStore()
  const previous = props.retryOf ? state.challenges.find((c) => c.id === props.retryOf) : undefined
  return previous ? <RetryChallenge previous={previous} /> : <NewChallenge {...props} />
}

/** "Give it another try": same habit and target, choose a new duration, start a fresh attempt (history is kept). */
function RetryChallenge({ previous }: { previous: Challenge }) {
  const { today, back, update, replace, toast } = useStore()
  const h = habitDef(previous.habitId)
  const [monthsText, setMonthsText] = useState('0')
  const [weeksText, setWeeksText] = useState(String(previous.durationWeeks))
  const dur = challengeWeeks(monthsText, weeksText)
  const weeks = dur.weeks
  const word = HABIT_WORD[previous.habitId]
  const target = fmtMetric(previous.metric, previous.target)
  const plan = previous.metric === 'visits'
    ? `${previous.target} ${word} visits per week for ${weeks} week${weeks > 1 ? 's' : ''}`
    : `${target} of ${word} per week for ${weeks} week${weeks > 1 ? 's' : ''}`

  function start() {
    const c: Challenge = {
      id: uid('ch'), seriesId: previous.seriesId, attempt: previous.attempt + 1, habitId: previous.habitId, metric: previous.metric,
      baseline: previous.baseline, avgCost: previous.avgCost, target: previous.target, durationWeeks: weeks, startDate: today, status: 'active',
    }
    update((s) => ({ ...s, challenges: [...s.challenges, c] }))
    toast('New attempt started')
    replace({ name: 'tracker', id: c.id })
  }

  return (
    <div>
      <ScreenHeader onBack={back} />
      <Card className="px-5 py-6">
        <h1 className="text-[22px] font-extrabold tracking-tight">Give it another try</h1>
        <p className="mt-1 text-sm text-muted">Same {word} routine goal, fresh start.</p>
        <div className="mt-5 space-y-3 text-sm">
          <div className="flex items-center justify-between"><span className="text-muted">Habit</span><span className="text-base font-semibold">{h.name}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted">Weekly target</span><span className="tabular text-base font-semibold">{target}</span></div>
        </div>

        <h2 className="mt-7 text-[17px] font-bold tracking-tight">How long would you like to try?</h2>
        <div className="mt-3"><DurationFields months={monthsText} weeks={weeksText} onMonths={setMonthsText} onWeeks={setWeeksText} invalid={!!dur.error} /></div>
        {dur.error && <p className="mt-2 text-xs font-medium text-rose-500">{dur.error}</p>}

        <div className="mt-6 rounded-2xl bg-accent-50 px-4 py-3.5">
          <p className="text-xs text-muted">New challenge</p>
          <p className="mt-0.5 font-semibold">{plan}</p>
        </div>

        <Button full size="lg" className="mt-6" onClick={start} disabled={!!dur.error}>Start Again <ArrowRight size={17} /></Button>
      </Card>
    </div>
  )
}
