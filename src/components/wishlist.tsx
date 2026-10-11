import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { ITEM_ICONS, guessItemIcon } from '../data/meta'
import type { WishlistEntry } from '../data/types'
import { diffDays } from '../lib/date'
import { money } from '../lib/format'
import { useStore } from '../state/store'
import { IconTile } from './ui'

export function ItemImage({ item, size = 52 }: { item: Pick<WishlistEntry, 'name' | 'category' | 'icon' | 'imageUrl'>; size?: number }) {
  const [broken, setBroken] = useState(false)
  if (item.imageUrl && !broken)
    return (
      <img
        src={item.imageUrl}
        alt=""
        onError={() => setBroken(true)}
        className="shrink-0 rounded-2xl border border-line bg-paper object-cover"
        style={{ width: size, height: size }}
      />
    )
  const icon = ITEM_ICONS[item.icon ?? guessItemIcon(item.name, item.category)] ?? ITEM_ICONS.package
  return <IconTile icon={icon} color="#8b87a0" soft="#ecebef" size={size} />
}

export function daysSince(addedAt: string, today: string) {
  const n = Math.max(0, diffDays(today, addedAt))
  return n === 0 ? 'Added today' : `${n} day${n === 1 ? '' : 's'} in wishlist`
}

export function WishlistItem({ item, onClick }: { item: WishlistEntry; onClick: () => void }) {
  const { today } = useStore()
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3.5 rounded-3xl border border-line bg-paper p-3.5 text-left shadow-soft transition hover:border-accent-200 active:scale-[0.99]">
      <ItemImage item={item} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{item.name}</p>
        <p className="text-xs text-muted">{daysSince(item.addedAt, today)}</p>
      </div>
      <p className="tabular font-bold">{money(item.price)}</p>
      <ChevronRight size={16} className="text-faint" />
    </button>
  )
}
