import { CircleCheck } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { BottomNavigation } from './components/BottomNavigation'
import { StoreProvider, useStore, type Route, type TabId } from './state/store'
import { ChallengeResult } from './screens/ChallengeResult'
import { ChallengeReview } from './screens/ChallengeReview'
import { CatchUp } from './screens/CatchUp'
import { GoalDetail } from './screens/GoalDetail'
import { GoalForm } from './screens/GoalForm'
import { Goals } from './screens/Goals'
import { HabitSimulator } from './screens/HabitSimulator'
import { HabitTracker } from './screens/HabitTracker'
import { Home } from './screens/Home'
import { Insights } from './screens/Insights'
import { Onboarding } from './screens/Onboarding'
import { Profile } from './screens/Profile'
import { PurchaseCheck } from './screens/PurchaseCheck'
import { StartChallenge } from './screens/StartChallenge'
import { Wishlist } from './screens/Wishlist'
import { WishlistDetail } from './screens/WishlistDetail'

const TAB_ROUTES: TabId[] = ['home', 'wishlist', 'insights', 'goals']

function renderRoute(r: Route): ReactNode {
  switch (r.name) {
    case 'home': return <Home />
    case 'wishlist': return <Wishlist />
    case 'insights': return <Insights />
    case 'goals': return <Goals />
    case 'goal': return <GoalDetail id={r.id} />
    case 'goalForm': return <GoalForm id={r.id} />
    case 'catchup': return <CatchUp id={r.id} />
    case 'wishlistItem': return <WishlistDetail id={r.id} />
    case 'purchaseCheck': return <PurchaseCheck />
    case 'habit': return <HabitSimulator habitId={r.habitId} />
    case 'startChallenge': return <StartChallenge habitId={r.habitId} value={r.value} retryOf={r.retryOf} />
    case 'tracker': return <HabitTracker id={r.id} />
    case 'review': return <ChallengeReview id={r.id} />
    case 'result': return <ChallengeResult id={r.id} />
    case 'profile': return <Profile />
  }
}

function Shell() {
  const { state, route, stack, toastMsg } = useStore()
  const scroller = useRef<HTMLDivElement>(null)
  const isTab = (TAB_ROUTES as string[]).includes(route.name)

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [route, stack.length])

  return (
    <div className="flex min-h-full items-center justify-center sm:py-6">
      <div className="relative isolate flex h-[100dvh] w-full flex-col overflow-hidden bg-gradient-to-b from-[#f1eef8] to-[#faf9fd] sm:h-[min(872px,calc(100dvh-48px))] sm:w-[413px] sm:rounded-[60px] sm:border-[10px] sm:border-black sm:shadow-[0_30px_80px_rgb(70_50_130/0.3)]">
        {/* soft ambient light behind everything */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="glow-orb -top-16 -right-20 size-72 bg-[#a78bfa]/30" />
          <div className="glow-orb top-[46%] -left-28 size-64 bg-[#c4b5fd]/40" />
          <div className="glow-orb -bottom-24 right-[-3rem] size-72 bg-[#8b5cf6]/22" />
        </div>
        {!state.onboarded ? (
          <Onboarding />
        ) : (
          <>
            <div ref={scroller} className="no-scrollbar flex-1 overflow-y-auto">
              <div key={`${stack.length}-${JSON.stringify(route)}`} className="min-h-full animate-screen-in px-5 pb-10 sm:px-6 sm:pt-5">
                {renderRoute(route)}
              </div>
            </div>
            {isTab && <BottomNavigation active={route.name as TabId} />}
          </>
        )}
        <div id="overlay-root" className="pointer-events-none absolute inset-0 z-50" />
        {toastMsg && (
          <div className="pointer-events-none absolute inset-x-0 top-4 z-[70] flex justify-center px-6">
            <div className="flex animate-pop items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[13px] font-semibold text-white shadow-lift">
              <CircleCheck size={16} className="text-accent-300" /> {toastMsg}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
