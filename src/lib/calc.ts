import { HABIT_CATEGORY, habitDef, type HabitDef } from '../data/meta'
import type {
  AppState, CategoryId, Challenge, Contribution, Goal, HabitId, Transaction, TransactionAdjustment,
} from '../data/types'
import { DEFAULT_LINKED_ACCOUNTS } from '../data/seed'
import { addDays, addMonths, diffDays, nextOnOrAfter } from './date'

/* ───────────────────────── Transactions ───────────────────────── */

export interface EffectiveTx {
  tx: Transaction
  adj?: TransactionAdjustment
  category: CategoryId
  excluded: boolean
  /** Personal net spending after shared costs / reimbursements. */
  personal: number
  visits: number
  adjusted: boolean
}

export function effectiveTx(tx: Transaction, adj?: TransactionAdjustment): EffectiveTx {
  const excluded = !!adj?.excluded
  const personal = adj?.personalAmount ?? Math.max(0, tx.amount - (adj?.reimbursement ?? 0))
  return {
    tx, adj,
    category: adj?.category ?? tx.category,
    excluded,
    personal: Math.round(personal * 100) / 100,
    visits: excluded ? 0 : (adj?.visits ?? 1),
    adjusted: !!adj && Object.values(adj).some((v) => v !== undefined && v !== false),
  }
}

export const linkedAccountsOf = (state: AppState) => state.linkedAccounts ?? DEFAULT_LINKED_ACCOUNTS

/** Checking accounts that can fund a transfer into a goal. */
export const transferAccounts = (state: AppState) => linkedAccountsOf(state).filter((a) => a.kind === 'checking' && a.allowTransfers)

/** Imported transactions from accounts the user has connected and shared with the app. */
export function trackedTransactions(state: AppState) {
  const on = new Set(linkedAccountsOf(state).filter((a) => a.trackTransactions).map((a) => a.id))
  return state.transactions.filter((t) => !t.accountId || on.has(t.accountId))
}

export function txInRange(state: AppState, from: string, to: string): EffectiveTx[] {
  return trackedTransactions(state)
    .filter((t) => t.date >= from && t.date <= to)
    .map((t) => effectiveTx(t, state.adjustments[t.id]))
}

export function spendingByCategory(items: EffectiveTx[]) {
  const totals = new Map<CategoryId, number>()
  for (const e of items) totals.set(e.category, (totals.get(e.category) ?? 0) + e.personal)
  const total = [...totals.values()].reduce((a, b) => a + b, 0)
  return { total, totals }
}

/**
 * The user's habit as it really looks in their tracked transactions over the last 10 weeks (frequency and typical cost),
 * so the simulator and challenges reflect every account they've added rather than fixed numbers.
 */
export function habitFromHistory(state: AppState, id: HabitId, today: string): HabitDef {
  const base = habitDef(id)
  const items = habitEntries(state, id, addDays(today, -69), today).filter((e) => !e.excluded)
  const visits = items.reduce((n, e) => n + e.visits, 0)
  const spend = items.reduce((n, e) => n + e.personal, 0)
  if (visits === 0) return base
  // Typical cost per visit uses the median so one big shared order doesn't skew it.
  const costs = items.map((e) => e.personal / Math.max(1, e.visits)).sort((a, b) => a - b)
  const typical = Math.max(1, Math.round(costs[Math.floor(costs.length / 2)]))
  if (base.period === 'week') {
    const baseline = Math.max(1, Math.round(visits / 10))
    return { ...base, baseline, avgCost: typical, max: Math.max(base.max, baseline + 3) }
  }
  const baseline = Math.max(10, Math.round(spend / (70 / 30.4) / 10) * 10)
  return { ...base, baseline, avgCost: typical, max: Math.max(base.max, baseline * 2) }
}

export function habitEntries(state: AppState, habitId: HabitId, from: string, to: string): EffectiveTx[] {
  return txInRange(state, from, to).filter((e) => e.tx.habit === habitId && e.category === HABIT_CATEGORY[habitId])
}

/* ───────────────────────── Goals & contributions ───────────────────────── */

export const isSettled = (c: Contribution) => c.status === 'completed' || c.status === 'partial'

/** Actual savings: only confirmed, settled deposits count. */
export function goalSaved(goalId: string, contributions: Contribution[]) {
  return contributions.filter((c) => c.goalId === goalId && isSettled(c)).reduce((s, c) => s + c.settled, 0)
}

export function effectiveNextDate(goal: Goal, today: string) {
  return goal.nextContributionDate >= today ? goal.nextContributionDate : nextOnOrAfter(today, goal.contributionDay)
}

export interface Projection {
  saved: number
  remaining: number
  progress: number
  /** ISO date the goal is projected to be reached, or null if there's no plan. */
  estimate: string | null
  status: 'complete' | 'on-track' | 'delayed' | 'no-plan' | 'no-deadline'
  periodsToTarget: number
}

/**
 * Projects completion from actual saved money and future scheduled contributions.
 * Missed / partial / extra deposits are reflected through `saved` and the next scheduled date,
 * so the estimate moves by however much they actually change the remaining balance.
 */
export function projectGoal(
  goal: Goal,
  contributions: Contribution[],
  today: string,
  opts: { monthly?: number; extraNow?: number } = {},
): Projection {
  const saved = goalSaved(goal.id, contributions) + (opts.extraNow ?? 0)
  const remaining = Math.max(0, goal.target - saved)
  const progress = goal.target > 0 ? Math.min(1, saved / goal.target) : 0
  const monthly = opts.monthly ?? goal.monthlyContribution
  const next = effectiveNextDate(goal, today)
  const periodsToTarget = goal.targetDate ? countPeriods(next, goal.targetDate, goal.contributionDay) : 0

  if (remaining <= 0.005) return { saved, remaining: 0, progress: 1, estimate: today, status: 'complete', periodsToTarget }
  if (monthly <= 0) return { saved, remaining, progress, estimate: null, status: 'no-plan', periodsToTarget }

  const n = Math.ceil(remaining / monthly - 1e-9)
  const estimate = addMonths(next, n - 1, goal.contributionDay)
  const status = !goal.targetDate ? 'no-deadline' : estimate <= goal.targetDate ? 'on-track' : 'delayed'
  return { saved, remaining, progress, estimate, status, periodsToTarget }
}

/** Number of scheduled contribution dates from `start` through `end`, inclusive. */
export function countPeriods(start: string, end: string, day: number) {
  let n = 0
  let d = start
  while (d <= end && n < 600) {
    n++
    d = addMonths(d, 1, day)
  }
  return n
}

export interface CatchUpPlan {
  periods: number
  oneTimeNeeded: number
  monthlyNeeded: number | null
}

export function catchUpPlan(goal: Goal, contributions: Contribution[], today: string): CatchUpPlan {
  const p = projectGoal(goal, contributions, today)
  const periods = p.periodsToTarget
  return {
    periods,
    oneTimeNeeded: Math.max(0, Math.ceil(p.remaining - periods * goal.monthlyContribution)),
    monthlyNeeded: periods > 0 ? Math.ceil(p.remaining / periods) : null,
  }
}

/** Month-by-month savings trajectory for the projection chart. */
export function trajectory(goal: Goal, contributions: Contribution[], today: string) {
  const p = projectGoal(goal, contributions, today)
  const points: { label: string; date: string; actual?: number; projected?: number }[] = []
  const settled = contributions.filter((c) => c.goalId === goal.id && isSettled(c)).sort((a, b) => (a.date < b.date ? -1 : 1))
  let running = 0
  const byMonth = new Map<string, number>()
  for (const c of settled) {
    running += c.settled
    byMonth.set(c.date.slice(0, 7), running)
  }
  for (const [m, v] of byMonth) points.push({ label: m, date: `${m}-01`, actual: v })
  if (points.length) points[points.length - 1].projected = points[points.length - 1].actual
  if (p.estimate && p.status !== 'complete') {
    let d = effectiveNextDate(goal, today)
    let v = p.saved
    while (d <= p.estimate) {
      v = Math.min(goal.target, v + goal.monthlyContribution)
      points.push({ label: d.slice(0, 7), date: d, projected: v })
      d = addMonths(d, 1, goal.contributionDay)
    }
  }
  return points
}

/* ───────────────────────── Habit challenges ───────────────────────── */

export const challengeEnd = (c: Challenge) => addDays(c.startDate, c.durationWeeks * 7 - 1)

export function metricValue(e: EffectiveTx, metric: Challenge['metric']) {
  if (e.excluded) return 0
  return metric === 'visits' ? e.visits : e.personal
}

export interface ChallengeWeek {
  index: number
  start: string
  end: string
  total: number
  spend: number
}

export interface ChallengeSummary {
  weeks: ChallengeWeek[]
  currentWeek: number
  ended: boolean
  end: string
  total: number
  allowed: number
  entries: EffectiveTx[]
  elapsedDays: number
  baselineWeeklySpend: number
  usualToDate: number
  actualToDate: number
  reduction: number
  onTrack: boolean
}

export function challengeSummary(state: AppState, c: Challenge, today: string): ChallengeSummary {
  const h = habitDef(c.habitId)
  const end = challengeEnd(c)
  const last = today < end ? today : end
  const entries = habitEntries(state, c.habitId, c.startDate, end).sort((a, b) => (a.tx.date < b.tx.date ? 1 : -1))
  const weeks: ChallengeWeek[] = Array.from({ length: c.durationWeeks }, (_, i) => {
    const start = addDays(c.startDate, i * 7)
    const wEnd = addDays(start, 6)
    const inWeek = entries.filter((e) => e.tx.date >= start && e.tx.date <= wEnd)
    return {
      index: i, start, end: wEnd,
      total: inWeek.reduce((s, e) => s + metricValue(e, c.metric), 0),
      spend: inWeek.reduce((s, e) => s + (e.excluded ? 0 : e.personal), 0),
    }
  })
  const elapsedDays = Math.max(0, Math.min(c.durationWeeks * 7, diffDays(last, c.startDate) + 1))
  const currentWeek = Math.min(c.durationWeeks - 1, Math.max(0, Math.floor(diffDays(today, c.startDate) / 7)))
  const baselineWeeklySpend = c.metric === 'visits' ? c.baseline * (c.avgCost ?? h.avgCost) : c.baseline
  const usualToDate = (baselineWeeklySpend * elapsedDays) / 7
  const actualToDate = weeks.reduce((s, w) => s + w.spend, 0)
  const total = weeks.reduce((s, w) => s + w.total, 0)
  const allowed = c.target * c.durationWeeks
  return {
    weeks, currentWeek, end, ended: today > end, total, allowed, entries, elapsedDays, baselineWeeklySpend,
    usualToDate, actualToDate, reduction: usualToDate - actualToDate,
    onTrack: weeks[currentWeek].total <= c.target + 1e-9,
  }
}

/** Formats a challenge metric value: visits as a count, spend as dollars. */
export function fmtMetric(metric: Challenge['metric'], v: number) {
  if (metric === 'visits') return `${Math.round(v * 10) / 10} ${Math.abs(v - 1) < 1e-9 ? 'visit' : 'visits'}`
  return `$${v.toFixed(v % 1 ? 2 : 0)}`
}

/* ───────────────────────── Simulator allocations ───────────────────────── */

export type AllocationMode = 'primary' | 'equal' | 'custom'

/** Splits a hypothetical pool across goals. Primary-first fills the primary goal before others. */
export function allocatePool(
  pool: number,
  goals: { id: string; remaining: number }[],
  primaryId: string,
  mode: AllocationMode,
  customPct: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = Object.fromEntries(goals.map((g) => [g.id, 0]))
  if (pool <= 0 || goals.length === 0) return out
  if (mode === 'equal') {
    for (const g of goals) out[g.id] = pool / goals.length
    return out
  }
  if (mode === 'custom') {
    for (const g of goals) out[g.id] = (pool * (customPct[g.id] ?? 0)) / 100
    return out
  }
  let left = pool
  const ordered = [...goals].sort((a, b) => (a.id === primaryId ? -1 : b.id === primaryId ? 1 : 0))
  for (const g of ordered) {
    const take = Math.min(left, g.remaining)
    out[g.id] = take
    left -= take
  }
  if (left > 0) out[ordered[0].id] += left
  return out
}

/* ───────────────────────── Percentage allocation ───────────────────────── */

/** Splits an integer `total` across `weights` using largest-remainder so the parts always add up exactly. */
export function apportion(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  const w = sum > 0 ? weights : weights.map(() => 1)
  const wSum = sum > 0 ? sum : w.length
  const raw = w.map((x) => (total * x) / wSum)
  const out = raw.map(Math.floor)
  let left = total - out.reduce((a, b) => a + b, 0)
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac || a.i - b.i)
  for (const { i } of order) {
    if (left <= 0) break
    out[i]++
    left--
  }
  return out
}

/**
 * Applies a user-entered percentage to one goal (clamped to 0–100) and spreads the remainder over the other goals,
 * in proportion to their `base` values (evenly if they are all 0). The result always totals exactly 100.
 */
export function redistribute(base: Record<string, number>, id: string, value: number): Record<string, number> {
  const v = Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)))
  const others = Object.keys(base).filter((k) => k !== id)
  if (others.length === 0) return { [id]: 100 }
  const parts = apportion(100 - v, others.map((k) => base[k] ?? 0))
  const out: Record<string, number> = { [id]: v }
  others.forEach((k, i) => (out[k] = parts[i]))
  return out
}

/** Converts percentages (totalling 100) into dollar amounts that add up to exactly `pool` (to the cent). */
export function splitByPercent(pool: number, pcts: Record<string, number>): Record<string, number> {
  const ids = Object.keys(pcts)
  const cents = apportion(Math.round(Math.max(0, pool) * 100), ids.map((k) => pcts[k]))
  return Object.fromEntries(ids.map((k, i) => [k, cents[i] / 100]))
}
