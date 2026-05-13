import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Users, CalendarDays, ClipboardList, Clock, TrendingUp, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default async function ManagerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user!.id).single()
  const orgId = profile?.organization_id

  const today = new Date().toISOString().split('T')[0]
  const firstOfMonth = today.slice(0, 7) + '-01'

  const [
    { count: clientCount },
    { count: workerCount },
    { count: jobsTodayCount },
    { count: inProgressCount },
    { data: orgJobs },
    { data: recentJobs },
    { data: jobWorkers },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('role', 'worker'),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('scheduled_date', today),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'in_progress'),
    supabase.from('jobs').select('id').eq('organization_id', orgId),
    supabase.from('jobs')
      .select('*, client:clients(name)')
      .eq('organization_id', orgId)
      .neq('status', 'completed')
      .neq('status', 'cancelled')
      .order('scheduled_date', { ascending: true })
      .limit(6),
    supabase.from('job_workers').select('job_id, worker_id, worker:profiles(full_name)'),
  ])

  const orgJobIds = orgJobs?.map(j => j.id) ?? []

  const [{ count: fichasMonthCount }, { data: hoursData }] = await Promise.all([
    orgJobIds.length > 0
      ? supabase.from('daily_reports').select('*', { count: 'exact', head: true }).in('job_id', orgJobIds).gte('report_date', firstOfMonth)
      : Promise.resolve({ count: 0, data: null, error: null }),
    orgJobIds.length > 0
      ? supabase.from('daily_reports').select('hours_worked').in('job_id', orgJobIds).gte('report_date', firstOfMonth)
      : Promise.resolve({ count: null, data: [], error: null }),
  ])

  const hoursThisMonth = (hoursData ?? []).reduce((sum, r) => sum + (r.hours_worked ?? 0), 0)

  const workersByJob: Record<string, string[]> = {}
  jobWorkers?.forEach(jw => {
    if (!workersByJob[jw.job_id]) workersByJob[jw.job_id] = []
    const name = (jw.worker as unknown as { full_name: string } | null)?.full_name
    if (name) workersByJob[jw.job_id].push(name)
  })

  const statusConfig = {
    pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
    in_progress: { label: 'Em curso', color: 'bg-blue-100 text-blue-800' },
    completed: { label: 'Concluído', color: 'bg-green-100 text-green-800' },
    cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
  }

  const stats = [
    { label: 'Clientes', value: clientCount ?? 0, icon: Building2, href: '/manager/clients', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Trabalhadores', value: workerCount ?? 0, icon: Users, href: '/manager/workers', color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Trabalhos hoje', value: jobsTodayCount ?? 0, icon: CalendarDays, href: '/manager/jobs', color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Em curso', value: inProgressCount ?? 0, icon: AlertCircle, href: '/manager/jobs', color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Fichas este mês', value: fichasMonthCount ?? 0, icon: ClipboardList, href: '/manager/reports', color: 'text-pink-600', bg: 'bg-pink-50' },
    { label: 'Horas este mês', value: `${hoursThisMonth.toFixed(0)}h`, icon: TrendingUp, href: '/manager/reports', color: 'text-teal-600', bg: 'bg-teal-50' },
  ]

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral da sua equipa</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <Link key={stat.label} href={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`${stat.color} ${stat.bg} p-3 rounded-xl shrink-0`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-gray-500 leading-tight">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Trabalhos activos</CardTitle>
          <Link href="/manager/jobs" className="text-sm text-blue-600 hover:underline">Ver todos</Link>
        </CardHeader>
        <CardContent>
          {recentJobs && recentJobs.length > 0 ? (
            <div className="space-y-2">
              {recentJobs.map(job => {
                const st = statusConfig[job.status as keyof typeof statusConfig]
                const workers = workersByJob[job.id] ?? []
                return (
                  <Link key={job.id} href={`/manager/jobs/${job.id}`} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-center min-w-[44px] shrink-0">
                        {job.scheduled_date ? (
                          <>
                            <p className="text-xs text-gray-500 capitalize">{format(new Date(job.scheduled_date + 'T12:00:00'), 'MMM', { locale: ptBR })}</p>
                            <p className="text-lg font-bold leading-none">{format(new Date(job.scheduled_date + 'T12:00:00'), 'd')}</p>
                          </>
                        ) : <Clock className="h-5 w-5 text-gray-400 mx-auto" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{job.title}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {(job.client as { name: string } | null)?.name ?? '—'}
                          {workers.length > 0 && ` · ${workers.join(', ')}`}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${st.color}`}>{st.label}</span>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-6">Nenhum trabalho activo</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
