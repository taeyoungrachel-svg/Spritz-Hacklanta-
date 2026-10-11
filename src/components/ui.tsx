import { ChevronLeft, Info, X, type LucideIcon } from 'lucide-react'
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export function Card({ children, className, onClick, tone = 'white', style }: {
  children: ReactNode; className?: string; onClick?: () => void; style?: React.CSSProperties; tone?: 'white' | 'lav' | 'plain' | 'glow'
}) {
  const base = tone === 'glow' ? 'glow-card shadow-soft' : tone === 'lav' ? 'bg-accent-50 border-accent-100' : tone === 'plain' ? 'bg-transparent border-line' : 'bg-paper border-line shadow-soft'
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      style={style}
      className={cx(
        'block w-full rounded-3xl border p-4 text-left',
        base,
        onClick && 'transition active:scale-[0.99] hover:border-accent-200 cursor-pointer',
        className,
      )}
    >
      {children}
    </Tag>
  )
}

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
export function Button({ variant = 'primary', size = 'md', full, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant; size?: 'sm' | 'md' | 'lg'; full?: boolean
}) {
  const v: Record<BtnVariant, string> = {
    primary: 'bg-gradient-to-b from-[#8b5cf6] to-[#6d28d9] text-white hover:from-[#9669ff] hover:to-[#7c3aed] shadow-[0_8px_20px_rgb(124_58_237/0.4)] disabled:from-accent-100 disabled:to-accent-100 disabled:text-faint disabled:shadow-none',
    secondary: 'bg-accent-100 text-accent-700 hover:bg-accent-200 disabled:opacity-50',
    outline: 'bg-paper text-ink border border-line hover:border-accent-300 disabled:opacity-50',
    ghost: 'text-accent-700 hover:bg-accent-50 disabled:opacity-50',
    danger: 'bg-rose-50 text-rose-500 hover:bg-[#e0d4ff] disabled:opacity-50',
  }
  const s = { sm: 'h-9 px-3.5 text-[13px]', md: 'h-12 px-5 text-[15px]', lg: 'h-14 px-6 text-base' }[size]
  return (
    <button
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100',
        v[variant], s, full && 'w-full', className,
      )}
    >
      {children}
    </button>
  )
}

export function IconButton({ children, label, onClick, className }: { children: ReactNode; label: string; onClick?: () => void; className?: string }) {
  return (
    <button aria-label={label} title={label} onClick={onClick} className={cx('grid size-10 place-items-center rounded-full text-ink transition hover:bg-accent-50 active:scale-95', className)}>
      {children}
    </button>
  )
}

export function ProgressBar({ value, potential = 0, color = 'var(--color-accent-500)', potentialColor, height = 10, warn, className }: {
  value: number; potential?: number; color?: string; potentialColor?: string; height?: number; warn?: boolean; className?: string
}) {
  const v = Math.max(0, Math.min(1, value))
  const p = Math.max(0, Math.min(1 - v, potential))
  return (
    <div className={cx('relative w-full overflow-hidden rounded-full bg-accent-100/70', className)} style={{ height }}>
      <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out" style={{ width: `${v * 100}%`, background: color }} />
      {p > 0 && (
        <div
          className={cx('absolute inset-y-0 rounded-r-full transition-all duration-500 ease-out', !potentialColor && (warn ? 'hatch-warn' : 'hatch'))}
          style={{ left: `${v * 100}%`, width: `${p * 100}%`, background: potentialColor }}
        />
      )}
    </div>
  )
}

export function Segmented<T extends string | number>({ options, value, onChange, className }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; className?: string
}) {
  return (
    <div className={cx('flex rounded-2xl bg-accent-100/70 p-1', className)} role="tablist">
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx(
            'h-9 flex-1 rounded-xl px-2 text-[13px] font-semibold transition',
            o.value === value ? 'bg-paper text-ink shadow-soft' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ScreenHeader({ title, onBack, right, subtitle }: { title?: string; onBack?: () => void; right?: ReactNode; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-20 -mx-5 mb-2 flex items-center gap-1 bg-[#f3f0fb]/60 px-3 pt-3 sm:-mx-6 sm:px-4 pb-2 backdrop-blur-md">
      {onBack ? (
        <IconButton label="Back" onClick={onBack}>
          <ChevronLeft size={22} />
        </IconButton>
      ) : (
        <div className="w-2" />
      )}
      <div className="min-w-0 flex-1">
        {title && <h1 className="truncate text-[20px]">{title}</h1>}
        {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
      </div>
      {right}
    </header>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mt-7 mb-3 flex items-center justify-between">
      <h2 className="text-[19px]">{children}</h2>
      {action}
    </div>
  )
}

export function LinkButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-lg px-1 text-[13px] font-semibold text-accent-600 hover:text-accent-700">
      {children}
    </button>
  )
}

function Portal({ children }: { children: ReactNode }) {
  const root = document.getElementById('overlay-root') ?? document.body
  return createPortal(children, root)
}

export function Sheet({ open, onClose, title, children, footer }: {
  open: boolean; onClose: () => void; title?: string; children: ReactNode; footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <Portal>
      <div className="pointer-events-auto absolute inset-0 z-50 flex flex-col justify-end">
        <div className="absolute inset-0 animate-fade-in bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
        <div role="dialog" aria-modal="true" aria-label={title} className="relative flex max-h-[88%] animate-sheet-in flex-col rounded-t-[28px] bg-cream shadow-lift">
          <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line" />
          <div className="flex items-center justify-between px-5 pt-2 pb-1">
            <h2 className="text-lg font-bold">{title}</h2>
            <IconButton label="Close" onClick={onClose} className="-mr-2">
              <X size={20} />
            </IconButton>
          </div>
          <div className="no-scrollbar overflow-y-auto px-5 pb-4 sm:pb-7">{children}</div>
          {footer && <div className="border-t border-line px-5 pt-3 pb-5 sm:pb-7">{footer}</div>}
        </div>
      </div>
    </Portal>
  )
}

export function ConfirmationModal({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, tone = 'primary' }: {
  open: boolean; title: string; message: ReactNode; confirmLabel?: string; cancelLabel?: string
  onConfirm: () => void; onCancel: () => void; tone?: 'primary' | 'danger'
}) {
  if (!open) return null
  return (
    <Portal>
      <div className="pointer-events-auto absolute inset-0 z-[60] grid place-items-center p-6">
        <div className="absolute inset-0 animate-fade-in bg-ink/35 backdrop-blur-[2px]" onClick={onCancel} />
        <div role="alertdialog" aria-modal="true" className="relative w-full animate-pop rounded-3xl bg-paper p-6 shadow-lift">
          <h2 className="text-lg font-bold">{title}</h2>
          <div className="mt-2 text-sm leading-relaxed text-muted">{message}</div>
          <div className="mt-6 flex gap-2">
            <Button variant="outline" full onClick={onCancel}>{cancelLabel}</Button>
            <Button variant={tone === 'danger' ? 'danger' : 'primary'} full onClick={onConfirm}>{confirmLabel}</Button>
          </div>
        </div>
      </div>
    </Portal>
  )
}

export function Field({ label, hint, error, children, optional }: { label: string; hint?: ReactNode; error?: string; children: ReactNode; optional?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-[13px] font-semibold text-ink">
        {label}
        {optional && <span className="text-xs font-medium text-faint">Optional</span>}
      </span>
      {children}
      {error ? <span className="mt-1.5 block text-xs font-medium text-rose-500">{error}</span> : hint ? <span className="mt-1.5 block text-xs text-muted">{hint}</span> : null}
    </label>
  )
}

export const inputCls = (error?: boolean) =>
  cx(
    'h-12 w-full rounded-2xl border bg-paper px-4 text-[15px] text-ink outline-none transition placeholder:text-faint focus:border-accent-400 focus:ring-4 focus:ring-accent-100',
    error ? 'border-rose-500/60' : 'border-line',
  )

export function TextInput({ error, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return <input {...rest} className={cx(inputCls(error), className)} />
}

export function MoneyInput({ value, onChange, error, placeholder = '0', autoFocus, ariaLabel }: {
  value: string; onChange: (v: string) => void; error?: boolean; placeholder?: string; autoFocus?: boolean; ariaLabel?: string
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-semibold text-muted">$</span>
      <input
        inputMode="decimal"
        aria-label={ariaLabel}
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
        className={cx(inputCls(error), 'tabular pl-8 font-semibold')}
      />
    </div>
  )
}

export function Chip({ selected, children, onClick }: { selected?: boolean; children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cx(
        'rounded-full border px-3.5 py-2 text-[13px] font-semibold transition active:scale-[0.97]',
        selected ? 'border-accent-300 bg-accent-200 text-accent-700' : 'border-line bg-paper text-ink hover:border-accent-300',
      )}
    >
      {children}
    </button>
  )
}

export function Badge({ tone = 'lav', children }: { tone?: 'lav' | 'mint' | 'peach' | 'rose' | 'gray' | 'sky' | 'butter'; children: ReactNode }) {
  const t = {
    lav: 'bg-accent-100 text-accent-700', mint: 'bg-mint-50 text-mint-500', peach: 'bg-warn-50 text-warn-500',
    rose: 'bg-rose-50 text-rose-500', gray: 'bg-[#f1f0f4] text-muted', sky: 'bg-sky-50 text-sky-500', butter: 'bg-butter-50 text-butter-500',
  }[tone]
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide whitespace-nowrap', t)}>{children}</span>
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-accent-200 bg-accent-50/50 px-6 py-8 text-center">
      <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-accent-100 text-accent-600">{icon}</div>
      <p className="font-bold">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function IconTile({ icon: Icon, color, soft, size = 44 }: { icon: LucideIcon; color: string; soft: string; size?: number }) {
  return (
    <div className="grid shrink-0 place-items-center rounded-2xl" style={{ width: size, height: size, background: soft, color }}>
      <Icon size={Math.round(size * 0.46)} strokeWidth={2} />
    </div>
  )
}

export function Stat({ label, value, sub, className }: { label: string; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="tabular mt-0.5 text-[17px] font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-accent-500' : 'bg-line')}
    >
      <span className={cx('absolute top-1 size-5 rounded-full bg-white shadow transition-all', checked ? 'left-6' : 'left-1')} />
    </button>
  )
}

export function Note({ children, tone = 'lav', icon }: { children: ReactNode; tone?: 'lav' | 'peach' | 'mint' | 'gray'; icon?: ReactNode }) {
  const t = { lav: 'bg-accent-50 text-accent-700', peach: 'bg-warn-50 text-[#4c1d95]', mint: 'bg-mint-50 text-[#4c1d95]', gray: 'bg-[#f1f0f4] text-muted' }[tone]
  return (
    <div className={cx('flex gap-2.5 rounded-2xl px-3.5 py-3 text-[13px] leading-relaxed', t)}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div>{children}</div>
    </div>
  )
}

/** A calm, recognizable informational notice: info icon, soft lavender surface, readable text. Not an error state. */
export function InfoNotice({ children }: { children: ReactNode }) {
  return (
    <div role="note" className="flex items-start gap-3 rounded-2xl border border-accent-200/70 bg-accent-50 px-4 py-3.5">
      <span className="mt-px grid size-6 shrink-0 place-items-center rounded-full bg-accent-100 text-accent-600"><Info size={14} strokeWidth={2.4} /></span>
      <p className="text-[13px] leading-relaxed font-medium text-ink/80">{children}</p>
    </div>
  )
}
