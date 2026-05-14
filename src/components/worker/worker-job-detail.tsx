'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronLeft, MapPin, Phone, User, Calendar, FileText, Plus, CheckCircle, AlertCircle, Users } from 'lucide-react'
import type { Job, DailyReport, JobReport } from '@/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface WorkerJobDetailProps {
  job: Job & { client?: { name: string; address: string | null; contact_name: string | null; contact_phone: string | null } | null }
  dailyReports: (DailyReport & { media?: { public_url: string }[] })[]
  jobReports: (JobReport & { media?: { public_url: string }[] })[]
  userId: string
  team: string[]
}

const statusConfig = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  in_progress: { label: 'Em curso', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Concluído', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
}

export function WorkerJobDetail({ job, dailyReports, jobReports, userId, team }: WorkerJobDetailProps) {
  const st = statusConfig[job.status]
  const client = job.client
  const startReport = jobReports.find(r => r.report_type === 'start')
  const finishReport = jobReports.find(r => r.report_type === 'finish')

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <Link href="/worker/jobs">
          <Button variant="ghost" size="sm"><ChevronLeft className="h-4 w-4 mr-1" />Trabalhos</Button>
        </Link>
      </div>

      <div>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-gray-900">{job.title}</h1>
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${st.color}`}>{st.label}</span>
        </div>
        {job.description && <p className="text-sm text-gray-600 mt-1">{job.description}</p>}
      </div>

      {client && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="font-semibold text-sm">{client.name}</p>
            {client.address && <p className="text-sm text-gray-500 flex items-center gap-1.5"><MapPin className="h-4 w-4" />{client.address}</p>}
            {client.contact_name && <p className="text-sm text-gray-500 flex items-center gap-1.5"><User className="h-4 w-4" />{client.contact_name}</p>}
            {client.contact_phone && <p className="text-sm text-gray-500 flex items-center gap-1.5"><Phone className="h-4 w-4" />{client.contact_phone}</p>}
          </CardContent>
        </Card>
      )}

      {job.scheduled_date && (
        <p className="text-sm text-gray-600 flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          {format(new Date(job.scheduled_date), 'EEEE, dd MMMM yyyy', { locale: ptBR })}
          {job.scheduled_time_start && ` – ${job.scheduled_time_start.slice(0, 5)}`}
        </p>
      )}

      {team.length > 0 && (
        <p className="text-sm text-gray-600 flex items-center gap-1.5">
          <Users className="h-4 w-4 shrink-0" />
          <span><span className="font-medium">Equipa:</span> {team.join(', ')}</span>
        </p>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-1 gap-3">
        <div className="p-4 rounded-xl border-2 flex items-center justify-between gap-3"
          style={{ borderColor: startReport ? '#22c55e' : '#e5e7eb' }}>
          <div className="flex items-center gap-3">
            {startReport
              ? <CheckCircle className="h-5 w-5 text-green-500" />
              : <AlertCircle className="h-5 w-5 text-gray-300" />}
            <div>
              <p className="font-medium text-sm">Ficha de Início</p>
              {startReport
                ? <p className="text-xs text-green-600">Preenchida em {format(new Date(startReport.report_date), 'dd/MM/yyyy')}</p>
                : <p className="text-xs text-gray-400">Preencher quando iniciar o trabalho</p>}
            </div>
          </div>
          <Link href={`/worker/jobs/${job.id}/start`}>
            <Button variant={startReport ? 'outline' : 'default'} size="sm">
              {startReport ? 'Ver' : 'Preencher'}
            </Button>
          </Link>
        </div>

        <Link href={`/worker/jobs/${job.id}/daily/new`} className="block">
          <div className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50 flex items-center justify-between gap-3 hover:bg-blue-100 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 rounded-full p-1">
                <Plus className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="font-medium text-sm">Nova Ficha Diária</p>
                <p className="text-xs text-gray-500">{dailyReports.length} ficha{dailyReports.length !== 1 ? 's' : ''} preenchida{dailyReports.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
        </Link>

        <div className="p-4 rounded-xl border-2 flex items-center justify-between gap-3"
          style={{ borderColor: finishReport ? '#22c55e' : '#e5e7eb' }}>
          <div className="flex items-center gap-3">
            {finishReport
              ? <CheckCircle className="h-5 w-5 text-green-500" />
              : <AlertCircle className="h-5 w-5 text-gray-300" />}
            <div>
              <p className="font-medium text-sm">Ficha de Fim</p>
              {finishReport
                ? <p className="text-xs text-green-600">Preenchida em {format(new Date(finishReport.report_date), 'dd/MM/yyyy')}</p>
                : <p className="text-xs text-gray-400">Preencher quando concluir o trabalho</p>}
            </div>
          </div>
          <Link href={`/worker/jobs/${job.id}/finish`}>
            <Button variant={finishReport ? 'outline' : 'default'} size="sm">
              {finishReport ? 'Ver' : 'Preencher'}
            </Button>
          </Link>
        </div>
      </div>

      {dailyReports.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Fichas preenchidas</h2>
          {dailyReports.map(report => (
            <Link key={report.id} href={`/worker/jobs/${job.id}/daily/${report.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{format(new Date(report.report_date), 'dd MMMM yyyy', { locale: ptBR })}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{report.description}</p>
                  </div>
                  <div className="text-right">
                    {report.hours_worked && <p className="text-sm font-medium">{report.hours_worked}h</p>}
                    {report.media && report.media.length > 0 && (
                      <p className="text-xs text-gray-400">{report.media.length} foto{report.media.length !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
