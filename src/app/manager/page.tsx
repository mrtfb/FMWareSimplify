// handoff/src/app/manager/page.tsx
//
// REPLACES src/app/manager/page.tsx — Workshop dashboard.
// Operational tiles ("what blocks me today") + today's timeline +
// attention alerts + team status, instead of generic stat tiles.

import { createClient } from '@/lib/supabase/server'
import { Eyebrow, WStatus, StatusDot, type JobStatus } from '@/components/shared/status'
import { WAvatar, WAvatarStack } from '@/components/shared/avatar'
import { Button } from '@/components/ui/button'
import { Plus, Search, Bell } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { pt as ptPT } from 'date-fns/locale'

export default async function ManagerDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, organization_id')
    .eq('id', user!.id)
    .single()
  const orgId = profile?.organization_id

  const today = new Date()
  const todayISO = format(today, 'yyyy-MM-dd')

  // Pull what the dashboard actually needs to make decisions today.
  const [
    { data: todayJobs },
    { data: inProgress },
    { data: missingFichas },
    { data: workers },
  ] = await Promise.all([
    supabase
      .from('jobs')
      .select('*, client:clients(name), workers:job_workers(worker:profiles(id, full_name))')
      .eq('organization_id', orgId)
      .eq('scheduled_date', todayISO)
      .order('scheduled_time_start', { ascending: true }),

    supabase
      .from('jobs')
      .select('id, status')
      .eq('organization_id', orgId)
      .eq('status', 'in_progress'),

    // Stub: jobs in_progress that don't have a daily report for yesterday.
    // Swap for your actual query.
    supabase
      .from('jobs')
      .select('id, title, scheduled_date, worker:profiles(full_name)')
      .eq('organization_id', orgId)
      .eq('status', 'in_progress')
      .limit(3),

    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('organization_id', orgId)
      .in('role', ['worker', 'manager'])
      .limit(6),
  ])

  type JobRow = {
    id: string
    title: string
    status: JobStatus
    location: string | null
    scheduled_time_start: string | null
    scheduled_time_end: string | null
    client: { name: string } | null
    workers: { worker: { id: string; full_name: string } | null }[]
  }

  const jobs: JobRow[] = (todayJobs ?? []) as never
  const pendingToday = jobs.filter(j => j.status === 'pending').length
  const fichasMissing = (missingFichas ?? []).length

  return (
    <div className="space-y-7 p-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>{format(today, "EEEE · d 'de' MMMM yyyy", { locale: ptPT })}</Eyebrow>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Bom dia, {profile?.full_name?.split(' ')[0] ?? 'Carlos'}.
          </h1>
          <p className="mt-1 text-sm text-ink-2">
            {jobs.length} trabalho{jobs.length === 1 ? '' : 's'} hoje ·{' '}
            {(inProgress ?? []).length} em curso agora
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Search className="mr-1.5 h-3.5 w-3.5" />
            Procurar
          </Button>
          <Link href="/manager/jobs?new=1" className="inline-flex items-center gap-1.5 rounded-md bg-amber px-3 py-1.5 text-sm font-medium text-amber-fg hover:bg-amber/90 transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Novo trabalho
          </Link>
        </div>
      </div>

      {/* Operational tiles — what NEEDS attention today */}
      <div className="grid grid-cols-4 divide-x divide-border rounded-xl border border-border bg-card">
        <OpTile
          label="A decorrer agora"
          value={(inProgress ?? []).length}
          sub="técnicos no terreno"
          status="in_progress"
        />
        <OpTile
          label="A começar até às 12:00"
          value={pendingToday}
          sub="precisa de despacho"
          status="pending"
        />
        <OpTile
          label="Fichas em falta"
          value={fichasMissing}
          sub="ontem · precisa de seguimento"
          urgent
        />
        <OpTile label="Para faturar esta semana" value="€4 250" sub="8 trabalhos concluídos" />
      </div>

      {/* Two-column: timeline + side rail */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Today timeline */}
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div>
              <Eyebrow>Hoje</Eyebrow>
              <div className="mt-0.5 text-[15px] font-semibold">Trabalhos em curso</div>
            </div>
            <Link
              href="/manager/schedule"
              className="text-xs text-ink-2 underline decoration-line-2 underline-offset-2 hover:text-ink"
            >
              Ver agenda
            </Link>
          </header>
          <div>
            {jobs.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-mute">Sem trabalhos hoje</div>
            ) : (
              jobs.map((j, i) => <TimelineRow key={j.id} job={j} last={i === jobs.length - 1} />)
            )}
          </div>
        </section>

        {/* Right rail */}
        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-5">
            <Eyebrow>Precisa de atenção</Eyebrow>
            <div className="mt-3 space-y-3">
              {(missingFichas ?? []).map(m => (
                <AlertRow
                  key={m.id}
                  title={`Sem ficha diária: ${m.title.slice(0, 38)}`}
                  sub="Notifica o técnico"
                  cta="Notificar"
                />
              ))}
              {(missingFichas ?? []).length === 0 && (
                <div className="text-sm text-mute">Tudo em dia. 👌</div>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <Eyebrow>Equipa</Eyebrow>
            <div className="mt-3 space-y-2.5">
              {(workers ?? []).map(w => (
                <div key={w.id} className="flex items-center gap-2.5">
                  <WAvatar id={w.id} name={w.full_name} size={26} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium">{w.full_name}</div>
                    <div className="flex items-center gap-1.5 truncate text-[11px] text-mute">
                      <StatusDot status="pending" size={6} />
                      Próximo às 09:00
                    </div>
                  </div>
                  <div className="font-mono text-[11px] text-mute">·</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

// ─── Atoms ──────────────────────────────────────────────────────────

function OpTile({
  label,
  value,
  sub,
  status,
  urgent,
}: {
  label: string
  value: number | string
  sub: string
  status?: JobStatus
  urgent?: boolean
}) {
  return (
    <div className="px-5 py-4">
      <div className="mb-2 flex items-center gap-1.5">
        {status ? <StatusDot status={status} size={6} /> : <span className="h-1.5 w-1.5 rounded-full bg-amber" />}
        <span className="text-[11px] text-ink-2">{label}</span>
      </div>
      <div
        data-num
        className={
          'font-mono text-3xl font-semibold leading-none tracking-tight ' +
          (urgent ? 'text-amber-fg' : 'text-ink')
        }
      >
        {value}
      </div>
      <div className="mt-1.5 text-xs text-mute">{sub}</div>
    </div>
  )
}

function TimelineRow({
  job,
  last,
}: {
  job: {
    id: string
    title: string
    status: JobStatus
    location: string | null
    scheduled_time_start: string | null
    scheduled_time_end: string | null
    client: { name: string } | null
    workers: { worker: { id: string; full_name: string } | null }[]
  }
  last: boolean
}) {
  const people = job.workers.map(jw => jw.worker).filter(Boolean) as { id: string; full_name: string }[]
  return (
    <Link
      href={`/manager/jobs/${job.id}`}
      className={
        'grid grid-cols-[64px_1fr_auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-raise ' +
        (last ? '' : 'border-b border-border')
      }
    >
      <div className="font-mono text-[13px] text-ink-2">
        <div>{job.scheduled_time_start?.slice(0, 5) ?? '—'}</div>
        <div className="text-[11px] text-faint">{job.scheduled_time_end?.slice(0, 5) ?? ''}</div>
      </div>
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-2">
          <WStatus status={job.status} />
        </div>
        <div className="truncate text-[14px] font-medium tracking-tight">{job.title}</div>
        <div className="mt-0.5 truncate text-xs text-mute">
          {job.client?.name ?? '—'} · {job.location?.split(',')[0] ?? ''}
        </div>
      </div>
      <WAvatarStack people={people.map(p => ({ id: p.id, name: p.full_name }))} size={24} />
    </Link>
  )
}

function AlertRow({ title, sub, cta }: { title: string; sub: string; cta: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium">{title}</div>
        <div className="mt-0.5 text-[11px] text-mute">{sub}</div>
      </div>
      <button className="rounded-md border border-line-2 px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-raise">
        {cta}
      </button>
    </div>
  )
}
