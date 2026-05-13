'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { MapPin, User, Users, Calendar, Clock, Camera, CheckCircle, AlertCircle, ChevronLeft, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import type { Job, DailyReport, JobReport } from '@/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import { WStatus } from '@/components/shared/status'
import { checkConflictsAction, type ConflictInfo } from '@/app/manager/jobs/actions'

interface JobDetailProps {
  job: Job & { client?: unknown }
  workers: { id: string; full_name: string }[]
  clients: { id: string; name: string }[]
  allWorkers: { id: string; full_name: string }[]
  organizationId: string
  dailyReports: (DailyReport & { worker?: { full_name: string }; media?: { public_url: string; caption: string | null }[] })[]
  jobReports: (JobReport & { worker?: { full_name: string }; media?: { public_url: string; caption: string | null }[] })[]
}

const STATUS_OPTIONS: { value: Job['status']; label: string }[] = [
  { value: 'pending',     label: 'Pendente' },
  { value: 'in_progress', label: 'Em curso' },
  { value: 'completed',   label: 'Concluído' },
  { value: 'cancelled',   label: 'Cancelado' },
]

export function JobDetail({ job, workers, clients, allWorkers, organizationId, dailyReports, jobReports }: JobDetailProps) {
  const router = useRouter()
  const supabase = createClient()

  const client = job.client as { name: string; address: string | null } | null
  const startReport = jobReports.find(r => r.report_type === 'start')
  const finishReport = jobReports.find(r => r.report_type === 'finish')

  // ── Edit state ───────────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState({
    title: job.title,
    description: job.description ?? '',
    location: job.location ?? '',
    client_id: job.client_id ?? '',
    worker_ids: workers.map(w => w.id),
    scheduled_date: job.scheduled_date ?? '',
    scheduled_time_start: job.scheduled_time_start ?? '',
    scheduled_time_end: job.scheduled_time_end ?? '',
    duration_days: job.duration_days ?? 1,
    status: job.status,
    recurrence: (job.recurrence ?? 'none') as 'none' | 'weekly' | 'monthly',
  })
  const [saving, setSaving] = useState(false)
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([])

  function toggleWorker(id: string) {
    setForm(f => ({
      ...f,
      worker_ids: f.worker_ids.includes(id)
        ? f.worker_ids.filter(w => w !== id)
        : [...f.worker_ids, id],
    }))
  }

  async function handleSave(force = false) {
    if (!force && form.worker_ids.length && form.scheduled_date && form.scheduled_time_start) {
      const found = await checkConflictsAction({
        workerIds: form.worker_ids,
        scheduledDate: form.scheduled_date,
        durationDays: form.duration_days,
        timeStart: form.scheduled_time_start,
        timeEnd: form.scheduled_time_end || form.scheduled_time_start,
        excludeJobId: job.id,
      })
      setConflicts(found)
      if (found.length) return
    }
    setConflicts([])
    setSaving(true)
    const { worker_ids, ...rest } = form
    await supabase.from('jobs').update({
      ...rest,
      client_id: rest.client_id || null,
      scheduled_date: rest.scheduled_date || null,
      scheduled_time_start: rest.scheduled_time_start || null,
      scheduled_time_end: rest.scheduled_time_end || null,
    }).eq('id', job.id)

    await supabase.from('job_workers').delete().eq('job_id', job.id)
    if (worker_ids.length > 0) {
      await supabase.from('job_workers').insert(worker_ids.map(wid => ({ job_id: job.id, worker_id: wid })))
    }
    setSaving(false)
    setEditOpen(false)
    router.refresh()
  }

  // ── Quick status change ──────────────────────────────────────────────────
  const [statusLoading, setStatusLoading] = useState(false)
  async function changeStatus(status: Job['status']) {
    setStatusLoading(true)
    await supabase.from('jobs').update({ status }).eq('id', job.id)
    setStatusLoading(false)
    router.refresh()
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  async function handleDelete() {
    setDeleting(true)
    await supabase.from('jobs').delete().eq('id', job.id)
    router.push('/manager/jobs')
  }

  const selectedWorkerNames = form.worker_ids
    .map(id => allWorkers.find(w => w.id === id)?.full_name)
    .filter(Boolean)
    .join(', ')

  return (
    <div className="p-8 space-y-6 max-w-4xl">

      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <Link href="/manager/jobs" className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm text-ink-2 hover:bg-raise hover:text-ink transition-colors">
          <ChevronLeft className="h-4 w-4" />Trabalhos
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-ink hover:bg-raise transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />Editar
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />Apagar
          </button>
        </div>
      </div>

      {/* Job header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-ink-2">
            {client && <span className="flex items-center gap-1"><User className="h-4 w-4" />{client.name}</span>}
            {workers.length > 0 && <span className="flex items-center gap-1"><Users className="h-4 w-4" />{workers.map(w => w.full_name).join(', ')}</span>}
            {job.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{job.location}</span>}
            {job.scheduled_date && <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{format(new Date(job.scheduled_date + 'T12:00:00'), 'dd MMM yyyy', { locale: ptBR })}</span>}
            {job.scheduled_time_start && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {job.scheduled_time_start.slice(0, 5)}
                {job.scheduled_time_end && `–${job.scheduled_time_end.slice(0, 5)}`}
              </span>
            )}
            {(job.duration_days ?? 1) > 1 && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />{job.duration_days} dias
              </span>
            )}
          </div>
        </div>
        <WStatus status={job.status} />
      </div>

      {/* Quick status change */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            disabled={job.status === opt.value || statusLoading}
            onClick={() => changeStatus(opt.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium border transition-colors ${
              job.status === opt.value
                ? 'border-amber bg-amber/10 text-amber-fg cursor-default'
                : 'border-border text-ink-2 hover:bg-raise hover:text-ink disabled:opacity-40'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {job.description && (
        <p className="text-sm text-ink-2 rounded-xl border border-border bg-card px-5 py-4">{job.description}</p>
      )}

      {/* Report status cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatusCard label="Ficha de Início" report={startReport} />
        <StatusCard label="Fichas Diárias" count={dailyReports.length} />
        <StatusCard label="Ficha de Fim" report={finishReport} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Fichas Diárias ({dailyReports.length})</TabsTrigger>
          <TabsTrigger value="start_finish">Início / Fim</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-4 space-y-4">
          {dailyReports.length === 0 ? (
            <p className="text-mute text-sm text-center py-8">Sem fichas diárias</p>
          ) : (
            dailyReports.map(report => <ReportCard key={report.id} report={report} type="daily" />)
          )}
        </TabsContent>

        <TabsContent value="start_finish" className="mt-4 space-y-4">
          {startReport
            ? <ReportCard report={startReport} type="job" label="Ficha de Início" />
            : <p className="text-mute text-sm">Ficha de início não preenchida</p>}
          {finishReport
            ? <ReportCard report={finishReport} type="job" label="Ficha de Fim" />
            : <p className="text-mute text-sm mt-4">Ficha de fim não preenchida</p>}
        </TabsContent>
      </Tabs>

      {/* ── Edit dialog ─────────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar trabalho</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label>Título *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Cliente</Label>
                <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v ?? '' }))}>
                  <SelectTrigger>
                    <span className="flex-1 text-left text-sm truncate">
                      {form.client_id
                        ? clients.find(c => c.id === form.client_id)?.name
                        : <span className="text-muted-foreground">Selecionar...</span>}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: (v ?? 'pending') as Job['status'] }))}>
                  <SelectTrigger>
                    <span className="flex-1 text-left text-sm">
                      {STATUS_OPTIONS.find(o => o.value === form.status)?.label}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Trabalhadores</Label>
              {selectedWorkerNames && <p className="text-xs text-ink-2 mb-1">{selectedWorkerNames}</p>}
              <div className="border border-border rounded-lg divide-y divide-border max-h-36 overflow-y-auto">
                {allWorkers.map(w => (
                  <label key={w.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-raise">
                    <input
                      type="checkbox"
                      checked={form.worker_ids.includes(w.id)}
                      onChange={() => toggleWorker(w.id)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <span className="text-sm">{w.full_name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Local</Label>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Morada do trabalho" />
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label>Data início</Label>
                <Input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Dias</Label>
                <Input type="number" min="1" value={form.duration_days} onChange={e => setForm(f => ({ ...f, duration_days: Math.max(1, parseInt(e.target.value) || 1) }))} />
              </div>
              <div className="space-y-1">
                <Label>Hora início</Label>
                <Input type="time" value={form.scheduled_time_start} onChange={e => setForm(f => ({ ...f, scheduled_time_start: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Hora fim</Label>
                <Input type="time" value={form.scheduled_time_end} onChange={e => setForm(f => ({ ...f, scheduled_time_end: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Recorrência</Label>
              <Select value={form.recurrence} onValueChange={v => setForm(f => ({ ...f, recurrence: (v ?? 'none') as typeof form.recurrence }))}>
                <SelectTrigger>
                  <span className="flex-1 text-left text-sm">
                    {form.recurrence === 'none' ? 'Sem recorrência' : form.recurrence === 'weekly' ? 'Semanal' : 'Mensal'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem recorrência</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>

            {conflicts.length > 0 && (
              <div className="rounded-lg border border-amber bg-amber-soft px-4 py-3 text-sm">
                <div className="mb-1.5 flex items-center gap-2 font-medium text-amber-fg">
                  <AlertTriangle className="h-4 w-4" />
                  Conflito de horário detectado
                </div>
                <ul className="space-y-0.5 text-[12px] text-amber-fg/80">
                  {conflicts.map((c, i) => (
                    <li key={i}>{c.workerName} já tem o trabalho "{c.jobTitle}" nessa data.</li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setConflicts([])} className="text-[12px] font-medium text-amber-fg underline underline-offset-2">Rever</button>
                  <button onClick={() => handleSave(true)} className="rounded border border-amber-fg/30 px-3 py-1 text-[12px] font-medium text-amber-fg hover:bg-amber/20">
                    Guardar mesmo assim
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => { setEditOpen(false); setConflicts([]) }}>Cancelar</Button>
              <Button onClick={() => handleSave()} disabled={saving || !form.title.trim()}>
                {saving ? 'A guardar...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm dialog ────────────────────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Apagar trabalho?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-ink-2 mt-1">
            Esta ação é permanente. Todas as fichas e registos associados serão apagados.
          </p>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
            >
              {deleting ? 'A apagar...' : 'Apagar'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatusCard({ label, report, count }: { label: string; report?: JobReport | null; count?: number }) {
  const done = report != null || (count != null && count > 0)
  return (
    <Card>
      <CardContent className="p-4 text-center">
        {done
          ? <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-1" />
          : <AlertCircle className="h-6 w-6 text-gray-300 mx-auto mb-1" />}
        <p className="text-sm font-medium">{label}</p>
        {count != null && <p className="text-2xl font-bold mt-1">{count}</p>}
        {report && <p className="text-xs text-mute mt-1">{format(new Date(report.report_date), 'dd/MM/yyyy')}</p>}
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
  const jobReport = !isDaily ? (report as JobReport) : null

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            {label ?? format(new Date(report.report_date), 'dd/MM/yyyy')}
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-mute">
            <User className="h-3.5 w-3.5" />
            {report.worker?.full_name ?? '—'}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {daily?.description && <p className="text-sm text-ink-2">{daily.description}</p>}
        {daily?.hours_worked && <p className="text-xs text-mute"><strong>Horas:</strong> {daily.hours_worked}h</p>}
        {daily?.materials_used && <p className="text-xs text-mute"><strong>Materiais:</strong> {daily.materials_used}</p>}
        {daily?.observations && <p className="text-xs text-mute"><strong>Obs:</strong> {daily.observations}</p>}

        {jobReport?.description && <p className="text-sm text-ink-2">{jobReport.description}</p>}
        {jobReport?.client_observations && <p className="text-xs text-ink-2"><strong>Obs. cliente:</strong> {jobReport.client_observations}</p>}
        {jobReport?.client_name && (
          <div className="flex items-center gap-2 text-xs">
            <span><strong>Cliente:</strong> {jobReport.client_name}</span>
            {jobReport.client_approved != null && (
              <span className={`px-1.5 py-0.5 rounded ${jobReport.client_approved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {jobReport.client_approved ? 'Aprovado' : 'Não aprovado'}
              </span>
            )}
          </div>
        )}
        {jobReport?.client_signature_url && (
          <div>
            <p className="text-xs text-mute mb-1">Assinatura:</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={jobReport.client_signature_url} alt="Assinatura" className="border rounded h-16 bg-white" />
          </div>
        )}

        {report.media && report.media.length > 0 && (
          <div>
            <p className="text-xs text-mute flex items-center gap-1 mb-1.5">
              <Camera className="h-3.5 w-3.5" />{report.media.length} foto{report.media.length !== 1 ? 's' : ''}
            </p>
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
