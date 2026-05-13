// handoff/src/components/shared/avatar.tsx
//
// Workshop avatar — initials on a tinted disc, mono-style.
// Drop this in as src/components/shared/avatar.tsx.

import { cn } from '@/lib/utils'

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('')
}

// Deterministic tint hue from a string — keeps the same person the same
// color across the app without having to store anything in the DB.
function hueFromId(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h % 360
}

export function WAvatar({
  id,
  name,
  size = 28,
  className,
}: {
  id: string
  name: string
  size?: number
  className?: string
}) {
  const hue = hueFromId(id)
  const bg = `oklch(0.86 0.07 ${hue})`
  return (
    <span
      title={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border border-border font-mono font-semibold text-ink',
        className,
      )}
      style={{
        width: size,
        height: size,
        background: bg,
        fontSize: size * 0.42,
        letterSpacing: '-0.02em',
      }}
    >
      {initials(name)}
    </span>
  )
}

export function WAvatarStack({
  people,
  size = 24,
  max = 3,
}: {
  people: { id: string; name: string }[]
  size?: number
  max?: number
}) {
  const shown = people.slice(0, max)
  const rest = people.length - shown.length
  return (
    <span className="inline-flex items-center">
      {shown.map((p, i) => (
        <span
          key={p.id}
          className="relative"
          style={{ marginLeft: i === 0 ? 0 : -8, zIndex: shown.length - i }}
        >
          <WAvatar id={p.id} name={p.name} size={size} />
        </span>
      ))}
      {rest > 0 && (
        <span
          className="inline-flex items-center justify-center rounded-full border border-border bg-raise font-mono text-mute"
          style={{
            marginLeft: -8,
            width: size,
            height: size,
            fontSize: size * 0.4,
          }}
        >
          +{rest}
        </span>
      )}
    </span>
  )
}
