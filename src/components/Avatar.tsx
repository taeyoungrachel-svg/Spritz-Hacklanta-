/** The profile avatar: the user's initial on a soft peach glow. Used on Home and in Settings so they always match. */
export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full bg-white font-bold text-accent-600 shadow-soft select-none"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {name.trim()[0]?.toUpperCase() ?? '?'}
    </span>
  )
}
