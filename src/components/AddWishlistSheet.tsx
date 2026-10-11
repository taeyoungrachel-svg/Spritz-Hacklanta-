import { ImagePlus, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { CATEGORIES, guessItemIcon } from '../data/meta'
import type { CategoryId, WishlistEntry } from '../data/types'
import { uid } from '../lib/format'
import { useStore } from '../state/store'
import { Button, Chip, Field, MoneyInput, Sheet, TextInput } from './ui'

/** Add a wishlist item (or edit one when `item` is given). The image is optional; without one the item shows a gray icon. */
export function AddWishlistSheet({ open, onClose, item }: { open: boolean; onClose: () => void; item?: WishlistEntry }) {
  return (
    <Sheet open={open} onClose={onClose} title={item ? 'Edit item' : 'Add to wishlist'}>
      {open && <Form onClose={onClose} item={item} />}
    </Sheet>
  )
}

/** Downscale an uploaded photo so it fits comfortably in localStorage. */
function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, 480 / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')) }
    img.src = url
  })
}

function Form({ onClose, item }: { onClose: () => void; item?: WishlistEntry }) {
  const { update, toast, today } = useStore()
  const [name, setName] = useState(item?.name ?? '')
  const [price, setPrice] = useState(item ? String(item.price) : '')
  const [category, setCategory] = useState<CategoryId>(item?.category ?? 'shopping')
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? '')
  const [imgError, setImgError] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [tried, setTried] = useState(false)

  const priceNum = Number(price)
  const errors = {
    name: !name.trim() ? 'Add a product name.' : undefined,
    price: !(priceNum > 0) ? 'Enter a price greater than $0.' : undefined,
  }

  function save() {
    setTried(true)
    if (errors.name || errors.price) return
    if (item) {
      update((s) => ({
        ...s,
        wishlist: s.wishlist.map((w) => w.id === item.id
          ? { ...w, name: name.trim(), price: priceNum, category, icon: guessItemIcon(name, category), imageUrl: imageUrl || undefined }
          : w),
      }))
      toast('Wishlist item updated')
      onClose()
      return
    }
    update((s) => ({
      ...s,
      wishlist: [
        { id: uid('w'), name: name.trim(), price: priceNum, category, icon: guessItemIcon(name, category), imageUrl: imageUrl || undefined, addedAt: today },
        ...s.wishlist,
      ],
    }))
    toast(`${name.trim()} added to your wishlist`)
    onClose()
  }

  return (
    <div className="space-y-5 pt-2">
      <Field label="Product name" error={tried ? errors.name : undefined}>
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Wireless Headphones" error={tried && !!errors.name} maxLength={50} autoFocus />
      </Field>
      <Field label="Price" error={tried ? errors.price : undefined}>
        <MoneyInput value={price} onChange={setPrice} error={tried && !!errors.price} ariaLabel="Price" />
      </Field>
      <Field label="Category">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => <Chip key={c.id} selected={category === c.id} onClick={() => setCategory(c.id)}>{c.label}</Chip>)}
        </div>
      </Field>
      <Field label="Product image" optional>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (!f) return
            try { setImageUrl(await readImage(f)); setImgError(false) } catch { setImgError(true) }
          }}
        />
        {imageUrl ? (
          <div className="flex items-center gap-3">
            <img src={imageUrl} alt="" className="size-16 rounded-2xl border border-line object-cover" />
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>Change image</Button>
            <button type="button" aria-label="Remove image" onClick={() => setImageUrl('')} className="grid size-9 place-items-center rounded-full text-muted hover:bg-accent-50"><X size={16} /></button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-accent-300 text-sm font-semibold text-accent-700 hover:bg-accent-50">
            <ImagePlus size={18} /> Add an image
          </button>
        )}
        {imgError && <p className="mt-1 text-xs text-muted">That file couldn't be read as an image.</p>}
        {!imageUrl && <p className="mt-1.5 text-xs text-muted">Without an image, your item shows a gray icon.</p>}
      </Field>
      <Button full size="lg" onClick={save}>{item ? 'Save changes' : 'Add to wishlist'}</Button>
    </div>
  )
}
