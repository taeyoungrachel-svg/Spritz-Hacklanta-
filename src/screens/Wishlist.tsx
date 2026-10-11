import { Check, ChevronDown, Heart, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AddWishlistSheet } from '../components/AddWishlistSheet'
import { Button, EmptyState, cx } from '../components/ui'
import { WishlistItem } from '../components/wishlist'
import { money } from '../lib/format'
import { useStore } from '../state/store'

type Sort = 'high' | 'low' | 'newest' | 'oldest'

const SORTS: { value: Sort; label: string }[] = [
  { value: 'high', label: 'Highest price' },
  { value: 'low', label: 'Lowest price' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
]

function SortMenu({ value, onChange }: { value: Sort; onChange: (v: Sort) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc) }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-8 items-center gap-1 rounded-full border border-accent-200 bg-paper px-3 text-[13px] font-semibold text-accent-700 shadow-soft transition hover:bg-accent-50 active:scale-95"
      >
        Sort <ChevronDown size={15} className={cx('transition', open && 'rotate-180')} />
      </button>
      {open && (
        <ul role="listbox" aria-label="Sort" className="absolute top-full right-0 z-30 mt-1.5 w-44 animate-fade-in overflow-hidden rounded-2xl border border-line bg-paper py-1.5 shadow-lift">
          {SORTS.map((s) => (
            <li key={s.value} role="option" aria-selected={s.value === value}>
              <button
                onClick={() => { onChange(s.value); setOpen(false) }}
                className={cx('flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-accent-50', s.value === value ? 'font-semibold text-accent-700' : 'text-ink')}
              >
                {s.label}
                {s.value === value && <Check size={15} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function Wishlist() {
  const { state, push } = useStore()
  const [sort, setSort] = useState<Sort>('newest')
  const [adding, setAdding] = useState(false)
  const items = [...state.wishlist].sort((a, b) =>
    sort === 'high' ? b.price - a.price
      : sort === 'low' ? a.price - b.price
        : sort === 'oldest' ? (a.addedAt < b.addedAt ? -1 : 1)
          : a.addedAt < b.addedAt ? 1 : -1,
  )
  const total = items.reduce((s, i) => s + i.price, 0)

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-extrabold tracking-tight">Wishlist</h1>
        <Button size="sm" onClick={() => setAdding(true)}><Plus size={16} /> Add Wishlist item</Button>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {items.length ? `${items.length} item${items.length === 1 ? '' : 's'} · ${money(total)} total` : 'A place to let purchases wait'}
        </p>
        {items.length > 1 && <SortMenu value={sort} onChange={setSort} />}
      </div>

      <div className="mt-4 space-y-2.5">
        {items.length ? (
          items.map((w) => <WishlistItem key={w.id} item={w} onClick={() => push({ name: 'wishlistItem', id: w.id })} />)
        ) : (
          <EmptyState
            icon={<Heart size={22} />}
            title="Your wishlist is empty"
            body="When you check a purchase, you can save it here and revisit it later."
            action={<Button size="sm" onClick={() => setAdding(true)}>Add an item</Button>}
          />
        )}
      </div>

      <AddWishlistSheet open={adding} onClose={() => setAdding(false)} />
    </div>
  )
}
