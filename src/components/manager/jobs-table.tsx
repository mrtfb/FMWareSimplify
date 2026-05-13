// handoff/src/components/manager/jobs-table.tsx
//
// NEW FILE — the dense, table-style jobs list with status dots and
// mono numerics. Use it in place of the card stack inside the
// existing JobsManager's TabsContent value="list".
//
//   import { JobsTable } from './jobs-table'
//   ...
//   <TabsContent value="list" className="mt-4">
//     <JobsTable jobs={jobs} workers={workers} jobWorkers={jobWorkers} />
//   </TabsContent>

'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { pt as ptPT } from 'date-fns/locale'
import { WStatus, type JobStatus } from '@/components/shared/status'
import { WAvatarStack } from '@/components/shared/avatar'
import { cn } from '@/lib/utils'

interface Job {
  id: string
  code?: string | null
  title: string
  status: JobStatus
  location: string | null
  scheduled_date: string | null
  scheduled_time_start: string | null
  scheduled_time_end: string | null
  client_id: string | null
  client?: { name: string } | null
  // optional progress (e.g. daily reports filed / expected)
  daily_filed?: number
  daily_expected?: number
}

interface JobWorkerRow {
  job_id: string
  worker_id: string
}

interface JobsTableProps {
  jobs: Job[]
  workers: { id: string; full_name: string }[]
  jobWorkers: JobWorkerRow[]
  onEdit?: (job: Job) => void
}

export function JobsTable({ jobs, workers, jobWorkers, onEdit }: JobsTableProps) {
  const workersByJob = new Map<string, { id: string; name: string }[]>()
  for (const jw of jobWorkers) {
    const w = workers.find(w => w.id === jw.worker_id)
    if (!w) continue
    const list = workersByJob.get(jw.job_id) ?? []
    list.push({ id: w.id, name: w.full_name })
    workersByJob.set(jw.job_id, list)
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Column header */}
      <div className="grid items-center gap-2 border-b border-border bg-raise px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-mute"
        style={{ gridTemplateColumns: '1.6fr 1fr 110px 110px 140px 60px' }}
      >
        <div>Trabalho</div>
        <div>Cliente</div>
        <div>Estado</div>
        <div>Data</div>
        <div>Equipa</div>
        <div />
      </div>

      {/* Rows */}
      {jobs.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-mute">Nenhum trabalho criado</div>
      ) : (
        jobs.map((j, i) => {
          const people = workersByJob.get(j.id) ?? []
          const filed = j.daily_filed ?? 0
          const expected = j.daily_expected ?? 0
          const behind =
            expected > 0 &&
            filed < expected &&
            j.status !== 'pending' &&
            j.status !== 'cancelled'
          return (
            <div
              key={j.id}
              className={cn(
                'grid items-center gap-2 px-5 py-3.5 text-[13px]',
                i < jobs.length - 1 && 'border-b border-border',
              )}
              style={{ gridTemplateColumns: '1.6fr 1fr 110px 110px 140px 60px' }}
            >
              <Link href={`/manager/jobs/${j.id}`} className="min-w-0 hover:bg-raise -mx-2 px-2 py-1 rounded-md transition-colors">
                <div
                  className={cn(
                    'truncate font-medium',
                    j.status === 'cancelled' && 'text-mute line-through',
                  )}
                >
                  {j.title}
                </div>
                {j.location && (
                  <div className="mt-0.5 truncate text-[11px] text-mute">{j.location}</div>
                )}
              </Link>

              <div className="truncate text-ink-2">{j.client?.name ?? '—'}</div>

              <div>
                <WStatus status={j.status} />
              </div>

              <div className="font-mono text-[12px] text-ink-2">
                {j.scheduled_date
                  ? format(new Date(j.scheduled_date + 'T12:00:00'), 'dd/MM', { locale: ptPT })
                  : '—'}
                {j.scheduled_time_start && (
                  <span className="text-faint"> · {j.scheduled_time_start.slice(0, 5)}</span>
                )}
              </div>

              <WAvatarStack people={people} size={22} />

              <div className="text-right">
                {onEdit && (
                  <button
                    onClick={() => onEdit(j)}
                    className="rounded px-2 py-1 text-[11px] font-medium text-mute hover:bg-raise hover:text-ink transition-colors"
                  >
                    Editar
                  </button>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
