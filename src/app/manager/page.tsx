import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Users, CalendarDays, ClipboardList, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default async function ManagerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user!.id).single()
  const orgId = profile?.organization_id

  const [{ count: clientCount }, { count: workerCount }, { count: jobCount }, { data: recentJobs }] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('role', 'worker'),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('jobs')
      .select('*, client:clients(name), worker:profiles(full_name)')
      .eq('organization_id', orgId)
      .order('scheduled_date', { ascending: true })
      .limit(5),
  ])

  const statusConfig = {
    pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
    in_progress: { label: 'Em curso', color: 'bg-blue-100 text-blue-800' },
    completed: { label: 'Concluído', color: 'bg-green-100 text-green-800' },
    cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral da sua equipa</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Clientes', value: clientCount ?? 0, icon: Building2, href: '/manager/clients', color: 'text-blue-600' },
          { label: 'Trabalhadores', value: workerCount ?? 0, icon: Users, href: '/manager/workers', color: 'text-green-600' },
          { label: 'Total de Trabalhos', value: jobCount ?? 0, icon: CalendarDays, href: '/manager/jobs', color: 'text-purple-600' },
          { label: 'Fichas hoje', value: 0, icon: ClipboardList, href: '/manager/reports', color: 'text-orange-600' },
        ].map(stat => {
          const Icon = stat.icon
          return (
            <Link key={stat.label} href={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`${stat.color} bg-gray-100 p-3 rounded-xl`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Próximos trabalhos</CardTitle>
          <Link href="/manager/jobs" className="text-sm text-blue-600 hover:underline">Ver todos</Link>
        </CardHeader>
        <CardContent>
          {recentJobs && recentJobs.length > 0 ? (
            <div className="space-y-3">
              {recentJobs.map(job => {
                const st = statusConfig[job.status as keyof typeof statusConfig]
                return (
                  <Link key={job.id} href={`/manager/jobs/${job.id}`} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-[48px]">
                        {job.scheduled_date ? (
                          <>
                            <p className="text-xs text-gray-500">{format(new Date(job.scheduled_date), 'MMM', { locale: ptBR })}</p>
                            <p className="text-lg font-bold leading-none">{format(new Date(job.scheduled_date), 'd')}</p>
                          </>
                        ) : <Clock className="h-5 w-5 text-gray-400 mx-auto" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{job.title}</p>
                        <p className="text-xs text-gray-500">
                          {(job.client as { name: string } | null)?.name ?? '—'} &middot; {(job.worker as { full_name: string } | null)?.full_name ?? 'Sem trabalhador'}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${st.color}`}>{st.label}</span>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-6">Nenhum trabalho agendado</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
