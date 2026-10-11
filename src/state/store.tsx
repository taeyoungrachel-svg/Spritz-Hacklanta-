import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { habitDef } from '../data/meta'
import { createSeedState, generateDay, COFFEE_SHOPS, VISA_ID } from '../data/seed'
import type { AppState, Challenge, Contribution, ContributionKind, HabitId, Transaction } from '../data/types'
import { addDays, addMonths, diffDays, realToday } from '../lib/date'
import { challengeSummary, transferAccounts } from '../lib/calc'
import { round2, uid } from '../lib/format'

export type TabId = 'home' | 'wishlist' | 'insights' | 'goals'

export type Route =
  | { name: TabId }
  | { name: 'goal'; id: string }
  | { name: 'goalForm'; id?: string }
  | { name: 'catchup'; id: string }
  | { name: 'wishlistItem'; id: string }
  | { name: 'purchaseCheck' }
  | { name: 'habit'; habitId: HabitId }
  | { name: 'startChallenge'; habitId: HabitId; value?: number; retryOf?: string }
  | { name: 'tracker'; id: string }
  | { name: 'review'; id: string }
  | { name: 'result'; id: string }
  | { name: 'profile' }

export interface Allocation {
  goalId: string
  amount: number
}

interface Store {
  state: AppState
  today: string
  update: (fn: (s: AppState) => AppState) => void
  route: Route
  stack: Route[]
  push: (r: Route) => void
  replace: (r: Route) => void
  back: () => void
  goTab: (t: TabId) => void
  toast: (msg: string) => void
  toastMsg: string | null
  /** Moves money from a chosen checking account into one or more goals. Returns the transfer id. */
  startTransfer: (allocations: Allocation[], kind: ContributionKind, fromAccountId?: string) => string
  simulateScheduled: (goalId: string, outcome: 'success' | 'partial' | 'missed' | 'failed', partialAmount?: number) => void
  simulateChallengeWeek: (challengeId: string, onTarget: boolean) => void
  resetDemo: () => void
}

const KEY = 'mindful-fintech-state-v1'
const PENDING_MS = 1800
const Ctx = createContext<Store | null>(null)

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as AppState
      if (s.version === 1) {
        // A refresh mid-transfer: let pending transfers settle.
        s.contributions = s.contributions.map((c) => (c.status === 'pending' ? settle(c) : c))
        return s
      }
    }
  } catch {
    /* storage unavailable, fall back to fresh demo data */
  }
  return createSeedState(realToday())
}

function settle(c: Contribution): Contribution {
  const { settleAs, ...rest } = c
  return { ...rest, status: settleAs ?? 'completed' }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load)
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }])
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const today = useMemo(() => addDays(realToday(), state.demoOffsetDays), [state.demoOffsetDays])

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state])

  const update = useCallback((fn: (s: AppState) => AppState) => setState(fn), [])

  const toast = useCallback((msg: string) => {
    setToastMsg(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2600)
  }, [])

  const settleLater = useCallback((transferId: string) => {
    window.setTimeout(() => {
      setState((s) => ({
        ...s,
        contributions: s.contributions.map((c) => (c.transferId === transferId && c.status === 'pending' ? settle(c) : c)),
      }))
    }, PENDING_MS)
  }, [])

  const startTransfer = useCallback(
    (allocations: Allocation[], kind: ContributionKind, fromAccountId?: string) => {
      const transferId = uid('tr')
      const rows: Contribution[] = allocations
        .filter((a) => a.amount > 0)
        .map((a) => ({
          id: uid('c'), goalId: a.goalId, transferId, date: today, planned: round2(a.amount), settled: round2(a.amount),
          status: 'pending', kind, settleAs: 'completed', fromAccountId,
        }))
      setState((s) => ({ ...s, contributions: [...s.contributions, ...rows] }))
      settleLater(transferId)
      return transferId
    },
    [today, settleLater],
  )

  const simulateScheduled = useCallback(
    (goalId: string, outcome: 'success' | 'partial' | 'missed' | 'failed', partialAmount?: number) => {
      const transferId = uid('tr')
      setState((s) => {
        const goal = s.goals.find((g) => g.id === goalId)
        if (!goal) return s
        const planned = goal.monthlyContribution
        const base = { id: uid('c'), goalId, transferId, date: goal.nextContributionDate, planned, kind: 'monthly' as const, fromAccountId: transferAccounts(s)[0]?.id }
        const row: Contribution =
          outcome === 'success'
            ? { ...base, settled: planned, status: 'pending', settleAs: 'completed' }
            : outcome === 'partial'
              ? { ...base, settled: round2(Math.min(planned, Math.max(0, partialAmount ?? planned / 2))), status: 'pending', settleAs: 'partial' }
              : { ...base, settled: 0, status: outcome === 'missed' ? 'skipped' : 'failed' }
        return {
          ...s,
          contributions: [...s.contributions, row],
          goals: s.goals.map((g) =>
            g.id === goalId ? { ...g, nextContributionDate: addMonths(g.nextContributionDate, 1, g.contributionDay) } : g,
          ),
        }
      })
      if (outcome === 'success' || outcome === 'partial') settleLater(transferId)
    },
    [settleLater],
  )

  /** Demo: fills the rest of the current challenge week with habit transactions and moves the clock forward. */
  const simulateChallengeWeek = useCallback(
    (challengeId: string, onTarget: boolean) => {
      setState((s) => {
        const c = s.challenges.find((x) => x.id === challengeId)
        if (!c) return s
        const now = addDays(realToday(), s.demoOffsetDays)
        const sum = challengeSummary(s, c, now)
        if (sum.ended) return s
        const week = sum.weeks[sum.currentWeek]
        const from = now > week.start ? addDays(now, 1) : week.start
        const days: string[] = []
        for (let d = from; d <= week.end; d = addDays(d, 1)) days.push(d)
        const r = Math.random
        const generated: Transaction[] = days.flatMap((d) => generateDay(d, r, [c.habitId]))
        generated.push(...habitTransactions(c, onTarget ? c.target : c.baseline, week.total, days.length ? days : [week.end]))
        const newToday = addDays(week.end, 1)
        const offset = s.demoOffsetDays + Math.max(0, diffDays(newToday, now))
        return { ...s, demoOffsetDays: offset, transactions: [...generated, ...s.transactions].sort((a, b) => (a.date < b.date ? 1 : -1)) }
      })
    },
    [],
  )

  const resetDemo = useCallback(() => {
    setState({ ...createSeedState(realToday()), onboarded: true })
    setStack([{ name: 'home' }])
  }, [])

  const push = useCallback((r: Route) => setStack((s) => [...s, r]), [])
  const replace = useCallback((r: Route) => setStack((s) => [...s.slice(0, -1), r]), [])
  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), [])
  const goTab = useCallback((t: TabId) => setStack([{ name: t }]), [])

  const value: Store = {
    state, today, update, route: stack[stack.length - 1], stack, push, replace, back, goTab, toast, toastMsg,
    startTransfer, simulateScheduled, simulateChallengeWeek, resetDemo,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

function habitTransactions(c: Challenge, desiredWeekly: number, soFar: number, days: string[]): Transaction[] {
  const h = habitDef(c.habitId)
  const out: Transaction[] = []
  const need = desiredWeekly - soFar
  if (need <= 0.01) return out
  if (c.metric === 'visits') {
    const count = Math.round(need)
    for (let i = 0; i < count; i++) {
      const date = days[Math.floor((i * days.length) / Math.max(1, count))]
      const merchant = c.habitId === 'coffee' ? COFFEE_SHOPS[i % COFFEE_SHOPS.length] : ['Sweetgreen', 'Thai Basil', 'Nopa'][i % 3]
      const amount = c.habitId === 'coffee' ? 5.75 + (i % 3) * 0.25 : 20 + (i % 3) * 2
      out.push({ id: uid('t'), date, merchant, amount, category: 'restaurants', habit: c.habitId, accountId: VISA_ID })
    }
  } else {
    const parts = need > 40 ? 2 : 1
    for (let i = 0; i < parts; i++) {
      out.push({ id: uid('t'), date: days[Math.min(days.length - 1, i * 2)], merchant: ['Uniqlo', 'Target'][i], amount: round2(need / parts), category: 'shopping', habit: h.id, accountId: VISA_ID })
    }
  }
  return out
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside provider')
  return s
}
