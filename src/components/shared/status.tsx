// handoff/src/components/shared/status.tsx
//
// Workshop primitives that replace the pastel-pill <Badge/> pattern.
// Drop this file in as src/components/shared/status.tsx.

import { cn } from '@/lib/utils'

export type JobStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'blocked'

const STATUS: Record<JobStatus, { label: string; dot: string }> = {
  pending:     { label: 'Pendente',   dot: 'bg-s-pending' },
  in_progress: { label: 'Em curso',   dot: 'bg-s-in-progress' },
  completed:   { label: 'Concluído',  dot: 'bg-s-completed' },
  cancelled:   { label: 'Cancelado',  dot: 'bg-s-cancelled' },
  blocked:     { label: 'Bloqueado',  dot: 'bg-s-blocked' },
}

/** Tiny colored dot — use everywhere status appears. */
export function StatusDot({
  status,
  size = 8,
  className,
}: {
  status: JobStatus
  size?: number
  className?: string
}) {
  const s = STATUS[status] ?? STATUS.pending
  return (
    <span
      aria-hidden
      className={cn('inline-block shrink-0 rounded-full', s.dot, className)}
      style={{ width: size, height: size }}
    />
  )
}

/** Dot + label, our replacement for pastel pills in dense lists. */
export function WStatus({
  status,
  mono = false,
  className,
}: {
  status: JobStatus
  mono?: boolean
  className?: string
}) {
  const s = STATUS[status] ?? STATUS.pending
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs text-ink-2',
        mono && 'font-mono tracking-wide',
        className,
      )}
    >
      <StatusDot status={status} />
      {s.label}
    </span>
  )
}

/** Use this only when status truly needs to read as a label (e.g. detail header). */
export function StatusChip({ status }: { status: JobStatus }) {
  const s = STATUS[status] ?? STATUS.pending
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-paper px-2.5 py-1 text-xs font-medium">
      <StatusDot status={status} />
      {s.label}
    </span>
  )
}

/** A small monospace eyebrow used above headlines and section titles. */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'font-mono text-[11px] uppercase tracking-[0.12em] text-mute',
        className,
      )}
    >
      {children}
    </div>
  )
}
