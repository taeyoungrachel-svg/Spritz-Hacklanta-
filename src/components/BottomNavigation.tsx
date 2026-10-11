import { ChartPie, Heart, House, Target } from 'lucide-react'
import type { TabId } from '../state/store'
import { useStore } from '../state/store'
import { cx } from './ui'

const TABS: { id: TabId; label: string; icon: typeof House }[] = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'insights', label: 'Insights', icon: ChartPie },
  { id: 'goals', label: 'Goals', icon: Target },
]

export function BottomNavigation({ active }: { active: TabId }) {
  const { goTab } = useStore()
  return (
    <nav className="relative z-20 grid grid-cols-4 border-t border-line bg-paper/95 px-2 pt-2 pb-[max(10px,env(safe-area-inset-bottom))] sm:px-5 sm:pb-4 backdrop-blur">
      {TABS.map(({ id, label, icon: Icon }) => {
        const on = id === active
        return (
          <button
            key={id}
            onClick={() => goTab(id)}
            aria-current={on ? 'page' : undefined}
            className={cx('flex flex-col items-center gap-1 rounded-2xl py-1.5 text-[11px] font-semibold transition', on ? 'text-accent-600' : 'text-faint hover:text-muted')}
          >
            <span className={cx('grid h-8 w-14 place-items-center rounded-full transition', on && 'bg-accent-100')}>
              <Icon size={21} strokeWidth={on ? 2.3 : 2} />
            </span>
            {label}
          </button>
        )
      })}
    </nav>
  )
}
