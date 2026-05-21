import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format } from 'date-fns'
import { pt as ptPT } from 'date-fns/locale'
import { Briefcase, CalendarDays, ChevronRight, MapPin, Clock, ClipboardList, CheckCircle2, AlertCircle } from 'lucide-react'

const statusConfig = {
  pending:     { label: 'Pendente',  color: 'bg-yellow-500/15 text-yellow-400' },
  in_progress: { label: 'Em curso',  color: 'bg-blue-500/15 text-blue-400' },
  completed:   { label: 'Concluído', color: 'bg-green-500/15 text-green-400' },
  cancelled:   { label: 'Cancelado', color: 'bg-red-500/15 text-red-400' },
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export default async function WorkerHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  const todayStr = new Date().toISOString().split('T')[0]
  const firstName = profile.full_name?.split(' ')[0] ?? 'Técnico'

  // Jobs for today + active jobs (in_progress)
  const { data: allJobs } = await supabase
    .from('jobs')
    .select('id, title, status, scheduled_date, scheduled_time_start, location, client:clients(name, address)')
    .in('id',
      (await supabase
        .from('job_workers')
        .select('job_id')
        .eq('worker_id', user.id)
      ).data?.map(r => r.job_id) ?? []
    )
    .in('status', ['pending', 'in_progress'])
    .order('scheduled_date', { ascending: true })

  const jobs = allJobs ?? []
  const todayJobs = jobs.filter(j => j.scheduled_date === todayStr)
  const otherActive = jobs.filter(j => j.scheduled_date !== todayStr)

  // Count fichas diárias submitted today
  const { count: fichasHoje } = await supabase
    .from('daily_reports')
    .select('id', { count: 'exact', head: true })
    .eq('worker_id', user.id)
    .eq('report_date', todayStr)

  const dateLabel = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptPT })

  return (
    <div className="p-5 md:p-8 max-w-lg space-y-6 pb-24">
      {/* Greeting */}
      <div className="pt-2">
        <p className="text-sm text-mute capitalize">{dateLabel}</p>
        <h1 className="text-2xl font-bold text-ink mt-0.5">{greeting()}, {firstName} 👋</h1>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border p-3 text-center">
          <p className="text-2xl font-bold text-ink">{todayJobs.length}</p>
          <p className="text-[11px] text-mute mt-0.5">Hoje</p>
        </div>
        <div className="bg-card rounded-xl border p-3 text-center">
          <p className="text-2xl font-bold text-ink">{jobs.length}</p>
          <p className="text-[11px] text-mute mt-0.5">Ativos</p>
        </div>
        <div className="bg-card rounded-xl border p-3 text-center">
          <p className="text-2xl font-bold text-primary">{fichasHoje ?? 0}</p>
          <p className="text-[11px] text-mute mt-0.5">Fichas hoje</p>
        </div>
      </div>

      {/* Today's jobs */}
      {todayJobs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-mute uppercase tracking-wide">Para hoje</h2>
          {todayJobs.map(job => {
            const client = (Array.isArray(job.client) ? job.client[0] : job.client) as { name: string; address: string | null } | null
            const st = statusConfig[job.status as keyof typeof statusConfig]
            return (
              <Link key={job.id} href={`/worker/jobs/${job.id}`}>
                <div className="bg-card rounded-xl border p-4 flex items-center gap-3 hover:bg-raise transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-ink truncate">{job.title}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${st.color}`}>{st.label}</span>
                    </div>
                    {client && <p className="text-xs text-mute mt-0.5">{client.name}</p>}
                    <div className="flex items-center gap-3 mt-1 text-xs text-mute">
                      {job.scheduled_time_start && (
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{job.scheduled_time_start.slice(0, 5)}</span>
                      )}
                      {(client?.address || job.location) && (
                        <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3 shrink-0" />{client?.address ?? job.location}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-mute shrink-0" />
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {todayJobs.length === 0 && (
        <div className="bg-card rounded-xl border p-6 text-center">
          <CheckCircle2 className="h-8 w-8 mx-auto text-mute mb-2 opacity-40" />
          <p className="text-sm text-mute">Sem trabalhos agendados para hoje</p>
        </div>
      )}

      {/* Other active jobs */}
      {otherActive.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-mute uppercase tracking-wide">Outros trabalhos ativos</h2>
          {otherActive.map(job => {
            const client = (Array.isArray(job.client) ? job.client[0] : job.client) as { name: string; address: string | null } | null
            const st = statusConfig[job.status as keyof typeof statusConfig]
            return (
              <Link key={job.id} href={`/worker/jobs/${job.id}`}>
                <div className="bg-card rounded-xl border p-4 flex items-center gap-3 hover:bg-raise transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-ink truncate">{job.title}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${st.color}`}>{st.label}</span>
                    </div>
                    {client && <p className="text-xs text-mute">{client.name}</p>}
                    {job.scheduled_date && (
                      <p className="text-xs text-mute mt-0.5">
                        {format(new Date(job.scheduled_date + 'T12:00:00'), 'dd MMM', { locale: ptPT })}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-mute shrink-0" />
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Quick nav */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-mute uppercase tracking-wide">Acesso rápido</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/worker/jobs">
            <div className="bg-card rounded-xl border p-4 flex flex-col items-center gap-2 hover:bg-raise transition-colors text-center">
              <Briefcase className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium text-ink">Trabalhos</span>
              <span className="text-[11px] text-mute">Ver todos</span>
            </div>
          </Link>
          <Link href="/worker/calendar">
            <div className="bg-card rounded-xl border p-4 flex flex-col items-center gap-2 hover:bg-raise transition-colors text-center">
              <CalendarDays className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium text-ink">Calendário</span>
              <span className="text-[11px] text-mute">Agenda mensal</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
