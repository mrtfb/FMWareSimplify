'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Briefcase, MapPin, Calendar, Clock, ChevronRight } from 'lucide-react'
import type { Job } from '@/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface WorkerJobListProps {
  jobs: (Job & { client?: { name: string; address: string | null } | null })[]
}

const statusConfig = {
  pending: { label: 'Pendente', color: 'bg-yellow-500/15 text-yellow-400' },
  in_progress: { label: 'Em curso', color: 'bg-blue-500/15 text-blue-400' },
  completed: { label: 'Concluído', color: 'bg-green-500/15 text-green-400' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/15 text-red-400' },
}

export function WorkerJobList({ jobs }: WorkerJobListProps) {
  const active = jobs.filter(j => j.status === 'in_progress' || j.status === 'pending')
  const done = jobs.filter(j => j.status === 'completed')

  function renderJob(job: WorkerJobListProps['jobs'][0]) {
    const st = statusConfig[job.status]
    const client = job.client as { name: string; address: string | null } | null
    return (
      <Link key={job.id} href={`/worker/jobs/${job.id}`}>
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-ink">{job.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                </div>
                <div className="space-y-0.5 text-sm text-mute">
                  {client && <p className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" />{client.name}</p>}
                  {(client?.address || job.location) && (
                    <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{client?.address ?? job.location}</p>
                  )}
                  {job.scheduled_date && (
                    <p className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(job.scheduled_date), 'EEEE, dd MMM yyyy', { locale: ptBR })}
                      {job.scheduled_time_start && ` às ${job.scheduled_time_start.slice(0, 5)}`}
                    </p>
                  )}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-mute shrink-0 mt-1" />
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Meus Trabalhos</h1>
        <p className="text-mute text-sm mt-1">{active.length} trabalho{active.length !== 1 ? 's' : ''} ativo{active.length !== 1 ? 's' : ''}</p>
      </div>

      {active.length === 0 && done.length === 0 ? (
        <div className="text-center py-16 text-mute">
          <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>Não tem trabalhos atribuídos</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-ink-2 uppercase tracking-wide">Em andamento / Pendentes</h2>
              {active.map(renderJob)}
            </div>
          )}
          {done.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-ink-2 uppercase tracking-wide">Concluídos</h2>
              {done.map(renderJob)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
