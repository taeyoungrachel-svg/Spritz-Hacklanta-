import { ArrowRight, Info, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { useRef, useState } from 'react'
import { DurationFields } from '../components/DurationFields'
import { GoalIcon, GoalProgressBar } from '../components/goals'
import { Button, Card, IconTile, Note, ScreenHeader, SectionTitle, Toggle } from '../components/ui'
import { habitMonthlyCost } from '../data/meta'
import type { HabitId } from '../data/types'
import { allocatePool, habitFromHistory, projectGoal, redistribute, splitByPercent } from '../lib/calc'
import { fmtDate, fmtMonthYear } from '../lib/date'
import { money } from '../lib/format'
import { useStore } from '../state/store'

export function HabitSimulator({ habitId }: { habitId: HabitId }) {
  const { state, today, back, push } = useStore()
  const h = habitFromHistory(state, habitId, today)
  const [v, setV] = useState(h.period === 'week' ? Math.max(h.min, h.baseline - 2) : h.baseline - 30)
  const [monthsText, setMonthsText] = useState('6')
  const [weeksText, setWeeksText] = useState('0')
  const [custom, setCustom] = useState<Record<string, number>>(() => equalSplit(state.goals.map((g) => g.id)))
  // While a percentage box is focused we show exactly what was typed (so "", "0" or "05" never jitter) and
  // redistribute the other goals from the percentages they had when editing started.
  const [draft, setDraft] = useState<{ id: string; text: string } | null>(null)
  const editBase = useRef<Record<string, number> | null>(null)
  const [previewSlower, setPreviewSlower] = useState(false)

  const baseMonthly = habitMonthlyCost(h, h.baseline)
  const simMonthly = habitMonthlyCost(h, v)
  const diff = Math.round((baseMonthly - simMonthly) * 100) / 100
  const unit = h.period === 'week' ? (n: number) => `${n} ${n === 1 ? 'visit' : 'visits'}/week` : (n: number) => `${money(n)}/month`
  const fill = ((v - h.min) / (h.max - h.min)) * 100
  const baselinePos = ((h.baseline - h.min) / (h.max - h.min)) * 100

  const goals = state.goals.map((g) => ({ goal: g, p: projectGoal(g, state.contributions, today) }))

  // Projection length is a combination of months and weeks (e.g. 1 month + 2 weeks). Either may be 0, not both.
  const months = Number(monthsText) || 0
  const weeks = Number(weeksText) || 0
  const spanError = months + weeks <= 0
    ? 'Enter at least 1 week or 1 month.'
    : months > 60 ? 'Keep months to 60 or fewer.' : weeks > 52 ? 'Keep weeks to 52 or fewer.' : undefined
  const horizonMonths = spanError ? 0 : months + (weeks * 12) / 52
  const horizonLabel = [
    months > 0 && `${months} ${months === 1 ? 'month' : 'months'}`,
    weeks > 0 && `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`,
  ].filter(Boolean).join(' + ')

  // Percentages always total exactly 100; dollar amounts are derived from them so the two always agree.
  const goalIds = state.goals.map((g) => g.id)
  const stored = goalIds.reduce((a, id) => a + (custom[id] ?? 0), 0)
  const pcts: Record<string, number> = stored === 100 ? Object.fromEntries(goalIds.map((id) => [id, custom[id] ?? 0])) : equalSplit(goalIds)
  const pool = Math.max(0, diff) * horizonMonths
  const alloc = splitByPercent(pool, pcts)
  const reduction = allocatePool(Math.max(0, -diff), goals.map(({ goal }) => ({ id: goal.id, remaining: goal.monthlyContribution })), state.primaryGoalId, 'primary', {})

  return (
    <div>
      <ScreenHeader onBack={back} title={h.routineName} subtitle="Habit simulator" />

      <Card>
        <div className="flex items-center gap-3">
          <IconTile icon={h.icon} color={h.color} soft={h.soft} />
          <div>
            <p className="font-bold">Your current routine</p>
            <p className="text-xs text-muted">Based on your connected transactions</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          {h.period === 'week' ? (
            <>
              <Mini label="Frequency" value={`${h.baseline} visits/week`} />
              <Mini label="Avg. cost" value={money(h.avgCost)} />
            </>
          ) : (
            <>
              <Mini label="Frequency" value={`~${Math.max(1, Math.round(h.baseline / h.avgCost))} purchases/month`} />
              <Mini label="Avg. cost" value={`~${money(h.avgCost)}`} />
            </>
          )}
        </div>
      </Card>

      <SectionTitle>Try a different routine</SectionTitle>
      <Card>
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted">Simulated</span>
          <span key={v} className="tabular animate-fade-in text-2xl font-bold tracking-tight">{unit(v)}</span>
        </div>
        <div className="relative mt-5 mb-2">
          <input
            type="range"
            className="slider relative z-10"
            min={h.min}
            max={h.max}
            step={h.step}
            value={v}
            aria-label={`Simulated ${h.describe}`}
            onChange={(e) => setV(Number(e.target.value))}
            style={{ ['--fill' as string]: `${fill}%` }}
          />
          <div className="pointer-events-none absolute -bottom-5 -translate-x-1/2 text-[10px] font-bold text-accent-600" style={{ left: `calc(${baselinePos}% + ${14 - baselinePos * 0.28}px)` }}>
            ▲ now
          </div>
        </div>
        <div className="mt-6 flex justify-between text-xs text-faint">
          <span>{h.period === 'week' ? '0' : '$0'}</span>
          <span>{h.period === 'week' ? `${h.max}/week` : `${money(h.max)}`}</span>
        </div>
        {v !== h.baseline && (
          <button onClick={() => setV(h.baseline)} className="mt-2 text-xs font-semibold text-accent-600">Reset to current routine</button>
        )}
      </Card>

      <div className="mt-4">
        {diff > 0 ? (
          <Card className="border-mint-500/20 bg-mint-50!" tone="plain">
            <p className="flex items-center gap-2 text-sm font-semibold text-mint-500"><TrendingDown size={17} /> Potential monthly savings</p>
            <p key={diff} className="tabular mt-1 animate-fade-in text-[30px] font-bold tracking-tight">{money(diff)}</p>
          </Card>
        ) : diff < 0 ? (
          <Card className="border-warn-500/20 bg-warn-50!" tone="plain">
            <p className="flex items-center gap-2 text-sm font-semibold text-warn-500"><TrendingUp size={17} /> Potential additional monthly spending</p>
            <p key={diff} className="tabular mt-1 animate-fade-in text-[30px] font-bold tracking-tight">{money(-diff)}</p>
            <p className="text-sm text-muted">This could leave less available for future contributions. It doesn't change any money you've already saved.</p>
          </Card>
        ) : (
          <Card tone="lav">
            <p className="flex items-center gap-2 text-sm font-semibold text-accent-700"><Minus size={17} /> No financial difference</p>
            <p className="mt-1 text-sm text-muted">This matches your current routine. Move the slider to explore a change.</p>
          </Card>
        )}
      </div>

      <SectionTitle>Impact on savings goals</SectionTitle>
      <Card>
        <p className="text-sm font-semibold">Projection length</p>
        <div className="mt-3"><DurationFields months={monthsText} weeks={weeksText} onMonths={setMonthsText} onWeeks={setWeeksText} invalid={!!spanError} /></div>
        {spanError ? (
          <p className="mt-2 text-xs font-medium text-rose-500">{spanError}</p>
        ) : (
          <p className="mt-2 text-xs text-muted">Projecting over {horizonLabel}.</p>
        )}
      </Card>

      {diff > 0 && (
        <Card className="mt-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Split between goals</p>
            <button
              onClick={() => { setCustom(equalSplit(goalIds)); setDraft(null) }}
              className="rounded-lg px-1 text-[13px] font-semibold text-accent-600 hover:text-accent-700"
            >
              Split equally
            </button>
          </div>
          {state.goals.map((g) => (
            <div key={g.id} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{g.name}</p>
                <p className="tabular text-xs text-muted">{money(alloc[g.id] ?? 0, true)}</p>
              </div>
              <div className="relative w-24">
                <input
                  inputMode="numeric"
                  aria-label={`${g.name} percentage`}
                  disabled={goalIds.length === 1}
                  value={draft?.id === g.id ? draft.text : String(pcts[g.id] ?? 0)}
                  onFocus={(e) => {
                    editBase.current = { ...pcts }
                    setDraft({ id: g.id, text: String(pcts[g.id] ?? 0) })
                    e.target.select()
                  }}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 3)
                    const v = digits === '' ? 0 : Math.min(100, Number(digits))
                    setDraft({ id: g.id, text: digits === '' ? '' : String(v) })
                    setCustom(redistribute(editBase.current ?? pcts, g.id, v))
                  }}
                  onBlur={() => { setDraft(null); editBase.current = null }}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                  className="tabular h-10 w-full rounded-xl border border-line bg-paper pr-7 pl-3 text-right text-sm font-semibold outline-none focus:border-accent-400 disabled:bg-cream disabled:text-muted"
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted">%</span>
              </div>
            </div>
          ))}
          <p className="tabular border-t border-line pt-2.5 text-right text-xs font-semibold text-mint-500">
            Total 100% · {money(pool, true)} potential{horizonLabel ? ` over ${horizonLabel}` : ''}
          </p>
        </Card>
      )}

      <div className="mt-3 flex items-center gap-4 text-[11px] text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-accent-500" /> Actual savings</span>
        {diff > 0 && <span className="flex items-center gap-1.5"><span className="hatch h-2 w-4 rounded-full" /> Potential (not deposited)</span>}
      </div>

      <div className="mt-2 space-y-3">
        {goals.map(({ goal, p }) => {
          const potential = alloc[goal.id] ?? 0
          const share = pool > 0 ? potential / pool : 0
          const faster = diff > 0 && share > 0 ? projectGoal(goal, state.contributions, today, { monthly: goal.monthlyContribution + diff * share }) : null
          const cut = reduction[goal.id] ?? 0
          const slower = diff < 0 && previewSlower && cut > 0 ? projectGoal(goal, state.contributions, today, { monthly: goal.monthlyContribution - cut }) : null
          return (
            <Card key={goal.id}>
              <div className="flex items-center gap-3">
                <GoalIcon goal={goal} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{goal.name}</p>
                  <p className="tabular text-xs text-muted">
                    Actual {money(p.saved)} of {money(goal.target)}
                    {potential > 0 && <span className="font-semibold text-accent-600"> · +{money(Math.round(potential))} potential</span>}
                  </p>
                </div>
              </div>
              <GoalProgressBar goal={goal} p={p} extra={potential} />
              {faster?.estimate && p.estimate && faster.estimate < p.estimate && (
                <p className="mt-2.5 text-xs text-muted">
                  If added monthly, could reach the goal <b className="text-mint-500">{fmtMonthYear(faster.estimate)}</b> instead of {fmtMonthYear(p.estimate)}.
                </p>
              )}
              {slower && (
                <p className="mt-2.5 text-xs text-muted">
                  With {money(goal.monthlyContribution - cut)}/month instead of {money(goal.monthlyContribution)}:{' '}
                  <b className="text-warn-500">{slower.estimate ? fmtDate(slower.estimate) : 'no completion date'}</b>
                  {p.estimate && <> vs. {fmtDate(p.estimate)}</>}
                </p>
              )}
            </Card>
          )
        })}
      </div>

      {diff < 0 && (
        <Card className="mt-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Preview a slower timeline</p>
              <p className="text-xs text-muted">Assumes the extra {money(-diff)}/month comes out of contributions, primary goal first</p>
            </div>
            <Toggle checked={previewSlower} onChange={setPreviewSlower} label="Preview slower timeline" />
          </div>
          {horizonMonths > 0 && (
            <p className="mt-3 text-sm text-muted">Over {horizonLabel}, that's <b className="text-ink">{money(-diff * horizonMonths)}</b> that wouldn't be available for future contributions.</p>
          )}
        </Card>
      )}

      <div className="mt-4">
        <Note tone="gray" icon={<Info size={15} />}>
          {diff > 0
            ? `Potential savings are hypothetical. They only become actual savings when you transfer money to a goal.${horizonMonths > 0 ? ` Over ${horizonLabel}: ${money(pool)}.` : ''}`
            : 'These are projections only. Your scheduled contributions and saved balances will not change automatically.'}
        </Note>
      </div>

      <div className="mt-6">
        <Button full size="lg" disabled={v >= h.baseline} onClick={() => push({ name: 'startChallenge', habitId, value: v })}>
          Start a Challenge <ArrowRight size={17} />
        </Button>
        {v >= h.baseline && <p className="mt-2 text-center text-xs text-muted">Set a routine below your current one to start a challenge.</p>}
      </div>
    </div>
  )
}

/** Even percentages that always total 100 (any remainder goes to the first goal). */
function equalSplit(ids: string[]) {
  const out: Record<string, number> = {}
  const base = Math.floor(100 / ids.length)
  ids.forEach((id, i) => (out[id] = i === 0 ? 100 - base * (ids.length - 1) : base))
  return out
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-cream px-2 py-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="tabular mt-0.5 font-bold">{value}</p>
    </div>
  )
}
