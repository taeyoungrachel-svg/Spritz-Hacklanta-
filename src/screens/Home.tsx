import { ArrowRight, ShoppingBag, Sprout } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { goalGlowStyle } from '../data/meta'
import { ContributionCard, DateProjection, GoalIcon, GoalStatusBadge, SavingsProgress, useProjection } from '../components/goals'
import { HabitCard } from '../components/habits'
import { Button, Card, EmptyState, LinkButton, SectionTitle, cx } from '../components/ui'
import { WishlistItem } from '../components/wishlist'
import type { Goal } from '../data/types'
import { useStore } from '../state/store'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export function Home() {
  const { state, push, goTab } = useStore()
  const active = state.challenges.filter((c) => c.status === 'active')
  const wish = [...state.wishlist].sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1)).slice(0, 2)

  return (
    <div className="pt-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[30px] leading-none font-extrabold tracking-tight text-accent-600">Spritz</p>
          <h1 className="mt-2 text-[24px] leading-tight">{greeting()}, <em>{state.userName}</em></h1>
        </div>
        <button
          aria-label="Profile and settings"
          title="Profile and settings"
          onClick={() => push({ name: 'profile' })}
          className="rounded-full shadow-soft transition active:scale-95"
        >
          <Avatar name={state.userName} size={44} />
        </button>
      </header>

      {state.goals.length > 0 && <GoalStack />}

      <Card tone="glow" className="mt-4">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-paper text-accent-600 shadow-soft"><ShoppingBag size={20} /></div>
          <div>
            <p className="font-bold">Thinking of buying something?</p>
            <p className="text-sm text-muted">Check how this purchase fits your priorities.</p>
          </div>
        </div>
        <Button full className="mt-4" onClick={() => push({ name: 'purchaseCheck' })}>Check a Purchase</Button>
      </Card>

      <SectionTitle action={<LinkButton onClick={() => goTab('insights')}>Explore habits</LinkButton>}>Active habit challenges</SectionTitle>
      {active.length ? (
        <div className="space-y-3">
          {active.map((c) => <HabitCard key={c.id} challenge={c} onClick={() => push({ name: 'tracker', id: c.id })} />)}
        </div>
      ) : (
        <EmptyState
          icon={<Sprout size={22} />}
          title="No active challenges"
          body="Explore a habit in Insights to see how small changes could add up."
          action={<Button size="sm" variant="secondary" onClick={() => goTab('insights')}>Explore habits</Button>}
        />
      )}

      <SectionTitle action={state.wishlist.length > 2 && <LinkButton onClick={() => goTab('wishlist')}>See all {state.wishlist.length}</LinkButton>}>Wishlist</SectionTitle>
      {wish.length ? (
        <div className="space-y-2.5">
          {wish.map((w) => <WishlistItem key={w.id} item={w} onClick={() => push({ name: 'wishlistItem', id: w.id })} />)}
        </div>
      ) : (
        <p className="rounded-3xl border border-dashed border-line p-5 text-center text-sm text-muted">Items you save from a purchase check will appear here.</p>
      )}
    </div>
  )
}

const PEEK = 44 // space reserved at each screen edge, so the neighbouring cards show and run off the screen
const GAP = 8
const RANGE = 3 // how many cards either side are kept ready off screen

const mod = (a: number, b: number) => ((a % b) + b) % b

/**
 * Goals as an endless swipeable card stack. The active goal sits centred with the previous and next goals peeking in from
 * both screen edges, slightly smaller, and the deck loops forever in either direction. Swiping slides the whole track and the
 * incoming card scales up as it arrives; the pill below follows along. The primary goal starts in front.
 */
function GoalStack() {
  const { state, push } = useStore()
  const ordered = [...state.goals].sort((a, b) => (a.id === state.primaryGoalId ? -1 : b.id === state.primaryGoalId ? 1 : 0))
  const n = ordered.length
  // `index` keeps counting past either end (it is never wrapped), so the cards can slide the same way forever.
  const [index, setIndex] = useState(0)
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [width, setWidth] = useState(0)
  const viewport = useRef<HTMLDivElement>(null)
  const start = useRef<{ x: number; t: number } | null>(null)
  const moved = useRef(false)

  useLayoutEffect(() => {
    const el = viewport.current
    if (!el) return
    const measure = () => setWidth(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const loops = n > 1
  const edge = loops ? PEEK : 20
  const slideW = Math.max(0, width - edge * 2)
  const step = slideW + GAP
  const position = step ? index - drag / step : index // fractional position while dragging
  const current = mod(index, n)
  const goToGoal = (goalIdx: number) => {
    // take the shortest way round the loop
    let delta = goalIdx - current
    if (delta > n / 2) delta -= n
    if (delta < -n / 2) delta += n
    setIndex(index + delta)
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!loops) return
    start.current = { x: e.clientX, t: performance.now() }
    moved.current = false
    setDragging(true)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!start.current) return
    const dx = e.clientX - start.current.x
    if (Math.abs(dx) > 6 && !moved.current) { moved.current = true; e.currentTarget.setPointerCapture(e.pointerId) }
    setDrag(dx)
  }
  function onPointerUp(e: React.PointerEvent) {
    const s0 = start.current
    start.current = null
    if (!s0) return
    const dx = e.clientX - s0.x
    const velocity = dx / Math.max(1, performance.now() - s0.t)
    if (dx < -step * 0.2 || velocity < -0.45) setIndex((i) => i + 1)
    else if (dx > step * 0.2 || velocity > 0.45) setIndex((i) => i - 1)
    setDrag(0)
    setDragging(false)
  }

  const range = loops ? RANGE : 0
  return (
    <div className="mt-5">
      <div
        ref={viewport}
        tabIndex={0}
        aria-roledescription="carousel"
        aria-label="Your goals"
        onKeyDown={(e) => {
          if (!loops) return
          if (e.key === 'ArrowRight') setIndex((i) => i + 1)
          if (e.key === 'ArrowLeft') setIndex((i) => i - 1)
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={(e) => { if (moved.current) { e.stopPropagation(); e.preventDefault(); moved.current = false } }}
        className="-mx-5 -my-3 touch-pan-y sm:-mx-6 overflow-x-hidden py-3 outline-none select-none"
      >
        {/* every card sits in the same grid cell, so the row is as tall as the tallest card, and slides by transform */}
        <div className="grid">
          {width > 0 && Array.from({ length: range * 2 + 1 }, (_, k) => index - range + k).map((p) => {
            const g = ordered[mod(p, n)]
            const d = Math.min(1, Math.abs(p - position))
            return (
              <div
                key={p}
                style={{
                  gridArea: '1 / 1',
                  justifySelf: 'start',
                  width: slideW,
                  transform: `translateX(${edge + (p - index) * step + drag}px) scale(${1 - 0.08 * d})`,
                  opacity: 1 - 0.3 * d,
                  transition: dragging ? 'none' : 'transform 0.55s cubic-bezier(0.22, 0.9, 0.28, 1), opacity 0.55s ease',
                }}
              >
                <StackCard
                  goal={g}
                  isPrimary={g.id === state.primaryGoalId}
                  onOpen={() => push({ name: 'goal', id: g.id })}
                />
              </div>
            )
          })}
        </div>
      </div>

      {loops && (
        <div className="mt-4 flex items-center justify-center gap-2" role="tablist" aria-label="Choose a goal">
          {ordered.map((g, i) => (
            <button
              key={g.id}
              role="tab"
              aria-selected={i === current}
              aria-label={`Show ${g.name}`}
              onClick={() => goToGoal(i)}
              className={cx('h-2 rounded-full transition-all duration-500', i === current ? 'w-6 bg-accent-500' : 'w-2 bg-accent-200 hover:bg-accent-300')}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function StackCard({ goal, isPrimary, onOpen }: { goal: Goal; isPrimary: boolean; onOpen: () => void }) {
  const p = useProjection(goal)
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
      style={goalGlowStyle(goal)}
      className="glow-card flex h-full cursor-pointer flex-col rounded-3xl border p-4 shadow-soft transition"
    >
      <div className="flex items-center gap-3">
        <GoalIcon goal={goal} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-faint uppercase">{isPrimary ? 'Primary goal' : 'Savings goal'}</p>
          <p className="truncate text-lg font-bold">{goal.name}</p>
        </div>
        <GoalStatusBadge goal={goal} p={p} />
      </div>
      <div className="mt-4"><SavingsProgress goal={goal} p={p} /></div>
      <div className="mt-4"><DateProjection goal={goal} p={p} hideNote /></div>
      <div className="mt-4"><ContributionCard goal={goal} embedded /></div>
      <p className="mt-auto flex items-center justify-end gap-1 pt-3 text-[13px] font-semibold text-accent-600">View goal <ArrowRight size={14} /></p>
    </div>
  )
}
