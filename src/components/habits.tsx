import { ArrowRight } from 'lucide-react'
import { habitDef, type HabitDef } from '../data/meta'
import type { Challenge } from '../data/types'
import { challengeSummary, fmtMetric } from '../lib/calc'
import { fmtShort } from '../lib/date'
import { money } from '../lib/format'
import { useStore } from '../state/store'
import { Badge, Card, IconTile, ProgressBar } from './ui'

/** Active challenge summary card (Home). */
export function HabitCard({ challenge, onClick }: { challenge: Challenge; onClick?: () => void }) {
  const { state, today } = useStore()
  const h = habitDef(challenge.habitId)
  const s = challengeSummary(state, challenge, today)
  const week = s.weeks[s.currentWeek]
  const over = week.total > challenge.target + 1e-9
  return (
    <Card onClick={onClick}>
      <div className="flex items-center gap-3">
        <IconTile icon={h.icon} color={h.color} soft={h.soft} size={40} />
        <div className="min-w-0 flex-1">
          <p className="font-bold">{h.challengeName}</p>
          <p className="text-xs text-muted">
            {s.ended ? 'Ready to review' : `Week ${s.currentWeek + 1} of ${challenge.durationWeeks}`} · ends {fmtShort(s.end)}
          </p>
        </div>
        {s.ended ? <Badge tone="lav">Review</Badge> : over ? <Badge tone="peach">Above target</Badge> : <Badge tone="mint">On track</Badge>}
      </div>
      <div className="mt-4 flex items-baseline justify-between text-sm">
        <span className="text-muted">This week</span>
        <span className="tabular font-semibold">
          {fmtMetric(challenge.metric, week.total)} <span className="font-normal text-muted">/ target {fmtMetric(challenge.metric, challenge.target)}</span>
        </span>
      </div>
      <ProgressBar
        value={challenge.target > 0 ? Math.min(1, week.total / challenge.target) : week.total > 0 ? 1 : 0}
        color={over ? 'var(--color-warn-500)' : h.color}
        className="mt-2"
        height={8}
      />
    </Card>
  )
}

/** Insights card: how often you went and what you spent over the last 7 days. */
export function ExploreHabitCard({ h, visits, spent, onClick }: { h: HabitDef; visits: number; spent: number; onClick: () => void }) {
  const noun = h.metric === 'visits' ? (visits === 1 ? 'visit' : 'visits') : visits === 1 ? 'purchase' : 'purchases'
  return (
    <button onClick={onClick} className="group flex w-[172px] shrink-0 flex-col rounded-3xl border border-line bg-paper p-4 text-left shadow-soft transition hover:border-accent-200 active:scale-[0.98]">
      <IconTile icon={h.icon} color={h.color} soft={h.soft} size={40} />
      <p className="mt-3 font-bold">{h.name}</p>
      <p className="tabular mt-1 text-sm font-semibold">{visits} {noun}</p>
      <p className="tabular text-sm text-muted">{money(spent)} spent this week</p>
      <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-accent-600">
        Explore habit <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
      </span>
    </button>
  )
}

