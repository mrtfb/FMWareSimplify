// handoff/src/components/manager/schedule-view.tsx
//
// NEW FILE — replaces the decorative month grid inside jobs-manager.tsx.
// Week × worker swim lanes. Each row is a worker; each column a day;
// jobs are positioned absolutely inside a day cell according to their
// start/end times so conflicts are visible at a glance.
//
// Mount it from:
//   • src/app/manager/schedule/page.tsx (new route — recommended), or
//   • a new TabsContent inside <JobsManager/>
//
// Drag-to-reassign is sketched but not wired — the visual structure
// makes it natural to add with @dnd-kit later.

'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { addDays, format, startOfWeek } from 'date-fns'
import { pt as ptPT } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Eyebrow, StatusDot, type JobStatus } from '@/components/shared/status'
import { WAvatar } from '@/components/shared/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { clientColor } from '@/lib/client-color'

interface JobOnSchedule {
  id: string
  code?: string | null
  title: string
  status: JobStatus
  scheduled_date: string // YYYY-MM-DD
  scheduled_time_start: string | null // HH:MM:SS
  scheduled_time_end: string | null
  duration_days?: number | null
  client_id?: string | null
  client?: { name: string } | null
  worker_ids: string[]
}

interface Worker {
  id: string
  full_name: string
}

interface ScheduleViewProps {
  workers: Worker[]
  jobs: JobOnSchedule[]
}

// Day starts at 08:00, ends at 18:00 → 10 hour cells.
const DAY_START = 8
const DAY_END = 18

function timeToFrac(t: string | null): number {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return Math.max(0, Math.min(DAY_END - DAY_START, h + m / 60 - DAY_START))
}

function jobTileStyle(job: JobOnSchedule): React.CSSProperties {
  if (job.status === 'cancelled') {
    return { backgroundColor: 'oklch(0.95 0.005 80)', borderLeftColor: 'oklch(0.7 0.005 80)' }
  }
  const c = clientColor(job.client_id)
  return { backgroundColor: c.bg, borderLeftColor: c.bar, color: c.text }
}

export function ScheduleView({ workers, jobs }: ScheduleViewProps) {
  const router = useRouter()
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(anchor, i)), [anchor])
  const todayISO = format(new Date(), 'yyyy-MM-dd')

  // Collect all unique jobs per worker that are visible in the current week.
  const byWorker = useMemo(() => {
    const weekStart = format(days[0], 'yyyy-MM-dd')
    const weekEnd   = format(days[6], 'yyyy-MM-dd')
    const map = new Map<string, JobOnSchedule[]>()
    for (const j of jobs) {
      const jStart = j.scheduled_date
      const jEnd   = format(addDays(new Date(j.scheduled_date + 'T12:00:00'), Math.max(1, j.duration_days ?? 1) - 1), 'yyyy-MM-dd')
      if (jStart > weekEnd || jEnd < weekStart) continue   // outside this week
      for (const wid of j.worker_ids) {
        const arr = map.get(wid) ?? []
        if (!arr.some(x => x.id === j.id)) arr.push(j)
        map.set(wid, arr)
      }
    }
    return map
  }, [jobs, days])

  return (
    <div className="flex h-full flex-col p-8">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>
            Semana de {format(anchor, "d 'de' MMMM", { locale: ptPT })}
          </Eyebrow>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Agenda</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-md border border-line-2">
            <button className="bg-ink px-3 py-1.5 text-xs font-medium text-background">Equipa</button>
            <button className="px-3 py-1.5 text-xs text-ink-2 hover:bg-raise" onClick={() => router.push('/manager/jobs')}>Lista</button>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="rounded-md border border-line-2 p-1.5 hover:bg-raise"
              onClick={() => setAnchor(a => addDays(a, -7))}
              aria-label="Semana anterior"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              className="rounded-md border border-line-2 px-3 py-1.5 text-xs font-medium hover:bg-raise"
              onClick={() => setAnchor(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            >
              Hoje
            </button>
            <button
              className="rounded-md border border-line-2 p-1.5 hover:bg-raise"
              onClick={() => setAnchor(a => addDays(a, 7))}
              aria-label="Próxima semana"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <Button size="sm" className="bg-amber text-amber-fg hover:bg-amber/90" onClick={() => router.push('/manager/jobs?new=1')}>
            <Plus className="mr-1 h-3.5 w-3.5" strokeWidth={2.2} />
            Novo
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
        {/* Day headers */}
        <div
          className="grid border-b border-border"
          style={{ gridTemplateColumns: '168px repeat(7, minmax(132px, 1fr))' }}
        >
          <div className="border-r border-border px-3.5 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-mute">
              Técnico
            </div>
          </div>
          {days.map((d, i) => {
            const iso = format(d, 'yyyy-MM-dd')
            const isToday = iso === todayISO
            return (
              <div
                key={iso}
                className={cn(
                  'px-3 py-2.5',
                  i < 6 && 'border-r border-border',
                  isToday && 'bg-amber-soft',
                )}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-mute">
                  {format(d, 'EEE', { locale: ptPT })}
                </div>
                <div className={cn('mt-0.5 text-[18px] font-semibold', isToday ? 'text-amber-fg' : 'text-ink')}>
                  {format(d, 'd')}
                </div>
              </div>
            )
          })}
        </div>

        {/* Hour ticks */}
        <div
          className="grid border-b border-border font-mono text-[9px] tracking-[0.05em] text-faint"
          style={{ gridTemplateColumns: '168px repeat(7, minmax(132px, 1fr))' }}
        >
          <div className="border-r border-border" />
          {days.map(d => (
            <div
              key={format(d, 'yyyy-MM-dd')}
              className="grid h-[18px] items-center border-r border-border last:border-r-0"
              style={{ gridTemplateColumns: `repeat(${DAY_END - DAY_START}, 1fr)` }}
            >
              {Array.from({ length: DAY_END - DAY_START }, (_, h) => (
                <div key={h} className={cn('pl-1', h === 0 && 'opacity-0')}>
                  {String(DAY_START + h).padStart(2, '0')}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          {workers.map((w, wi) => {
            const workerJobs = byWorker.get(w.id) ?? []
            return (
              <div
                key={w.id}
                className={cn(
                  'flex min-h-[72px]',
                  wi < workers.length - 1 && 'border-b border-border',
                )}
              >
                {/* Sticky worker label */}
                <div className="sticky left-0 z-10 flex w-[168px] shrink-0 items-center gap-2.5 border-r border-border bg-card px-3.5 py-3">
                  <WAvatar id={w.id} name={w.full_name} size={28} />
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium">{w.full_name}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.04em] text-mute">TÉCNICO</div>
                  </div>
                </div>

                {/* Day area: background grid + absolute tile overlay */}
                <div className="relative flex-1">
                  {/* Background: day column dividers + today highlight */}
                  <div className="absolute inset-0 grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {days.map((d, di) => {
                      const iso = format(d, 'yyyy-MM-dd')
                      return (
                        <div
                          key={iso}
                          className={cn(
                            'h-full',
                            di < 6 && 'border-r border-border',
                            iso === todayISO && 'bg-amber-soft',
                          )}
                        />
                      )
                    })}
                  </div>

                  {/* Tile overlay: jobs positioned as % of the 7-day width */}
                  {workerJobs.map(j => {
                    const weekStart = days[0]
                    const jStart    = new Date(j.scheduled_date + 'T12:00:00')
                    const duration  = Math.max(1, j.duration_days ?? 1)
                    const jEnd      = addDays(jStart, duration - 1)

                    // Which columns does the job touch in the current week?
                    const colStart = Math.max(0, Math.round((jStart.getTime() - weekStart.getTime()) / 86400000))
                    const colEnd   = Math.min(6, Math.round((jEnd.getTime()   - weekStart.getTime()) / 86400000))

                    // Start time only applies on the first visible day; end time on the last.
                    const startsThisWeek = colStart >= 0 && j.scheduled_date >= format(weekStart, 'yyyy-MM-dd')
                    const endsThisWeek   = colEnd <= 6

                    const timeStart = startsThisWeek ? timeToFrac(j.scheduled_time_start) : 0
                    const timeEnd   = endsThisWeek   ? timeToFrac(j.scheduled_time_end ?? j.scheduled_time_start) : DAY_END - DAY_START

                    // left% and right% as fraction of the full 7-day area
                    const leftPct  = ((colStart + timeStart / (DAY_END - DAY_START)) / 7) * 100
                    const rightPct = ((6 - colEnd + (DAY_END - DAY_START - timeEnd) / (DAY_END - DAY_START)) / 7) * 100

                    return (
                      <Link
                        key={j.id}
                        href={`/manager/jobs/${j.id}`}
                        className={cn(
                          'absolute inset-y-1.5 overflow-hidden rounded border-l-2 px-2 py-1 transition-shadow hover:shadow-md',
                          j.status === 'cancelled' && 'line-through opacity-60',
                        )}
                        style={{
                          ...jobTileStyle(j),
                          left: `${leftPct}%`,
                          right: `${rightPct}%`,
                        }}
                        title={`${j.title} · ${j.scheduled_time_start?.slice(0, 5)}–${j.scheduled_time_end?.slice(0, 5)}`}
                      >
                        <div className="truncate text-[11px] font-medium leading-tight">{j.title}</div>
                        <div className="mt-0.5 font-mono text-[9px] tracking-wide opacity-70">
                          {j.scheduled_time_start?.slice(0, 5)}–{j.scheduled_time_end?.slice(0, 5)}
                          {duration > 1 && ` · ${duration}d`}
                          {j.client?.name && ` · ${j.client.name.slice(0, 14)}`}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-ink-2">
        {(['pending', 'in_progress', 'completed', 'cancelled'] as JobStatus[]).map(s => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <StatusDot status={s} size={7} />
            {s === 'pending'
              ? 'Pendente'
              : s === 'in_progress'
                ? 'Em curso'
                : s === 'completed'
                  ? 'Concluído'
                  : 'Cancelado'}
          </span>
        ))}
        <span className="ml-auto font-mono text-[10px] tracking-[0.05em] text-mute">
          ARRASTAR PARA REAGENDAR · CLIQUE PARA EDITAR
        </span>
      </div>
    </div>
  )
}
