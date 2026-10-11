import { Heart, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { PurchaseImpact } from '../components/PurchaseImpact'
import { Button, Card, Chip, ConfirmationModal, Field, MoneyInput, Note, ScreenHeader, TextInput, Toggle, cx } from '../components/ui'
import { ItemImage } from '../components/wishlist'
import { CATEGORIES, MOTIVATIONS, WANTED_FOR, guessItemIcon } from '../data/meta'
import type { CategoryId } from '../data/types'
import { money, uid } from '../lib/format'
import { useStore } from '../state/store'

export function PurchaseCheck() {
  const { back, update, toast, today, goTab } = useStore()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState<CategoryId>('shopping')
  const [imageUrl, setImageUrl] = useState('')
  const [motivation, setMotivation] = useState<string | null>(null)
  const [wantedFor, setWantedFor] = useState<string | null>(null)
  const [tried, setTried] = useState([false, false])
  const [buying, setBuying] = useState(false)
  const [keepHistory, setKeepHistory] = useState(true)

  const priceNum = Number(price)
  const errA = { name: !name.trim() ? 'Add a product name.' : undefined, price: !(priceNum > 0) ? 'Enter a price greater than $0.' : undefined }
  const errB = !motivation || !wantedFor
  const item = { name: name.trim(), category, icon: guessItemIcon(name, category), imageUrl: imageUrl.trim() || undefined }

  const next = () => {
    if (step === 0) {
      setTried([true, tried[1]])
      if (errA.name || errA.price) return
    }
    if (step === 1) {
      setTried([true, true])
      if (errB) return
    }
    setStep((s) => s + 1)
  }

  function saveToWishlist() {
    update((s) => ({
      ...s,
      wishlist: [{ id: uid('w'), ...item, price: priceNum, addedAt: today, motivation: motivation ?? undefined, wantedFor: wantedFor ?? undefined }, ...s.wishlist],
    }))
    toast(`${item.name} saved to your wishlist`)
    goTab('wishlist')
  }

  function confirmBuy() {
    if (keepHistory)
      update((s) => ({ ...s, purchases: [{ id: uid('p'), name: item.name, price: priceNum, category, date: today, source: 'purchase-check', motivation: motivation ?? undefined }, ...s.purchases] }))
    toast(keepHistory ? 'Saved to purchase history' : 'Enjoy your purchase')
    goTab('home')
  }

  return (
    <div className="flex min-h-full flex-col">
      <ScreenHeader onBack={step === 0 ? back : () => setStep((s) => s - 1)} title="Purchase check" subtitle={`Step ${step + 1} of 3`} />
      <div className="mb-5 flex gap-1.5">
        {[0, 1, 2].map((i) => <div key={i} className={cx('h-1.5 flex-1 rounded-full transition-colors duration-500', i <= step ? 'bg-accent-500' : 'bg-accent-100')} />)}
      </div>

      {step === 0 && (
        <div key="a" className="animate-screen-in space-y-5">
          <div>
            <h2 className="text-xl font-bold">What are you thinking of buying?</h2>
            <p className="text-sm text-muted">Take a moment to see how it fits your priorities.</p>
          </div>
          <Field label="Product name" error={tried[0] ? errA.name : undefined}>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Wireless Headphones" error={tried[0] && !!errA.name} maxLength={50} autoFocus />
          </Field>
          <Field label="Price" error={tried[0] ? errA.price : undefined}>
            <MoneyInput value={price} onChange={setPrice} error={tried[0] && !!errA.price} ariaLabel="Price" />
          </Field>
          <Field label="Category">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => <Chip key={c.id} selected={category === c.id} onClick={() => setCategory(c.id)}>{c.label}</Chip>)}
            </div>
          </Field>
          <Field label="Product image URL" optional>
            <TextInput value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" inputMode="url" />
          </Field>
        </div>
      )}

      {step === 1 && (
        <div key="b" className="animate-screen-in space-y-7">
          <div>
            <h2 className="text-xl font-bold">What's making you want this?</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {MOTIVATIONS.map((m) => <Chip key={m} selected={motivation === m} onClick={() => setMotivation(m)}>{m}</Chip>)}
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold">How long have you wanted it?</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {WANTED_FOR.map((m) => <Chip key={m} selected={wantedFor === m} onClick={() => setWantedFor(m)}>{m}</Chip>)}
            </div>
          </div>
          {tried[1] && errB && <p className="text-xs font-medium text-rose-500">Choose an answer for both questions.</p>}
          <Note tone="gray">There are no wrong answers. Noticing why you want something is the whole point.</Note>
        </div>
      )}

      {step === 2 && (
        <div key="c" className="animate-screen-in space-y-4">
          <Card>
            <div className="flex items-center gap-3">
              <ItemImage item={item} size={56} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{item.name}</p>
                <p className="tabular text-xl font-extrabold text-accent-700">{money(priceNum)}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-accent-50 px-2.5 py-1 text-xs font-semibold text-accent-700">{motivation}</span>
              <span className="rounded-full bg-cream px-2.5 py-1 text-xs font-semibold text-muted">{wantedFor}</span>
            </div>
          </Card>
          <Card>
            <p className="mb-3 text-xs font-semibold tracking-wide text-faint uppercase">Purchase impact</p>
            <PurchaseImpact price={priceNum} />
          </Card>
          <Note tone="gray">Buying this won't take anything out of your savings. This is just a way to see the trade-off.</Note>
        </div>
      )}

      <div className="mt-auto space-y-2 pt-8">
        {step < 2 ? (
          <Button full size="lg" onClick={next}>{step === 0 ? 'Continue' : 'See Purchase Impact'}</Button>
        ) : (
          <>
            <Button full size="lg" onClick={saveToWishlist}><Heart size={17} /> Save to Wishlist</Button>
            <Button full size="lg" variant="outline" onClick={() => setBuying(true)}><ShoppingBag size={17} /> Buy It</Button>
            <Button full variant="ghost" onClick={() => { toast('No problem, nothing was saved'); goTab('home') }}>Skip for Now</Button>
          </>
        )}
      </div>

      <ConfirmationModal
        open={buying}
        title="Go ahead with it?"
        message={
          <div>
            <p>It's your call: {item.name} for {money(priceNum)}.</p>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-cream px-3.5 py-3 text-ink">
              <span className="text-sm font-semibold">Save to purchase history</span>
              <Toggle checked={keepHistory} onChange={setKeepHistory} label="Save to purchase history" />
            </div>
          </div>
        }
        confirmLabel="Confirm"
        onConfirm={confirmBuy}
        onCancel={() => setBuying(false)}
      />
    </div>
  )
}
