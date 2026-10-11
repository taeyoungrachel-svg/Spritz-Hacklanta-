import { cx } from './ui'

/**
 * A soft hero illustration: a rounded arch that fades into the page, a thin vertical line, and a pale orb overlapping its edge.
 * It floats gently. Use `tone` for the colour and `orb` to choose which side the orb sits on.
 */
export function ArchHero({ tone = 'peach', orb = 'left', small, className }: {
  tone?: 'peach' | 'sage' | 'butter'; orb?: 'left' | 'right'; small?: boolean; className?: string
}) {
  const w = small ? 78 : 110
  const h = small ? 124 : 190
  const orbSize = small ? 44 : 64
  return (
    <div aria-hidden="true" className={cx('relative mx-auto animate-float', className)} style={{ width: w + 70, height: h + 24 }}>
      <div
        className={cx('arch absolute left-1/2 -translate-x-1/2', tone === 'sage' && 'arch-sage', tone === 'butter' && 'arch-butter')}
        style={{ top: 16, width: w, height: h }}
      />
      <div
        className={cx('arch-orb', tone === 'sage' && 'arch-sage', tone === 'butter' && 'arch-butter')}
        style={{ width: orbSize, height: orbSize, top: small ? 8 : 6, ...(orb === 'left' ? { left: 14 } : { right: 14 }) }}
      />
    </div>
  )
}
