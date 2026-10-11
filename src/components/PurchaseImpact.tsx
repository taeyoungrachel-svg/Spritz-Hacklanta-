import { goalTint } from '../data/meta'
import { projectGoal } from '../lib/calc'
import { money } from '../lib/format'
import { useStore } from '../state/store'
import { GoalIcon, GoalProgressBar } from './goals'

/**
 * Compares a price with what's left to save for the primary goal. The bar shows what's actually saved
 * for the goal, with the price drawn after it in the same hatched style as the Habit Simulator's potential savings. Never implies money leaves savings.
 */
export function PurchaseImpact({ price }: { price: number }) {
  const { state, today } = useStore()
  const goal = state.goals.find((g) => g.id === state.primaryGoalId) ?? state.goals[0]
  if (!goal) return null
  const p = projectGoal(goal, state.contributions, today)
  if (p.remaining <= 0)
    return <p className="text-sm text-muted">Your {goal.name} goal is fully funded, so this purchase doesn't compete with it.</p>
  const share = price / p.remaining
  const months = goal.monthlyContribution > 0 ? price / goal.monthlyContribution : 0
  const color = goalTint(goal).color
  return (
    <div>
      <div className="flex items-center gap-3">
        <GoalIcon goal={goal} size={40} />
        <p className="text-sm leading-relaxed">
          This <b>{money(price)}</b> purchase is equivalent to <b className="text-accent-700">{(share * 100).toFixed(1)}%</b> of the{' '}
          <b>{money(p.remaining)}</b> remaining for your {goal.name}.
        </p>
      </div>
      <GoalProgressBar goal={goal} p={p} extra={price} />
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: color }} /> {money(p.saved)} saved</span>
        <span className="flex items-center gap-1.5"><span className="hatch h-2 w-4 rounded-full" /> {money(price)} purchase</span>
        <span className="ml-auto">{money(goal.target)} goal</span>
      </div>
      {months > 0 && (
        <p className="mt-3 text-xs text-muted">
          That's about {months < 1 ? `${Math.round(months * 30)} days` : `${months.toFixed(1)} months`} of your {money(goal.monthlyContribution)} monthly contribution.
        </p>
      )}
    </div>
  )
}
