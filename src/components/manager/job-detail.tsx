'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { MapPin, User, Calendar, Clock, FileText, Camera, CheckCircle, AlertCircle, ChevronLeft } from 'lucide-react'
import type { Job, DailyReport, JobReport } from '@/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

interface JobDetailProps {
  job: Job & { client?: unknown; worker?: unknown }
  dailyReports: (DailyReport & { worker?: { full_name: string }; media?: { public_url: string; caption: string | null }[] })[]
  jobReports: (JobReport & { worker?: { full_name: string }; media?: { public_url: string; caption: string | null }[] })[]
}

const statusConfig = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  in_progress: { label: 'Em curso', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Concluído', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
}

export function JobDetail({ job, dailyReports, jobReports }: JobDetailProps) {
  const st = statusConfig[job.status]
  const client = job.client as { name: string; address: string | null } | null
  const worker = job.worker as { full_name: string } | null
  const startReport = jobReports.find(r => r.report_type === 'start')
  const finishReport = jobReports.find(r => r.report_type === 'finish')

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/manager/jobs">
          <Button variant="ghost" size="sm"><ChevronLeft className="h-4 w-4 mr-1" />Trabalhos</Button>
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
            {client && <span className="flex items-center gap-1"><User className="h-4 w-4" />{client.name}</span>}
            {job.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{job.location}</span>}
            {job.scheduled_date && <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{format(new Date(job.scheduled_date), 'dd MMM yyyy', { locale: ptBR })}</span>}
            {job.scheduled_time_start && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{job.scheduled_time_start.slice(0, 5)}</span>}
          </div>
        </div>
        <span className={`text-sm px-3 py-1 rounded-full font-medium ${st.color}`}>{st.label}</span>
      </div>

      {job.description && (
        <Card>
          <CardContent className="p-4 text-sm text-gray-700">{job.description}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-4">
        <StatusCard label="Ficha de Início" report={startReport} type="start" />
        <StatusCard label="Fichas Diárias" count={dailyReports.length} />
        <StatusCard label="Ficha de Fim" report={finishReport} type="finish" />
      </div>

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Fichas Diárias ({dailyReports.length})</TabsTrigger>
          <TabsTrigger value="start_finish">Início / Fim</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-4 space-y-4">
          {dailyReports.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Sem fichas diárias</p>
          ) : (
            dailyReports.map(report => (
              <ReportCard key={report.id} report={report} type="daily" />
            ))
          )}
        </TabsContent>

        <TabsContent value="start_finish" className="mt-4 space-y-4">
          {startReport ? <ReportCard report={startReport} type="job" label="Ficha de Início" /> : <p className="text-gray-400 text-sm">Ficha de início não preenchida</p>}
          {finishReport ? <ReportCard report={finishReport} type="job" label="Ficha de Fim" /> : <p className="text-gray-400 text-sm mt-4">Ficha de fim não preenchida</p>}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatusCard({ label, report, type, count }: { label: string; report?: JobReport | null; type?: string; count?: number }) {
  const done = report != null || (count != null && count > 0)
  return (
    <Card>
      <CardContent className="p-4 text-center">
        {done
          ? <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-1" />
          : <AlertCircle className="h-6 w-6 text-gray-300 mx-auto mb-1" />}
        <p className="text-sm font-medium">{label}</p>
        {count != null && <p className="text-2xl font-bold mt-1">{count}</p>}
        {report && <p className="text-xs text-gray-500 mt-1">{format(new Date(report.report_date), 'dd/MM/yyyy')}</p>}
      </CardContent>
    </Card>
  )
}

function ReportCard({
  report,
  type,
  label,
}: {
  report: (DailyReport | JobReport) & { worker?: { full_name: string }; media?: { public_url: string; caption: string | null }[] }
  type: 'daily' | 'job'
  label?: string
}) {
  const isDaily = type === 'daily'
  const daily = isDaily ? (report as DailyReport) : null
  const job = !isDaily ? (report as JobReport) : null

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            {label ?? format(new Date(report.report_date), 'dd/MM/yyyy')}
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <User className="h-3.5 w-3.5" />
            {report.worker?.full_name ?? '—'}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {daily?.description && <p className="text-sm text-gray-700">{daily.description}</p>}
        {daily?.hours_worked && <p className="text-xs text-gray-500"><strong>Horas:</strong> {daily.hours_worked}h</p>}
        {daily?.materials_used && <p className="text-xs text-gray-500"><strong>Materiais:</strong> {daily.materials_used}</p>}
        {daily?.observations && <p className="text-xs text-gray-500"><strong>Obs:</strong> {daily.observations}</p>}

        {job?.description && <p className="text-sm text-gray-700">{job.description}</p>}
        {job?.client_observations && <p className="text-xs text-gray-600"><strong>Obs. cliente:</strong> {job.client_observations}</p>}
        {job?.client_name && (
          <div className="flex items-center gap-2 text-xs">
            <span><strong>Cliente:</strong> {job.client_name}</span>
            {job.client_approved != null && (
              <span className={`px-1.5 py-0.5 rounded ${job.client_approved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {job.client_approved ? 'Aprovado' : 'Não aprovado'}
              </span>
            )}
          </div>
        )}
        {job?.client_signature_url && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Assinatura:</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={job.client_signature_url} alt="Assinatura" className="border rounded h-16 bg-white" />
          </div>
        )}

        {report.media && report.media.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 flex items-center gap-1 mb-1.5"><Camera className="h-3.5 w-3.5" />{report.media.length} foto{report.media.length !== 1 ? 's' : ''}</p>
            <div className="flex gap-2 flex-wrap">
              {report.media.map((m, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={m.public_url} alt={m.caption ?? ''} className="h-20 w-20 object-cover rounded border" />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
