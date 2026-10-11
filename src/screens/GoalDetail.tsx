import { ArrowRight, ChevronDown, FlaskConical, Pencil, Plus, Sparkles, Star } from 'lucide-react'
import { useState } from 'react'
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ContributionSheet } from '../components/ContributionSheet'
import {
  ContributionBadge, ContributionHistoryRow, DateProjection, GoalIcon, GoalStatusBadge, SavingsProgress, useProjection,
} from '../components/goals'
import { Badge, Button, Card, IconButton, MoneyInput, ScreenHeader, SectionTitle, Stat, cx } from '../components/ui'
import { goalGlowStyle } from '../data/meta'
import type { Goal } from '../data/types'
import { trajectory } from '../lib/calc'
import { fmtDate, fmtShort, parseISO } from '../lib/date'
import { money } from '../lib/format'
import { useStore } from '../state/store'

export function GoalDetail({ id }: { id: string }) {
  const { state, back, push, update, toast } = useStore()
  const goal = state.goals.find((g) => g.id === id)
  if (!goal) return <div className="pt-6"><ScreenHeader onBack={back} title="Goal not found" /></div>
  const isPrimary = goal.id === state.primaryGoalId
  return (
    <div>
      <ScreenHeader
        onBack={back}
        title={goal.name}
        right={<IconButton label="Edit goal" onClick={() => push({ name: 'goalForm', id: goal.id })}><Pencil size={18} /></IconButton>}
      />
      <Body goal={goal} isPrimary={isPrimary} onMakePrimary={() => { update((s) => ({ ...s, primaryGoalId: goal.id })); toast(`${goal.name} is now your primary goal`) }} />
    </div>
  )
}

function Body({ goal, isPrimary, onMakePrimary }: { goal: Goal; isPrimary: boolean; onMakePrimary: () => void }) {
  const { state, push } = useStore()
  const p = useProjection(goal)
  const [adding, setAdding] = useState(false)
  const history = state.contributions.filter((c) => c.goalId === goal.id).sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1))
  const lastMonthly = history.find((c) => c.kind === 'monthly')
  const showCatchUp = p.status === 'delayed' && goal.catchUpDismissedFor !== p.estimate

  return (
    <div className="space-y-4">
      <Card tone="glow" style={goalGlowStyle(goal)}>
        <div className="flex items-center gap-3">
          <GoalIcon goal={goal} size={52} />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <GoalStatusBadge goal={goal} p={p} />
              {isPrimary && <Badge tone="lav"><Star size={11} fill="currentColor" /> Primary</Badge>}
            </div>
            <p className="mt-1 text-xs text-muted">{goal.deadlineType === 'fixed' ? 'Fixed deadline' : 'Flexible deadline'}</p>
          </div>
          {!isPrimary && <Button size="sm" variant="ghost" onClick={onMakePrimary}>Make primary</Button>}
        </div>
        <div className="mt-4"><SavingsProgress goal={goal} p={p} /></div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <Stat label="Deposited" value={money(p.saved)} sub="Settled transfers only" />
          <Stat label="Remaining" value={money(p.remaining)} />
        </div>
      </Card>

      <Card>
        <DateProjection goal={goal} p={p} />
      </Card>

      {showCatchUp && (
        <Card tone="lav" className="animate-fade-in">
          <p className="flex items-center gap-2 font-bold"><Sparkles size={17} className="text-accent-600" /> Want to stay on your original timeline?</p>
          <p className="mt-1 text-sm text-muted">A one-time top-up or a small change to your monthly plan can get you back to {fmtDate(goal.targetDate!)}.</p>
          <Button full className="mt-4" onClick={() => push({ name: 'catchup', id: goal.id })}>Explore Catch-Up Options <ArrowRight size={16} /></Button>
        </Card>
      )}

      <SectionTitle>Monthly contribution plan</SectionTitle>
      <Card>
        <div className="grid grid-cols-2 gap-y-4">
          <Stat label="Planned monthly" value={money(goal.monthlyContribution)} sub={goal.transferMode === 'automatic' ? 'Automatic transfer' : 'You approve each month'} />
          <Stat label="Next scheduled" value={fmtShort(goal.nextContributionDate)} sub={`Every month on the ${ordinal(goal.contributionDay)}`} />
          <div className="col-span-2 flex items-center justify-between rounded-2xl bg-cream px-3.5 py-3">
            <span className="text-sm text-muted">Deposit status</span>
            <span className="flex items-center gap-2">
              {lastMonthly && <span className="text-xs text-muted">Last: {fmtShort(lastMonthly.date)}</span>}
              {lastMonthly ? <ContributionBadge status={lastMonthly.status} /> : <ContributionBadge status="scheduled" />}
            </span>
          </div>
          <div className="col-span-2 flex items-center justify-between rounded-2xl bg-sky-50/70 px-3.5 py-3">
            <span className="text-sm">{money(goal.monthlyContribution)} on {fmtDate(goal.nextContributionDate)}</span>
            <ContributionBadge status="scheduled" />
          </div>
        </div>
        <div className="mt-4">
          <Button full onClick={() => setAdding(true)}><Plus size={16} /> Contribute</Button>
        </div>
      </Card>

      {p.estimate && p.status !== 'complete' && <ProjectionChart goal={goal} />}

      <DemoControls goal={goal} />

      <SectionTitle>Contribution history</SectionTitle>
      <Card className="py-1">
        <div className="divide-y divide-line">
          {history.map((c) => <ContributionHistoryRow key={c.id} c={c} />)}
        </div>
      </Card>

      <ContributionSheet open={adding} onClose={() => setAdding(false)} initialGoalId={goal.id} lockGoal />
    </div>
  )
}

function ProjectionChart({ goal }: { goal: Goal }) {
  const { state, today } = useStore()
  const data = trajectory(goal, state.contributions, today).map((d) => ({ ...d, label: parseISO(d.date).toLocaleDateString('en-US', { month: 'short' }) }))
  const targetLabel = goal.targetDate ? data.find((d) => d.date.slice(0, 7) >= goal.targetDate!.slice(0, 7))?.label : undefined
  return (
    <Card>
      <p className="text-sm font-bold">Savings path</p>
      <div className="mt-1 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-accent-500" /> Deposited</span>
        <span className="flex items-center gap-1.5"><span className="hatch h-2 w-4 rounded-full" /> Projected</span>
      </div>
      <div className="mt-2 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#aaa7b4' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: '#aaa7b4' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${v / 1000}k` : v}`} domain={[0, goal.target]} />
            <Tooltip formatter={(v) => money(Number(v))} contentStyle={{ borderRadius: 12, border: '1px solid #e6e0f5', fontSize: 12 }} />
            {targetLabel && <ReferenceLine x={targetLabel} stroke="#4c1d95" strokeDasharray="3 3" label={{ value: 'Target', fontSize: 10, fill: '#4c1d95', position: 'insideTopRight' }} />}
            <Area type="monotone" dataKey="actual" name="Deposited" stroke="#7c3aed" strokeWidth={2.5} fill="url(#actualFill)" connectNulls={false} />
            <Area type="monotone" dataKey="projected" name="Projected" stroke="#9669ff" strokeWidth={2} strokeDasharray="5 4" fill="transparent" connectNulls />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

/** Discreet demo panel to simulate what happens with the next scheduled transfer. */
function DemoControls({ goal }: { goal: Goal }) {
  const { simulateScheduled, toast } = useStore()
  const [open, setOpen] = useState(false)
  const [partial, setPartial] = useState(String(Math.round(goal.monthlyContribution / 2)))
  const [extra, setExtra] = useState(false)
  const run = (o: 'success' | 'partial' | 'missed' | 'failed') => {
    simulateScheduled(goal.id, o, Number(partial))
    toast({ success: 'Monthly transfer started', partial: 'Partial transfer started', missed: 'Contribution marked as missed', failed: 'Transfer failed (simulated)' }[o])
  }
  return (
    <div className="rounded-3xl border border-dashed border-line">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] font-semibold text-muted" aria-expanded={open}>
        <FlaskConical size={15} /> Demo controls
        <span className="ml-1 text-xs font-normal text-faint">simulate the {fmtShort(goal.nextContributionDate)} transfer</span>
        <ChevronDown size={16} className={cx('ml-auto transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="animate-fade-in space-y-2.5 px-4 pb-4">
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="secondary" onClick={() => run('success')}>Successful</Button>
            <Button size="sm" variant="outline" onClick={() => run('missed')}>Missed</Button>
            <Button size="sm" variant="outline" onClick={() => run('failed')}>Failed transfer</Button>
            <Button size="sm" variant="outline" onClick={() => setExtra(true)}>Extra contribution</Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1"><MoneyInput value={partial} onChange={setPartial} ariaLabel="Partial amount" /></div>
            <Button size="sm" variant="outline" className="h-12" onClick={() => run('partial')} disabled={!(Number(partial) > 0 && Number(partial) < goal.monthlyContribution)}>Partial</Button>
          </div>
          <p className="text-[11px] leading-relaxed text-faint">Simulated only. Each scheduled outcome uses the next scheduled date, then moves the schedule forward one month.</p>
        </div>
      )}
      <ContributionSheet open={extra} onClose={() => setExtra(false)} initialGoalId={goal.id} lockGoal title="Extra contribution" />
    </div>
  )
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
