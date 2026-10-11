import { goalTint } from '../data/meta'
import { Landmark, Plus } from 'lucide-react'
import { useState } from 'react'
import { ContributionSheet } from '../components/ContributionSheet'
import { GoalCard } from '../components/goals'
import { Button, Card } from '../components/ui'
import { goalSaved, isSettled } from '../lib/calc'
import { MAX_GOALS } from '../data/meta'
import { money } from '../lib/format'
import { useStore } from '../state/store'

export function Goals() {
  const { state, push } = useStore()
  const [adding, setAdding] = useState(false)
  const total = state.contributions.filter(isSettled).reduce((s, c) => s + c.settled, 0)
  const pending = state.contributions.filter((c) => c.status === 'pending').reduce((s, c) => s + c.settled, 0)
  const atMax = state.goals.length >= MAX_GOALS
  const goals = [...state.goals].sort((a, b) => (a.id === state.primaryGoalId ? -1 : b.id === state.primaryGoalId ? 1 : 0))

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px]">Goals</h1>
        <Button size="sm" disabled={atMax} onClick={() => push({ name: 'goalForm' })}><Plus size={16} /> New goal</Button>
      </div>
      <p className="text-sm text-muted">{state.goals.length} of {MAX_GOALS} goals{atMax ? '. You\'ve reached the maximum, so remove a goal to add a new one.' : ''}</p>

      <Card className="mt-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted">
          <Landmark size={14} /> Partner Bank savings
        </div>
        <p className="tabular mt-1 text-[30px] font-bold tracking-tight">{money(total)}</p>
        <p className="text-xs text-muted">
          Allocated across {state.goals.length} goals{pending > 0 ? ` · ${money(pending)} pending` : ''}
        </p>
        <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-accent-100">
          {state.goals.map((g) => {
            const v = goalSaved(g.id, state.contributions)
            return <div key={g.id} className="h-full transition-all duration-700" style={{ width: `${total ? (v / total) * 100 : 0}%`, background: goalTint(g).color }} />
          })}
        </div>
        <Button variant="secondary" full size="md" className="mt-4" onClick={() => setAdding(true)}>
          <Plus size={16} /> Add money
        </Button>
      </Card>

      <div className="mt-5 space-y-3">
        {goals.map((g) => (
          <GoalCard key={g.id} goal={g} isPrimary={g.id === state.primaryGoalId} onClick={() => push({ name: 'goal', id: g.id })} />
        ))}
      </div>

      <ContributionSheet open={adding} onClose={() => setAdding(false)} />
    </div>
  )
}
