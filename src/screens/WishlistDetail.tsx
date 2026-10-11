import { CalendarDays, Clock, Pencil, Sparkles, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { AddWishlistSheet } from '../components/AddWishlistSheet'
import { PurchaseImpact } from '../components/PurchaseImpact'
import { Button, Card, ConfirmationModal, IconButton, InfoNotice, ScreenHeader, SectionTitle } from '../components/ui'
import { ItemImage } from '../components/wishlist'
import { categoryMeta } from '../data/meta'
import { diffDays, fmtDate } from '../lib/date'
import { money, uid } from '../lib/format'
import { useStore } from '../state/store'

export function WishlistDetail({ id }: { id: string }) {
  const { state, today, back, update, toast } = useStore()
  const item = state.wishlist.find((w) => w.id === id)
  const [confirm, setConfirm] = useState<'buy' | 'remove' | null>(null)
  const [editing, setEditing] = useState(false)
  if (!item) return <ScreenHeader onBack={back} title="Item not found" />
  const days = Math.max(0, diffDays(today, item.addedAt))

  function buy() {
    update((s) => ({
      ...s,
      wishlist: s.wishlist.filter((w) => w.id !== item!.id),
      purchases: [{ id: uid('p'), name: item!.name, price: item!.price, category: item!.category, date: today, source: 'wishlist', motivation: item!.motivation }, ...s.purchases],
    }))
    toast(`${item!.name} moved to purchase history`)
    back()
  }
  function remove() {
    update((s) => ({ ...s, wishlist: s.wishlist.filter((w) => w.id !== item!.id) }))
    toast('Removed from wishlist')
    back()
  }

  return (
    <div>
      <ScreenHeader onBack={back} title="Wishlist item" right={<IconButton label="Edit item" onClick={() => setEditing(true)}><Pencil size={19} /></IconButton>} />
      <div className="flex flex-col items-center pt-2 text-center">
        <ItemImage item={item} size={112} />
        <h1 className="mt-4 text-[22px] font-bold">{item.name}</h1>
        <p className="tabular text-2xl font-extrabold text-accent-700">{money(item.price)}</p>
        <p className="mt-1 text-xs text-muted">{categoryMeta(item.category).label}</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Card>
          <p className="flex items-center gap-1.5 text-xs text-muted"><CalendarDays size={13} /> Added</p>
          <p className="mt-1 font-bold">{fmtDate(item.addedAt)}</p>
        </Card>
        <Card>
          <p className="flex items-center gap-1.5 text-xs text-muted"><Clock size={13} /> In wishlist</p>
          <p className="mt-1 font-bold">{days === 0 ? 'Added today' : `${days} day${days === 1 ? '' : 's'}`}</p>
        </Card>
      </div>

      {(item.motivation || item.wantedFor) && (
        <>
          <SectionTitle>Why you wanted it</SectionTitle>
          <Card tone="lav">
            <p className="flex items-center gap-2 text-sm"><Sparkles size={15} className="text-accent-600" /> {item.motivation ?? 'Not noted'}</p>
            {item.wantedFor && <p className="mt-1.5 text-xs text-muted">Wanted for: {item.wantedFor.toLowerCase()} when added</p>}
          </Card>
          {days >= 7 && <p className="mt-2 text-xs text-muted">It's been {days} days. Do you still want it as much as you did then?</p>}
        </>
      )}

      <SectionTitle>Impact on your savings goal</SectionTitle>
      <Card><PurchaseImpact price={item.price} /></Card>

      <div className="mt-6 space-y-2">
        <Button full size="lg" onClick={() => setConfirm('buy')}>Buy Now</Button>
        <Button full variant="danger" onClick={() => setConfirm('remove')}><Trash2 size={16} /> Remove from Wishlist</Button>
      </div>
      <div className="mt-5"><InfoNotice>Buying won't withdraw anything from your savings goals.</InfoNotice></div>

      <AddWishlistSheet open={editing} onClose={() => setEditing(false)} item={item} />
      <ConfirmationModal
        open={confirm === 'buy'}
        title={`Buy ${item.name}?`}
        message={`We'll mark it as purchased (${money(item.price)}) and move it to your purchase history.`}
        confirmLabel="Mark as bought"
        onConfirm={buy}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmationModal
        open={confirm === 'remove'}
        tone="danger"
        title="Remove from wishlist?"
        message={`${item.name} will be removed from your wishlist.`}
        confirmLabel="Remove"
        onConfirm={remove}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
